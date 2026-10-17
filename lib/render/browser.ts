import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { canRenderMediaOnWeb, renderMediaOnWeb } from "@remotion/web-renderer";
import { FILM_ID, Film } from "@/components/video/engine/film";
import { DIMENSIONS, type AspectRatio } from "@/lib/aspect";
import { direct } from "@/lib/video/director";
import { prepareLogo } from "@/lib/video/logo-colour";
import { type Look, withBrandColour } from "@/lib/video/look";
import { FPS } from "@/lib/video/plan";
import type { Word } from "@/lib/voice/words";

// ~2 Mbit/s keeps a two-minute video near 30 MB, under the 50 MB storage limit.
const VIDEO_BITRATE = 2_000_000;

// Whether this browser can make the video. Asked before the voice is made, so nothing is paid for in vain.
export async function assertBrowserCanRender(aspectRatio: AspectRatio): Promise<void> {
  const { width, height } = DIMENSIONS[aspectRatio];
  const check = await canRenderMediaOnWeb({ container: "mp4", videoCodec: "h264", width, height, videoBitrate: VIDEO_BITRATE });
  if (!check.canRender) {
    throw new Error(`This browser can't make the video: ${check.issues.map((i) => i.message).join(" ")} Try the latest Chrome or Edge.`);
  }
}

type Input = { audioUrl: string; logoUrl: string; words: Word[]; aspectRatio: AspectRatio; look: Look; onProgress: (progress: number) => void };

// Renders the video to an MP4 inside the user's browser (WebCodecs): nothing is rendered on our servers.
// The code director plans it from the voice's words and the look drawn for this video.
export async function renderInBrowser(input: Input): Promise<Blob> {
  await assertBrowserCanRender(input.aspectRatio);
  const { width, height } = DIMENSIONS[input.aspectRatio];
  const [seconds, logo] = await Promise.all([getAudioDurationInSeconds(input.audioUrl), prepareLogo(input.logoUrl)]);
  const look = withBrandColour(input.look, logo.colour);
  const plan = direct({ words: input.words, look, aspect: input.aspectRatio, brand: { logoUrl: logo.url }, seed: look.seed, audioSeconds: seconds });
  const props = { plan, audioUrl: input.audioUrl };
  try {
    const { getBlob } = await renderMediaOnWeb({
      composition: { id: FILM_ID, component: Film, width, height, fps: FPS, durationInFrames: plan.duration, defaultProps: props },
      inputProps: props,
      container: "mp4",
      videoCodec: "h264",
      videoBitrate: VIDEO_BITRATE,
      onProgress: (p) => input.onProgress(p.progress),
    });
    return await getBlob();
  } finally {
    URL.revokeObjectURL(logo.url);
  }
}
