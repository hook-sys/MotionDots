import "server-only";
import path from "node:path";
import { addBundleToSandbox, createSandbox, renderMediaOnVercel } from "@remotion/vercel";
import { COMPOSITION_ID, type Props } from "@/lib/composition";

// Renders the composition to an MP4 inside a Vercel Sandbox (Chrome + FFmpeg there, not in our function).
// Needs the bundle made by scripts/bundle-remotion.mjs. Returns the MP4 bytes.
export async function renderInSandbox(props: Props): Promise<Buffer> {
  const sandbox = await createSandbox({ timeoutInMilliseconds: 15 * 60_000 });
  try {
    await addBundleToSandbox({ sandbox, bundleDir: path.join(process.cwd(), ".remotion-bundle") });
    const { sandboxFilePath } = await renderMediaOnVercel({ sandbox, compositionId: COMPOSITION_ID, inputProps: props, codec: "h264" });
    const video = await sandbox.readFileToBuffer({ path: sandboxFilePath });
    if (!video?.length) throw new Error("Render produced no file");
    return video;
  } finally {
    await sandbox.stop();
  }
}
