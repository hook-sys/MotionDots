import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const subscribe = vi.fn();
let config: unknown = null;
vi.mock("server-only", () => ({}));
vi.mock("@fal-ai/client", () => ({ createFalClient: () => ({ subscribe }) }));
vi.mock("@/lib/settings", () => ({ getStepConfig: async () => config }));
process.env.FAL_KEY = "k";

const { runStep, StepError } = await import("@/lib/ai/fal");

describe("runStep", () => {
  it("fails with a clear error when the step has no model (no fallback)", async () => {
    config = null;
    await expect(runStep("vision", {})).rejects.toThrow("Frame check / vision: no model is set");
    expect(subscribe).not.toHaveBeenCalled();
  });
  it("runs the step's own model and sends its reasoning setting", async () => {
    config = { model: "fal-ai/x", reasoning: "high" };
    subscribe.mockResolvedValueOnce({ data: { ok: 1 } });
    await runStep("director", { prompt: "p" });
    expect(subscribe).toHaveBeenCalledWith("fal-ai/x", expect.objectContaining({ input: { prompt: "p", reasoning_effort: "high" } }));
  });
  it("does not send reasoning when none is set", async () => {
    config = { model: "fal-ai/x" };
    subscribe.mockResolvedValueOnce({ data: {} });
    await runStep("fast", { prompt: "p" });
    expect(subscribe).toHaveBeenLastCalledWith("fal-ai/x", expect.objectContaining({ input: { prompt: "p" } }));
  });
  it("turns a fal failure into a StepError naming the step and model", async () => {
    config = { model: "fal-ai/x" };
    subscribe.mockRejectedValueOnce(Object.assign(new Error("Unprocessable"), { body: { detail: [{ loc: ["body", "text"], msg: "required" }] } }));
    const err = await runStep("voice", {}).catch((e) => e);
    expect(err).toBeInstanceOf(StepError);
    expect(err.message).toContain("Voice generation: fal-ai/x failed: Unprocessable (text: required)");
  });
});

describe("single AI client", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = path.join(dir, n);
      if (["node_modules", ".next", ".remotion-bundle", "tests"].includes(n)) return [];
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
    });

  it("only lib/ai/fal.ts talks to an AI provider", () => {
    const root = path.join(import.meta.dirname, "..");
    for (const file of walk(root)) {
      const rel = path.relative(root, file).replaceAll("\\", "/");
      if (rel === "lib/ai/fal.ts") continue;
      expect(readFileSync(file, "utf8"), rel).not.toMatch(/@fal-ai\/client|openrouter|from ["']openai["']|@anthropic-ai|@google\/genai|api\.openai\.com|api\.anthropic\.com|elevenlabs\.io/i);
    }
  });
});
