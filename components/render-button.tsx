"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { renderInBrowser } from "@/lib/render/browser";
import { RENDER_CREDITS } from "@/lib/render/cost";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { AspectRatio } from "@/lib/aspect";
import type { Look } from "@/lib/video/look";
import type { Word } from "@/lib/voice/words";

type Start = { jobId: string; audioUrl: string; logoUrl: string; aspectRatio: AspectRatio; look: Look; words: Word[]; upload: { path: string; token: string } };

// Makes the video in this browser: starts the job (credits taken), renders, uploads the MP4 and closes the job.
// If anything fails the job is failed on the server and the credits come back.
// `interruptedJobId`: a job left open by a closed tab; it can't be continued, so it is closed (refunded) before a new render.
export function RenderButton({ projectId, interruptedJobId, autoStart }: { projectId: string; interruptedJobId?: string; autoStart?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const started = useRef(false);

  async function call(url: string, init?: RequestInit) {
    const res = await fetch(url, { method: "POST", ...init });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Something went wrong");
    return body;
  }

  async function start() {
    setBusy(true);
    setError("");
    setProgress(0);
    let jobId = "";
    try {
      if (interruptedJobId) await call(`/api/render-jobs/${interruptedJobId}/fail`);
      const job: Start = await call(`/api/projects/${projectId}/render`);
      jobId = job.jobId;
      const video = await renderInBrowser({ audioUrl: job.audioUrl, logoUrl: job.logoUrl, words: job.words, aspectRatio: job.aspectRatio, look: job.look, onProgress: setProgress });
      const { error: uploadError } = await createBrowserSupabase().storage.from("renders").uploadToSignedUrl(job.upload.path, job.upload.token, video, { contentType: "video/mp4", upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      await call(`/api/render-jobs/${jobId}/finish`);
      router.refresh();
    } catch (e) {
      const message = (e as Error).message;
      // (a job that was started is failed, which returns its credits)
      if (jobId) await call(`/api/render-jobs/${jobId}/fail`, { headers: { "content-type": "application/json" }, body: JSON.stringify({ error: message.slice(0, 200) }) }).catch(() => {});
      setError(jobId ? `${message} Your credits were returned.` : message);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  // (a video just created from the new-video page starts by itself, once)
  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return (
    <div className="flex flex-col gap-2">
      {interruptedJobId && !busy && <p className="gs-note info">The last render was interrupted. Start it again; the credits for it were returned.</p>}
      <button type="button" onClick={start} disabled={busy} className="gs-btn big">
        {busy ? `Making your video… ${Math.round(progress * 100)}%` : interruptedJobId ? `Render again · ${RENDER_CREDITS} credits` : `Render video · ${RENDER_CREDITS} credits`}
      </button>
      {busy && (
        <>
          <div className="gs-bar-track">
            <i style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }} />
          </div>
          <p className="text-xs text-foreground/55">Keep this tab open while your video is made.</p>
        </>
      )}
      {error && <p className="gs-note error">{error}</p>}
    </div>
  );
}
