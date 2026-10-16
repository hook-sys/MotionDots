import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Public by nature: the email-confirmation link lands here and is exchanged for a session.
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  if (code) {
    const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  }
  return NextResponse.redirect(`${origin}/login`);
}
