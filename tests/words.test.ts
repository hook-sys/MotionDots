import { describe, expect, it } from "vitest";
import { parseElevenLabsWords, parseWhisperWords } from "@/lib/voice/words";

describe("parseElevenLabsWords", () => {
  it("reads word timestamps", () => {
    expect(parseElevenLabsWords([{ text: "Hello", start: 0, end: 0.4 }, { text: "world", start: 0.5, end: 0.9 }])).toEqual([
      { text: "Hello", start: 0, end: 0.4 },
      { text: "world", start: 0.5, end: 0.9 },
    ]);
  });
  it("reads alternative key names", () => {
    expect(parseElevenLabsWords([{ word: "Hi", start_time: 0.1, end_time: 0.4 }])).toEqual([{ text: "Hi", start: 0.1, end: 0.4 }]);
  });
  it("groups ElevenLabs character timing into words using the real character times", () => {
    const alignment = { characters: ["H", "i", " ", "y", "o", "u"], character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4, 0.5], character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6] };
    const expected = [{ text: "Hi", start: 0, end: 0.2 }, { text: "you", start: 0.3, end: 0.6 }];
    expect(parseElevenLabsWords(alignment)).toEqual(expected);
    expect(parseElevenLabsWords([{ alignment }])).toEqual(expected);
  });
  it("returns null instead of guessing", () => {
    expect(parseElevenLabsWords({ characters: ["a"], character_start_times_seconds: [0], character_end_times_seconds: [] })).toBeNull();
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
