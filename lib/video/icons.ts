import ALIASES from "./icons/aliases.json";
import ICONS from "./icons/icons.json";

// Icons: every icon is a 24×24 line icon, one compact path each (Lucide, ISC licence); older names
// resolve through aliases. A string is the stroke path; a pair is [stroke, fill] for icons with solid dots.
// Pure data, so the director (server or browser) checks names here and the renderer draws them.
type IconData = string | string[];
const DATA = ICONS as Record<string, IconData>;
const ALIAS = ALIASES as Record<string, string>;

// No pictures of people, faces, hands or animals, ever: they resolve to a neutral stand-in.
const PERSON = /^(user|users|person|contact|circle-user|square-user|book-user|file-user|shield-user|baby|accessibility|pregnant|standing)(-|$)/;
const FACE = /^(face|smile|frown|laugh|meh|angry|annoyed|skull|ghost|venetian-mask|scan-face)(-|$)/;
const BODY = /^(hand|handshake|helping-hand|grab|biceps|footprints|ear)(-|$)/;
const ANIMAL = /^(bird|cat|dog|fish|panda|rabbit|rat|snail|squirrel|turtle|worm|bug|shrimp|shell|paw-print|feather|dove|owl|duck|bee|butterfly|dragon|unicorn|ant|spider|squid|octopus|pig|cow|horse)(-|$)/;
export const livingStandIn = (name: string): string | null =>
  PERSON.test(name) ? "id-card" : FACE.test(name) ? "sparkles" : BODY.test(name) ? (name.includes("coins") ? "coins" : name === "handshake" ? "link" : "badge-check") : ANIMAL.test(name) ? "shapes" : null;

// Current name for any accepted name, else null.
export const resolveIcon = (name: unknown): string | null => {
  if (typeof name !== "string") return null;
  const key = name in DATA ? name : (ALIAS[name] ?? null);
  return key ? (livingStandIn(key) ?? key) : null;
};
// An icon's data: [stroke path, solid dots path or ""].
export const iconData = (name: unknown): [string, string] | null => {
  const key = resolveIcon(name);
  if (!key) return null;
  const d = DATA[key];
  return typeof d === "string" ? [d, ""] : [d[0], d[1] ?? ""];
};
export const iconPath = (name: unknown) => iconData(name)?.[0] ?? null;
