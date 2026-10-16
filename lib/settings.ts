import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// The AI models and voice artists, chosen only by a super admin (app_settings "ai_models").
// There are no defaults: until an admin saves them, anything that needs them fails.
export const AI_MODELS_KEY = "ai_models";

export const aiModelsSchema = z.object({
  textModel: z.string().trim().min(1).max(200),
  voiceModel: z.string().trim().min(1).max(200),
  voiceArtists: z.array(z.string().trim().min(1).max(60)).min(1).max(30),
});
export type AiModels = z.infer<typeof aiModelsSchema>;

export async function getAiModels(): Promise<AiModels> {
  const { data } = await createAdminClient().from("app_settings").select("value").eq("key", AI_MODELS_KEY).maybeSingle();
  const parsed = aiModelsSchema.safeParse(data?.value);
  if (!parsed.success) throw new Error("AI models are not configured. A super admin must set them.");
  return parsed.data;
}
