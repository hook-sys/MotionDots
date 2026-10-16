// The AI steps a super admin picks a fal model for. Shared by the server and the admin form.
export const LLM_STEPS = ["director", "fast", "vision"] as const;
export const STEPS = [...LLM_STEPS, "voice", "transcription"] as const;
export type Step = (typeof STEPS)[number];

export const STEP_LABELS: Record<Step, string> = {
  director: "Director / scene planning",
  fast: "Fast text tasks",
  vision: "Frame check / vision",
  voice: "Voice generation",
  transcription: "Transcription for uploaded voice",
};
