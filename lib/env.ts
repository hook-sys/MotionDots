import "server-only";

// A required secret/setting from the environment; fails loudly when missing.
export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}
