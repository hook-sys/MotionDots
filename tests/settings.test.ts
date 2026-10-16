import { describe, expect, it, vi } from "vitest";

let stored: unknown = null;
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: stored === null ? null : { value: stored } }) }) }) }) }),
}));

const { getAiModels, aiModelsSchema, aiModelsSaveSchema } = await import("@/lib/settings");

describe("AI model settings", () => {
  it("has no models until an admin saves them (no defaults)", async () => {
    stored = null;
    await expect(getAiModels()).resolves.toEqual({ voiceArtists: [] });
  });
  it("returns each step's own endpoint, model and reasoning", async () => {
    stored = { director: { endpoint: "ep/router", model: "a/opus", reasoning: "high" }, voice: { model: "fal-ai/v" }, voiceArtists: ["Rachel"] };
    const models = await getAiModels();
    expect(models.director).toEqual({ endpoint: "ep/router", model: "a/opus", reasoning: "high" });
    expect(models.voice).toEqual({ model: "fal-ai/v" });
    expect(models.fast).toBeUndefined();
  });
  it("still reads older settings that have no endpoint (the step then fails with a clear error)", async () => {
    stored = { fast: { model: "m" }, voice: { model: "v" }, voiceArtists: [] };
    await expect(getAiModels()).resolves.toMatchObject({ voice: { model: "v" } });
  });
  it("fails loudly on corrupt settings", async () => {
    stored = { director: { model: "" }, voiceArtists: [] };
    await expect(getAiModels()).rejects.toThrow("invalid");
  });
  it("rejects a bad reasoning level", () => {
    expect(aiModelsSchema.safeParse({ director: { model: "m", reasoning: "max" }, voiceArtists: [] }).success).toBe(false);
  });
  it("saving requires a fal endpoint for every text step that has a model", () => {
    expect(aiModelsSaveSchema.safeParse({ fast: { model: "m" }, voiceArtists: [] }).success).toBe(false);
    expect(aiModelsSaveSchema.safeParse({ fast: { endpoint: "openrouter/router", model: "m" }, voiceArtists: [] }).success).toBe(true);
  });

  const endpointOf = (endpoint: string) => aiModelsSaveSchema.safeParse({ fast: { endpoint, model: "m" }, voiceArtists: [] });

  it.each(["openrouter/router", "fal-ai/whisper", "fal-ai/elevenlabs/tts/eleven-v3", "some-owner/model.v2", "Owner/Name"])("accepts the fal id %s", (id) => {
    const r = endpointOf(id);
    expect(r.success && r.data.fast?.endpoint).toBe(id);
  });

  it.each([
    [" openrouter/router ", "openrouter/router"],
    ["openrouter/router/", "openrouter/router"],
    ["https://fal.ai/models/openrouter/router", "openrouter/router"],
    ["https://fal.run/fal-ai/elevenlabs/tts/eleven-v3/", "fal-ai/elevenlabs/tts/eleven-v3"],
  ])("cleans up %s to %s", (pasted, id) => {
    const r = endpointOf(pasted);
    expect(r.success && r.data.fast?.endpoint).toBe(id);
  });

  it.each(["router", "/openrouter/router", "a//b", "../evil", "openrouter/router?x=1", "open router/router", "https://example.com/openrouter/router"])("rejects %s", (id) => {
    const r = endpointOf(id);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("is not a fal endpoint id");
  });
});
