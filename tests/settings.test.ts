import { describe, expect, it, vi } from "vitest";

let stored: unknown = null;
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: stored === null ? null : { value: stored } }) }) }) }) }),
}));

const { getAiModels } = await import("@/lib/settings");

describe("getAiModels", () => {
  it("fails when no admin has set models (no built-in fallback)", async () => {
    stored = null;
    await expect(getAiModels()).rejects.toThrow("not configured");
  });
  it("fails on incomplete settings", async () => {
    stored = { textModel: "m", voiceModel: "", voiceArtists: [] };
    await expect(getAiModels()).rejects.toThrow("not configured");
  });
  it("returns what the admin saved", async () => {
    stored = { textModel: "t", voiceModel: "v", voiceArtists: ["Rachel"] };
    await expect(getAiModels()).resolves.toEqual(stored);
  });
});
