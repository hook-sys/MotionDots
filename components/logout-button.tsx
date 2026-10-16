"use client";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await createBrowserSupabase().auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <button type="button" onClick={logout} className="gs-btn ghost">
      Log out
    </button>
  );
}
