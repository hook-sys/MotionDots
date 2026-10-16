import type { Metadata } from "next";
import { AppShell } from "@/components/site/app-shell";
import { NewProjectForm } from "@/components/new-project-form";
import { getAiModels } from "@/lib/settings";
import { getSiteUser } from "@/lib/site-user";

export const metadata: Metadata = { title: "New video" };

export default async function NewProjectPage() {
  const { admin, initial, credits } = await getSiteUser();
  const models = await getAiModels();
  return (
    <AppShell title="New video" admin={admin} active="new" initial={initial} wide>
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Create your video</h1>
        <p className="max-w-xl text-foreground/60">Write your script, add your logo and pick a shape. One click and your video is made.</p>
      </div>
      <NewProjectForm artists={models.voiceArtists} canGenerate={!!models.voice} canUpload={!!models.transcription} credits={credits} />
    </AppShell>
  );
}
