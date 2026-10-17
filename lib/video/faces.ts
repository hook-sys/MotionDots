// The type faces a video can be set in (public/fonts/library, OFL / Apache licences).
// `w`: average glyph width in em at weight 700; `fixed`: one weight only; `upper`: set in capitals.
export type Face = { slug: string; family: string; file: string; w: number; fixed?: number; upper?: boolean };
const face = (slug: string, w: number, opts: Partial<Face> = {}): Face => ({ slug, family: `MD-${slug}`, file: `${slug}-latin-wght-normal.woff2`, w, ...opts });

export const DISPLAY_FACES: Face[] = [
  face("inter", 0.56, { file: "" }),
  face("sora", 0.6),
  face("manrope", 0.56),
  face("plus-jakarta-sans", 0.57),
  face("space-grotesk", 0.56),
  face("bricolage-grotesque", 0.55),
  face("syne", 0.62),
  face("unbounded", 0.72),
  face("outfit", 0.52),
  face("urbanist", 0.52),
  face("dm-sans", 0.55),
  face("geist", 0.56),
  face("mona-sans", 0.57),
  face("instrument-sans", 0.54),
  face("schibsted-grotesk", 0.55),
  face("red-hat-display", 0.54),
  face("epilogue", 0.58),
  face("archivo", 0.56),
  face("lexend", 0.6),
  face("onest", 0.56),
  face("figtree", 0.55),
  face("hanken-grotesk", 0.54),
  face("albert-sans", 0.55),
  face("montserrat", 0.64),
  face("oswald", 0.42, { upper: true }),
  face("big-shoulders-display", 0.4, { upper: true }),
  face("bebas-neue", 0.4, { file: "bebas-neue-latin-400-normal.woff2", fixed: 400, upper: true }),
  face("anton", 0.46, { file: "anton-latin-400-normal.woff2", fixed: 400, upper: true }),
  face("archivo-black", 0.66, { file: "archivo-black-latin-400-normal.woff2", fixed: 400 }),
  face("dela-gothic-one", 0.72, { file: "dela-gothic-one-latin-400-normal.woff2", fixed: 400 }),
  face("krona-one", 0.74, { file: "krona-one-latin-400-normal.woff2", fixed: 400 }),
  face("fraunces", 0.56),
  face("playfair-display", 0.55),
  face("instrument-serif", 0.44, { file: "instrument-serif-latin-400-normal.woff2", fixed: 400 }),
  face("dm-serif-display", 0.5, { file: "dm-serif-display-latin-400-normal.woff2", fixed: 400 }),
  face("young-serif", 0.56, { file: "young-serif-latin-400-normal.woff2", fixed: 400 }),
  face("newsreader", 0.5),
];
// the quieter faces for cards and labels
const TEXT_SLUGS = ["inter", "dm-sans", "manrope", "figtree", "geist", "onest", "plus-jakarta-sans", "hanken-grotesk", "instrument-sans", "albert-sans", "outfit"];
export const TEXT_FACES: Face[] = TEXT_SLUGS.map((s) => DISPLAY_FACES.find((f) => f.slug === s)!);

export const faceOf = (slug: string, list = DISPLAY_FACES) => list.find((f) => f.slug === slug) ?? list[0];
export const fontUrl = (f: Face) => (f.slug === "inter" ? "/fonts/inter-latin-wght.woff2" : `/fonts/library/${f.slug}/${f.file}`);
export const familyOf = (f: Face) => `"${f.family}", system-ui, sans-serif`;
