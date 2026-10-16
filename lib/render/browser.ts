import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { canRenderMediaOnWeb, renderMediaOnWeb } from "@remotion/web-renderer";
import { COMPOSITION_ID, FPS, VoiceoverVideo, type Props } from "@/components/video/voiceover-video";
import { DIMENSIONS, type AspectRatio } from "@/lib/aspect";

// Whether this browser can make the video. Asked before the voice is made, so nothing is paid for in vain.
export async function assertBrowserCanRender(aspectRatio: AspectRatio): Promise<void> {
  const { width, height } = DIMENSIONS[aspectRatio];
  const check = await canRenderMediaOnWeb({ container: "mp4", videoCodec: "h264", width, height });
  if (!check.canRender) {
    throw new Error(`This browser can't make the video: ${check.issues.map((i) => i.message).join(" ")} Try the latest Chrome or Edge.`);
  }
}

// Renders the video to an MP4 inside the user's browser (WebCodecs): nothing is rendered on our servers.
export async function renderInBrowser(input: Props & { aspectRatio: AspectRatio; onProgress: (progress: number) => void }): Promise<Blob> {
  await assertBrowserCanRender(input.aspectRatio);
  const { width, height } = DIMENSIONS[input.aspectRatio];
  const props = { audioUrl: input.audioUrl, logoUrl: input.logoUrl };
  const seconds = await getAudioDurationInSeconds(props.audioUrl);
  const { getBlob } = await renderMediaOnWeb({
    composition: { id: COMPOSITION_ID, component: VoiceoverVideo, width, height, fps: FPS, durationInFrames: Math.ceil(seconds * FPS), defaultProps: props },
    inputProps: props,
    container: "mp4",
    videoCodec: "h264",
    onProgress: (p) => input.onProgress(p.progress),
  });
  return getBlob();
}
