import { describe, expect, it } from "vitest";
import { groupPhrases } from "@/lib/video/phrases";

const w = (text: string, start: number, end: number) => ({ text, start, end });

describe("groupPhrases", () => {
  it("keeps words spoken together in one phrase", () => {
    const phrases = groupPhrases([w("Hello", 0, 0.3), w("there", 0.3, 0.6), w("friend", 0.6, 1)]);
    expect(phrases).toHaveLength(1);
    expect(phrases[0]).toMatchObject({ start: 0, end: 1 });
  });
  it("starts a new phrase after a pause", () => {
    expect(groupPhrases([w("One", 0, 0.3), w("two", 1.2, 1.5)]).map((p) => p.words.length)).toEqual([1, 1]);
  });
  it("starts a new phrase after the end of a sentence", () => {
    expect(groupPhrases([w("Stop.", 0, 0.4), w("Go", 0.45, 0.8)]).map((p) => p.words.map((x) => x.text))).toEqual([["Stop."], ["Go"]]);
  });
  it("splits a long run of words", () => {
    const words = Array.from({ length: 13 }, (_, i) => w("word", i * 0.2, i * 0.2 + 0.2));
    expect(groupPhrases(words).every((p) => p.words.length <= 6)).toBe(true);
  });
  it("returns nothing for no words", () => {
    expect(groupPhrases([])).toEqual([]);
  });
});
