// Bundles the Remotion project into .remotion-bundle (run at build time; the render route uploads it to the sandbox).
import { bundle } from "@remotion/bundler";
import path from "node:path";

await bundle({ entryPoint: path.resolve("remotion/index.ts"), outDir: path.resolve(".remotion-bundle") });
console.log("Remotion bundle written to .remotion-bundle");
