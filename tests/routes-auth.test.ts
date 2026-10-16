import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Every API route must check auth first. The only exceptions authenticate another way.
const root = path.join(import.meta.dirname, "../app");
const routes = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? routes(p) : e.name === "route.ts" ? [p] : [];
  });

describe("route authentication", () => {
  for (const file of routes(root)) {
    const rel = path.relative(root, file).replaceAll("\\", "/");
    it(rel, () => {
      const src = readFileSync(file, "utf8");
      const checked = /require(User|SuperAdmin)\(\)/.test(src);
      const stripeSigned = rel === "api/stripe/webhook/route.ts" && src.includes("constructEvent");
      const emailLink = rel === "auth/callback/route.ts";
      expect(checked || stripeSigned || emailLink).toBe(true);
    });
  }

  it("keeps secrets out of query strings", () => {
    for (const file of routes(root)) {
      expect(readFileSync(file, "utf8")).not.toMatch(/searchParams\.get\(["'](key|api_?key|token|secret)/i);
    }
  });
});
