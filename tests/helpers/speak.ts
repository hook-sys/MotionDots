import type { Word } from "@/lib/voice/words";

// A script as a voice would say it: word timestamps at an even pace, a pause after each sentence or comma.
export function speak(script: string): Word[] {
  const words: Word[] = [];
  let t = 0.2;
  for (const raw of script.split(/\s+/).filter(Boolean)) {
    const dur = 0.16 + Math.min(0.3, raw.replace(/[^\p{L}\p{N}]/gu, "").length * 0.03);
    words.push({ text: raw, start: Number(t.toFixed(3)), end: Number((t + dur).toFixed(3)) });
    t += dur + (/[.!?]$/.test(raw) ? 0.55 : /[,;:]$/.test(raw) ? 0.22 : 0.03);
  }
  return words;
}

export const SCRIPTS = {
  invoicing:
    "Tired of late invoices and manual spreadsheets? Meet Ledgerly, the invoicing app that sends reminders automatically. Get paid 40% faster and save five hours every week. Track every payment in one live dashboard, manage your inventory, and approve orders from your phone. Start your free trial today.",
  clinic:
    "Missed appointments cost your clinic time and money. Our booking app lets patients schedule online in seconds. Automatic reminders cut no-shows by 30 percent. See your calendar, patients and payments in one place. Book a demo today.",
  motion:
    "Are your motion videos still looking generic, boring, and failing to capture attention? The problem might not be your idea, but your motion direction. Motion Brief helps you create more engaging videos with purposeful scenes, precise animation timing, and transitions that move your story forward. Stop relying on random animations. Try it today!",
};
