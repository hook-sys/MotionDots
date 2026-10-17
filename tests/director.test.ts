import { describe, expect, it } from "vitest";
import { ASPECT_RATIOS } from "@/lib/aspect";
import { direct } from "@/lib/video/director";
import { violations } from "@/lib/video/director/rules";
import { ENERGIES } from "@/lib/video/energy";
import { drawLook } from "@/lib/video/look";
import { SCRIPTS, speak } from "./helpers/speak";

const SEEDS = [11, 77, 2024, 31337];
const brand = { logoUrl: "https://example.test/logo.png" };

describe("the code director keeps the v2 rules", () => {
  for (const [name, script] of Object.entries(SCRIPTS)) {
    const words = speak(script);
    for (const seed of SEEDS) {
      for (const aspect of ASPECT_RATIOS) {
        for (const energy of ENERGIES) {
          it(`${name} · seed ${seed} · ${aspect} · ${energy}`, () => {
            const look = { ...drawLook(seed, []), energy };
            expect(violations(direct({ words, look, aspect, brand, seed }), words)).toEqual([]);
          });
        }
      }
    }
  }

  it("is deterministic for a seed, and different seeds make different films", () => {
    const words = speak(SCRIPTS.invoicing);
    const make = (seed: number) => direct({ words, look: drawLook(seed, []), aspect: "16:9", brand, seed });
    const shape = (seed: number) => JSON.stringify(make(seed).scenes.map((s) => [s.template, s.camera, s.enter]));
    expect(make(11)).toEqual(make(11));
    expect(shape(11)).not.toBe(shape(77));
  });

  it("shows only spoken numbers: a script with none shows none", () => {
    const words = speak("Our app keeps your clinic organised. Patients book online in seconds. Book a demo today.");
    const plan = direct({ words, look: drawLook(3, []), aspect: "16:9", brand, seed: 3 });
    const text = JSON.stringify(plan.scenes.map((s) => (s.piece?.kind === "chart" ? { ...s.piece, values: [] } : s.piece)));
    expect(text).not.toMatch(/\d/);
  });

  it("runs as long as the voice", () => {
    const words = speak(SCRIPTS.clinic);
    const plan = direct({ words, look: drawLook(5, []), aspect: "16:9", brand, seed: 5, audioSeconds: 40 });
    expect(plan.duration).toBe(1200);
    expect(plan.scenes[plan.scenes.length - 1].to).toBe(1200);
  });
});
