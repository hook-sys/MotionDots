import { describe, expect, it } from "vitest";
import { RECIPES } from "@/lib/video/recipes";
import { drawLook, withBrandColour } from "@/lib/video/look";

describe("drawLook", () => {
  it("is the same look for the same seed and history", () => {
    expect(drawLook(1234, [])).toEqual(drawLook(1234, []));
  });
  it("is built on one of the 35 recipes", () => {
    expect(RECIPES).toHaveLength(35);
    for (const seed of [1, 2, 3, 99, 4242]) expect(RECIPES.map((r) => r.id)).toContain(drawLook(seed, []).recipe);
  });
  it("avoids the user's last five looks", () => {
    const history: ReturnType<typeof drawLook>[] = [];
    for (let i = 0; i < 12; i++) history.unshift(drawLook(1000 + i * 17, history));
    // twelve looks in a row: no recipe repeats inside any window of five
    for (let i = 0; i + 5 <= history.length; i++) {
      const ids = history.slice(i, i + 5).map((l) => l.recipe);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
  it("takes the logo's hue, or keeps its own random hue when the logo has no colour", () => {
    const look = drawLook(7, []);
    expect(withBrandColour(look, "#ff0000")).toMatchObject({ hue: 0, hueFromLogo: true });
    expect(withBrandColour(look, "#808080")).toMatchObject({ hue: look.hue, hueFromLogo: false });
    expect(withBrandColour(look, null)).toMatchObject({ hue: look.hue, hueFromLogo: false });
  });
});
