import type { Word } from "@/lib/voice/words";

// The words of a voiceover cut into short phrases for on-screen captions.
// A new phrase starts after a pause, after the end of a sentence, or when the line is full.
export type Phrase = { start: number; end: number; words: Word[] };

const PAUSE_SECONDS = 0.45;
const MAX_WORDS = 6;
const MAX_CHARS = 30;

export function groupPhrases(words: Word[]): Phrase[] {
  const phrases: Phrase[] = [];
  let current: Word[] = [];
  const close = () => {
    if (current.length) phrases.push({ start: current[0].start, end: current[current.length - 1].end, words: current });
    current = [];
  };
  words.forEach((word, i) => {
    const previous = words[i - 1];
    const chars = current.reduce((n, w) => n + w.text.length + 1, 0) + word.text.length;
    if (previous && (word.start - previous.end > PAUSE_SECONDS || /[.!?؟।]$/.test(previous.text) || current.length >= MAX_WORDS || chars > MAX_CHARS)) close();
    current.push(word);
  });
  close();
  return phrases;
}
