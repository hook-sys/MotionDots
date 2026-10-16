// Credit packs for sale. Prices live here (server-side) so a client can never set its own.
export const PACKS = [
  { id: "starter", credits: 100, cents: 1000 },
  { id: "growth", credits: 500, cents: 4500 },
  { id: "scale", credits: 2000, cents: 16000 },
] as const;

export type PackId = (typeof PACKS)[number]["id"];
export const findPack = (id: string) => PACKS.find((p) => p.id === id);
