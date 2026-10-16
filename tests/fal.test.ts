import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const subscribe = vi.fn();
let models: Record<string, unknown> = { voiceArtists: [] };
vi.mock("server-only", () => ({}));
vi.mock("@fal-ai/client", () => ({ createFalClient: () => ({ subscribe }) }));
vi.mock("@/lib/settings", () => ({ getAiModels: async () => models }));
process.env.FAL_KEY = "k";

const { runStep, runText, StepError } = await import("@/lib/ai/fal");
const ok = (content: unknown) => new Response(JSON.stringify({ choices: [{ message: { content } }] }));

afterEach(() => vi.restoreAllMocks());

describe("runStep (voice, transcription)", () => {
  it("fails with a clear error when the step has no model (no fallback)", async () => {
    models = { voiceArtists: [] };
    await expect(runStep("voice", {})).rejects.toThrow("Voice generation: no model is set");
    expect(subscribe).not.toHaveBeenCalled();
  });
  it("runs the step's own model", async () => {
    models = { transcription: { model: "fal-ai/whisper" }, voiceArtists: [] };
    subscribe.mockResolvedValueOnce({ data: { ok: 1 } });
    await runStep("transcription", { audio_url: "u" });
    expect(subscribe).toHaveBeenCalledWith("fal-ai/whisper", expect.objectContaining({ input: { audio_url: "u" } }));
  });
  it("turns a fal failure into a StepError naming the step and model", async () => {
    models = { voice: { model: "fal-ai/x" }, voiceArtists: [] };
    subscribe.mockRejectedValueOnce(Object.assign(new Error("Unprocessable"), { body: { detail: [{ loc: ["body", "text"], msg: "required" }] } }));
    const err = await runStep("voice", {}).catch((e) => e);
    expect(err).toBeInstanceOf(StepError);
    expect(err.message).toContain("Voice generation: fal-ai/x failed: Unprocessable (text: required)");
  });
});

describe("runText (director, fast, vision)", () => {
  it("fails clearly when the model or the fal endpoint is missing", async () => {
    models = { voiceArtists: [] };
    await expect(runText("director", [])).rejects.toThrow("Director / scene planning: no model is set");
    models = { director: { model: "m" }, voiceArtists: [] };
    await expect(runText("director", [])).rejects.toThrow("no fal endpoint is set");
  });
  it("calls the step's own fal endpoint with the Key auth, model name and reasoning", async () => {
    models = { fast: { endpoint: "ep/router", model: "provider/model", reasoning: "high" }, voiceArtists: [] };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok("hello"));
    await expect(runText("fast", [{ role: "user", content: "hi" }])).resolves.toBe("hello");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://fal.run/ep/router/openai/v1/chat/completions");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Key k");
    expect(JSON.parse(init!.body as string)).toEqual({ model: "provider/model", messages: [{ role: "user", content: "hi" }], reasoning: { effort: "high" } });
  });
  it("does not send reasoning when none is set", async () => {
    models = { vision: { endpoint: "ep/router", model: "provider/model" }, voiceArtists: [] };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok("x"));
    await runText("vision", []);
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).not.toHaveProperty("reasoning");
  });
  it("reports an HTTP failure with the step, endpoint, model and fal's answer", async () => {
    models = { fast: { endpoint: "ep/router", model: "provider/model" }, voiceArtists: [] };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("model not found", { status: 404 }));
    const err = await runText("fast", []).catch((e) => e);
    expect(err).toBeInstanceOf(StepError);
    expect(err.message).toContain("Fast text tasks: ep/router / provider/model failed: HTTP 404 model not found");
  });
});

describe("single AI client", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = path.join(dir, n);
      if (["node_modules", ".next", ".remotion-bundle", "tests", ".git"].includes(n)) return [];
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
    });

  it("only lib/ai/fal.ts talks to an AI provider (fal's own openrouter endpoint is reached through it)", () => {
    const root = path.join(import.meta.dirname, "..");
    for (const file of walk(root)) {
      const rel = path.relative(root, file).replaceAll("\\", "/");
      if (rel === "lib/ai/fal.ts") continue;
      expect(readFileSync(file, "utf8"), rel).not.toMatch(/@fal-ai\/client|fal\.run\/\$\{|openrouter\.ai|from ["']openai["']|@anthropic-ai|@google\/genai|api\.openai\.com|api\.anthropic\.com|elevenlabs\.io/i);
    }
  });
});
