import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PACKS } from "@/lib/billing/packs";
import { billingEnabled } from "@/lib/stripe";
import { RENDER_CREDITS } from "@/lib/render/cost";
import { BuyCredits } from "@/components/buy-credits";
import { RenderButton } from "@/components/render-button";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: projects }] = await Promise.all([
    supabase.from("profiles").select("credits, role").eq("id", user.id).single(),
    supabase.from("projects").select("id, status, aspect_ratio, created_at").order("created_at", { ascending: false }),
  ]);

  return (
    <main>
      <h1>MotionDots</h1>
      <p>Credits: {profile?.credits ?? 0}</p>
      <BuyCredits packs={PACKS} billingEnabled={billingEnabled()} />
      <Link href="/projects/new">New project</Link>
      {profile?.role === "super_admin" && <Link href="/admin/models">Admin: models</Link>}
      <ul>
        {projects?.map((p) => (
          <li key={p.id}>
            {p.aspect_ratio} - {p.status} {p.status !== "rendering" && <RenderButton projectId={p.id} />} ({RENDER_CREDITS} credits)
          </li>
        ))}
      </ul>
    </main>
  );
}
