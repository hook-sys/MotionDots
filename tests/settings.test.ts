import { describe, expect, it, vi } from "vitest";

let stored: unknown = null;
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: stored === null ? null : { value: stored } }) }) }) }) }),
}));

const { getAiModels, getStepConfig, aiModelsSchema } = await import("@/lib/settings");

describe("AI model settings", () => {
  it("has no models until an admin saves them (no defaults)", async () => {
    stored = null;
    await expect(getStepConfig("director")).resolves.toBeNull();
    await expect(getAiModels()).resolves.toEqual({ voiceArtists: [] });
  });
  it("returns each step's own model and reasoning", async () => {
    stored = { director: { model: "a/opus", reasoning: "high" }, fast: { model: "b/flash" }, voiceArtists: ["Rachel"] };
    await expect(getStepConfig("director")).resolves.toEqual({ model: "a/opus", reasoning: "high" });
    await expect(getStepConfig("fast")).resolves.toEqual({ model: "b/flash" });
    await expect(getStepConfig("voice")).resolves.toBeNull();
  });
  it("fails loudly on corrupt settings", async () => {
    stored = { director: { model: "" }, voiceArtists: [] };
    await expect(getAiModels()).rejects.toThrow("invalid");
  });
  it("rejects a bad reasoning level", () => {
    expect(aiModelsSchema.safeParse({ director: { model: "m", reasoning: "max" }, voiceArtists: [] }).success).toBe(false);
  });
});
