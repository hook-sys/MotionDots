import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PACKS } from "@/lib/billing/packs";
import { BuyCredits } from "@/components/buy-credits";

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
      <h1>Credits: {profile?.credits ?? 0}</h1>
      <BuyCredits packs={PACKS} />
      <Link href="/projects/new">New project</Link>
      {profile?.role === "super_admin" && <Link href="/admin/models">Admin: models</Link>}
      <ul>
        {projects?.map((p) => (
          <li key={p.id}>
            {p.aspect_ratio} - {p.status}
          </li>
        ))}
      </ul>
    </main>
  );
}
