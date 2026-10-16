// The AI steps a super admin picks a model for. Shared by the server and the admin form.
// Text steps run through a fal chat endpoint (endpoint id + model name); voice steps are plain fal model ids.
export const TEXT_STEPS = ["director", "fast", "vision"] as const;
export const MEDIA_STEPS = ["voice", "transcription"] as const;
export const STEPS = [...TEXT_STEPS, ...MEDIA_STEPS] as const;
export type TextStep = (typeof TEXT_STEPS)[number];
export type MediaStep = (typeof MEDIA_STEPS)[number];
export type Step = (typeof STEPS)[number];

export const STEP_LABELS: Record<Step, string> = {
  director: "Director / scene planning",
  fast: "Fast text tasks",
  vision: "Frame check / vision",
  voice: "Voice generation",
  transcription: "Transcription for uploaded voice",
};
