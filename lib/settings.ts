import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { TEXT_STEPS } from "@/lib/steps";

// Which fal model runs each AI step, chosen only by a super admin (app_settings "ai_models").
// There are no defaults: a step with no model set fails with a clear error.
// Text steps: a fal endpoint id (it becomes part of the chat URL) plus the model name sent to it.
// Voice steps: a plain fal model id.
export const AI_MODELS_KEY = "ai_models";

const model = z.string().trim().min(1).max(200);
const endpoint = z.string().trim().regex(/^[a-z0-9][a-z0-9._\/-]{0,199}$/i, "fal endpoint id looks invalid");
const text = z.object({ endpoint: endpoint.optional(), model, reasoning: z.enum(["low", "medium", "high"]).optional() });
const media = z.object({ model });

export const aiModelsSchema = z.object({
  director: text.optional(),
  fast: text.optional(),
  vision: text.optional(),
  voice: media.optional(),
  transcription: media.optional(),
  voiceArtists: z.array(z.string().trim().min(1).max(60)).max(30),
});
export type AiModels = z.infer<typeof aiModelsSchema>;
export type TextStepConfig = NonNullable<AiModels["director"]>;

// What the admin may save: a text step with a model must also name its fal endpoint.
export const aiModelsSaveSchema = aiModelsSchema.superRefine((v, ctx) => {
  for (const step of TEXT_STEPS) {
    if (v[step] && !v[step].endpoint) ctx.addIssue({ code: "custom", path: [step, "endpoint"], message: `${step}: the fal endpoint id is required` });
  }
});

export async function getAiModels(): Promise<AiModels> {
  const { data } = await createAdminClient().from("app_settings").select("value").eq("key", AI_MODELS_KEY).maybeSingle();
  if (!data) return { voiceArtists: [] };
  const parsed = aiModelsSchema.safeParse(data.value);
  if (!parsed.success) throw new Error("Saved AI model settings are invalid. A super admin must save them again.");
  return parsed.data;
}
