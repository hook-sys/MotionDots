import { requireSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_MODELS_KEY, aiModelsSchema } from "@/lib/settings";

export async function GET() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;
  const { data } = await createAdminClient().from("app_settings").select("value").eq("key", AI_MODELS_KEY).maybeSingle();
  return Response.json({ models: data?.value ?? null });
}

export async function PUT(req: Request) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;
  const parsed = aiModelsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid models" }, { status: 400 });
  const { error } = await createAdminClient()
    .from("app_settings")
    .upsert({ key: AI_MODELS_KEY, value: parsed.data, updated_at: new Date().toISOString(), updated_by: auth.user.id });
  if (error) throw new Error(error.message);
  return Response.json({ models: parsed.data });
}
