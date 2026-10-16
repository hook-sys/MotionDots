import { describe, expect, it } from "vitest";
import { parseElevenLabsWords, parseWhisperWords } from "@/lib/voice/words";

describe("parseElevenLabsWords", () => {
  it("reads word timestamps", () => {
    expect(parseElevenLabsWords([{ text: "Hello", start: 0, end: 0.4 }, { text: "world", start: 0.5, end: 0.9 }])).toEqual([
      { text: "Hello", start: 0, end: 0.4 },
      { text: "world", start: 0.5, end: 0.9 },
    ]);
  });
  it("returns null instead of guessing", () => {
    expect(parseElevenLabsWords(undefined)).toBeNull();
    expect(parseElevenLabsWords([])).toBeNull();
    expect(parseElevenLabsWords([{ text: "a", start: 1, end: 0.5 }])).toBeNull();
    expect(parseElevenLabsWords([{ text: "a", start: 0, end: 1 }, { text: "b", start: -1, end: 1 }])).toBeNull();
    expect(parseElevenLabsWords([{ text: "b", start: 2, end: 3 }, { text: "a", start: 0, end: 1 }])).toBeNull();
  });
});

describe("parseWhisperWords", () => {
  it("reads word chunks", () => {
    expect(parseWhisperWords([{ text: " Hi", timestamp: [0, 0.3] }, { text: "there", timestamp: [0.3, 0.8] }])).toEqual([
      { text: "Hi", start: 0, end: 0.3 },
      { text: "there", start: 0.3, end: 0.8 },
    ]);
  });
  it("returns null for chunks without both times", () => {
    expect(parseWhisperWords([{ text: "Hi", timestamp: [0, null] }])).toBeNull();
    expect(parseWhisperWords(undefined)).toBeNull();
  });
});
