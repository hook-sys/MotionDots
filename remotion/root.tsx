import { AbsoluteFill, Audio, Composition, Img } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { DIMENSIONS } from "../lib/aspect";
import { COMPOSITION_ID, type Props } from "../lib/composition";

// Foundation composition: the logo over the voiceover, in the chosen aspect ratio.
// No music. The scene system is built on top of this later.
const FPS = 30;

const Video = ({ audioUrl, logoUrl }: Props) => (
  <AbsoluteFill style={{ backgroundColor: "#0b0b0f", alignItems: "center", justifyContent: "center" }}>
    <Img src={logoUrl} style={{ maxWidth: "40%", maxHeight: "40%" }} />
    <Audio src={audioUrl} />
  </AbsoluteFill>
);

export const Root = () => (
  <Composition
    id={COMPOSITION_ID}
    component={Video}
    fps={FPS}
    width={DIMENSIONS["16:9"].width}
    height={DIMENSIONS["16:9"].height}
    durationInFrames={FPS}
    defaultProps={{ audioUrl: "", logoUrl: "", aspectRatio: "16:9" } satisfies Props}
    calculateMetadata={async ({ props }) => ({
      durationInFrames: Math.ceil((await getAudioDurationInSeconds(props.audioUrl)) * FPS),
      ...DIMENSIONS[props.aspectRatio],
    })}
  />
);
