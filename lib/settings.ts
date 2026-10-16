import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Step } from "@/lib/steps";

// Which fal model runs each AI step, chosen only by a super admin (app_settings "ai_models").
// There are no defaults: a step with no model set fails with a clear error.
export const AI_MODELS_KEY = "ai_models";

const model = z.string().trim().min(1).max(200);
const llm = z.object({ model, reasoning: z.enum(["low", "medium", "high"]).optional() });
const plain = z.object({ model });

export const aiModelsSchema = z.object({
  director: llm.optional(),
  fast: llm.optional(),
  vision: llm.optional(),
  voice: plain.optional(),
  transcription: plain.optional(),
  voiceArtists: z.array(z.string().trim().min(1).max(60)).max(30),
});
export type AiModels = z.infer<typeof aiModelsSchema>;
export type StepConfig = { model: string; reasoning?: "low" | "medium" | "high" };

export async function getAiModels(): Promise<AiModels> {
  const { data } = await createAdminClient().from("app_settings").select("value").eq("key", AI_MODELS_KEY).maybeSingle();
  if (!data) return { voiceArtists: [] };
  const parsed = aiModelsSchema.safeParse(data.value);
  if (!parsed.success) throw new Error("Saved AI model settings are invalid. A super admin must save them again.");
  return parsed.data;
}

// null when no model is set for the step.
export async function getStepConfig(step: Step): Promise<StepConfig | null> {
  return (await getAiModels())[step] ?? null;
}
