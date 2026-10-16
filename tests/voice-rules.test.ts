import { describe, expect, it } from "vitest";
import { AUDIO_TYPES, MAX_AUDIO_BYTES, checkFile, voiceCredits } from "@/lib/voice/rules";

describe("voiceCredits", () => {
  it("charges 1 credit per 100 characters, at least 1", () => {
    expect(voiceCredits("hi")).toBe(1);
    expect(voiceCredits("a".repeat(100))).toBe(1);
    expect(voiceCredits("a".repeat(101))).toBe(2);
  });
});

describe("checkFile", () => {
  it("accepts allowed audio", () => {
    expect(checkFile(new File(["x"], "a.mp3", { type: "audio/mpeg" }), AUDIO_TYPES, MAX_AUDIO_BYTES)).toEqual({ ext: "mp3" });
  });
  it("rejects wrong types, empty and oversized files", () => {
    expect(checkFile(new File(["x"], "a.exe", { type: "application/x-msdownload" }), AUDIO_TYPES, MAX_AUDIO_BYTES)).toHaveProperty("error");
    expect(checkFile(new File([], "a.mp3", { type: "audio/mpeg" }), AUDIO_TYPES, MAX_AUDIO_BYTES)).toHaveProperty("error");
    expect(checkFile(new File(["xx"], "a.mp3", { type: "audio/mpeg" }), AUDIO_TYPES, 1)).toHaveProperty("error");
  });
});
