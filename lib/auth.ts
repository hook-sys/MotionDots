import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Auth = { user: User; supabase: SupabaseClient } | { error: Response };

// The check every API route starts with. Returns the user, or a 401/403 Response to return as is.
export async function requireUser(): Promise<Auth> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: "Sign in required" }, { status: 401 }) };
  return { user, supabase };
}

export async function requireSuperAdmin(): Promise<Auth> {
  const auth = await requireUser();
  if ("error" in auth) return auth;
  const { data } = await createAdminClient().from("profiles").select("role").eq("id", auth.user.id).single();
  if (data?.role !== "super_admin") return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  return auth;
}
