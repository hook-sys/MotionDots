import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Supabase with the service role (bypasses RLS). Server code only, after an auth check.
export function createAdminClient() {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}
