import "server-only";
import path from "node:path";
import { Sandbox } from "@vercel/sandbox";
import { addBundleToSandbox, createSandbox, getRenderProgress, renderMediaOnVercel } from "@remotion/vercel";
import { env } from "@/lib/env";
import { COMPOSITION_ID, type Props } from "@/lib/composition";

// Vercel Sandbox rendering (Chrome + FFmpeg run there, not in our function).
// The render runs detached: startRender returns as soon as it is going, and checkRender asks how it is doing.
// The finished MP4 is uploaded by the sandbox to Vercel Blob (public URL with an unguessable path);
// the poller copies it to private storage and deletes the blob.
// Needs the bundle made by scripts/bundle-remotion.mjs.
export async function startRender(props: Props): Promise<{ sandboxId: string; cmdId: string }> {
  const sandbox = await createSandbox();
  await addBundleToSandbox({ sandbox, bundleDir: path.join(process.cwd(), ".remotion-bundle") });
  const { sandboxId, cmdId } = await renderMediaOnVercel({
    sandbox,
    compositionId: COMPOSITION_ID,
    inputProps: props,
    codec: "h264",
    detached: true,
    vercelBlob: { blobToken: env("BLOB_READ_WRITE_TOKEN"), access: "public", blobPath: `renders/${crypto.randomUUID()}.mp4` },
  });
  return { sandboxId, cmdId };
}

export type RenderState = { state: "running"; progress: number } | { state: "done"; url: string } | { state: "failed"; error: string };

export async function checkRender(sandboxId: string, cmdId: string): Promise<RenderState> {
  const p = await getRenderProgress({ sandboxId, cmdId });
  if (p.stage === "done") return { state: "done", url: p.url };
  if (p.stage === "error") return { state: "failed", error: `Render failed: ${p.message}` };
  if (p.stage === "expired") return { state: "failed", error: "Render failed: the sandbox stopped before it finished" };
  return { state: "running", progress: Math.min(0.99, p.overallProgress ?? 0) };
}

export async function stopSandbox(sandboxId: string): Promise<void> {
  await (await Sandbox.get({ sandboxId })).stop();
}
