"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const supabase = createBrowserSupabase();
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    if (error) return setMessage(error.message);
    if (mode === "signup") return setMessage("Check your email to confirm your account.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <h1>MotionDots</h1>
      <h2>{mode === "signin" ? "Sign in" : "Create account"}</h2>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" minLength={8} required />
      <button type="submit">{mode === "signin" ? "Sign in" : "Sign up"}</button>
      <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "Need an account?" : "Have an account?"}
      </button>
      {message && <p className="error">{message}</p>}
    </form>
  );
}
