import type { Metadata } from "next";
import { getSiteUser } from "@/lib/site-user";
import { DashboardView } from "./view";

export const metadata: Metadata = { title: "Videos" };

export default async function Dashboard() {
  const { supabase, email, initial, credits, admin } = await getSiteUser();
  const { data: projects } = await supabase.from("projects").select("id, script, status, aspect_ratio, created_at").order("created_at", { ascending: false });
  return <DashboardView email={email} initial={initial} admin={admin} credits={credits} projects={projects ?? []} />;
}
