import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The signed-in user and their profile, for the pages in the app shell. Sends visitors to /login.
export async function getSiteUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("credits, role").eq("id", user.id).single();
  return {
    supabase,
    user,
    email: user.email ?? "",
    initial: (user.email ?? "?")[0],
    credits: profile?.credits ?? 0,
    admin: profile?.role === "super_admin",
  };
}
