import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/site/app-shell";
import { RenderButton } from "@/components/render-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUser } from "@/lib/site-user";
import { STATUS_UI, projectTitle, type ProjectStatus } from "@/lib/project-ui";

export const metadata: Metadata = { title: "Video" };

// One project: what was chosen, the render, and the finished video.
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, admin, initial } = await getSiteUser();
  // (RLS: only the owner's own project comes back)
  const { data: project } = await supabase
    .from("projects")
    .select("id, script, aspect_ratio, status, video_path, error, created_at, voiceovers(source, voice_artist)")
    .eq("id", id)
    .maybeSingle<{ id: string; script: string | null; aspect_ratio: string; status: ProjectStatus; video_path: string | null; error: string | null; created_at: string; voiceovers: { source: string; voice_artist: string | null } }>();
  if (!project) notFound();

  const { data: job } = await supabase.from("render_jobs").select("id").eq("project_id", id).in("status", ["starting", "rendering"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: signed } = project.status === "done" && project.video_path ? await createAdminClient().storage.from("renders").createSignedUrl(project.video_path, 3600, { download: "motiondots-video.mp4" }) : { data: null };
  const ui = STATUS_UI[project.status];

  return (
    <AppShell title="Video" admin={admin} active="videos" initial={initial} wide>
      <div className="flex flex-col gap-6">
        <Link href="/dashboard" className="text-sm text-foreground/60 hover:text-foreground">
          ← All videos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="truncate text-3xl font-semibold tracking-tight sm:text-4xl">{projectTitle(project)}</h1>
          <span className={`gs-pill ${ui.tone}`}>{ui.label}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            {signed?.signedUrl ? (
              <>
                <video src={signed.signedUrl} controls playsInline className="w-full rounded-2xl bg-[#1d1d1f]" />
                <a href={signed.signedUrl} className="gs-btn big self-start">
                  Download MP4
                </a>
              </>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-2xl bg-[#1d1d1f] text-sm text-white/70">{project.status === "rendering" ? "Rendering…" : "Not rendered yet"}</div>
            )}
            {project.status === "failed" && project.error && <p className="gs-note error">{project.error}. Your credits were returned.</p>}
            {project.status !== "done" && <RenderButton projectId={project.id} jobId={job?.id} />}
          </div>

          <dl className="flex flex-col gap-3 self-start rounded-2xl bg-white/70 p-5 text-sm ring-1 ring-black/[0.06]">
            <Fact k="Shape" v={project.aspect_ratio} />
            <Fact k="Voice" v={project.voiceovers.source === "uploaded" ? "Your own recording" : (project.voiceovers.voice_artist ?? "Generated")} />
            <Fact k="Created" v={new Date(project.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
            {project.script && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-foreground/45">Script</dt>
                <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground/80">{project.script}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </AppShell>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-foreground/45">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
