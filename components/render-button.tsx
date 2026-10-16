"use client";
import { useState } from "react";

const POLL_MS = 3000;

// Starts a render, then polls its job until it is done or failed.
export function RenderButton({ projectId }: { projectId: string }) {
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function poll(jobId: string) {
    const res = await fetch(`/api/render-jobs/${jobId}`);
    const job = await res.json();
    if (!res.ok) return fail(job.error);
    if (job.status === "done") {
      setVideoUrl(job.videoUrl);
      setMessage("Done");
      return setBusy(false);
    }
    if (job.status === "failed") return fail(`${job.error}. Your credits were returned.`);
    setMessage(`Rendering${job.progress ? ` ${Math.round(job.progress * 100)}%` : "..."}`);
    setTimeout(() => poll(jobId), POLL_MS);
  }

  function fail(error: string) {
    setMessage(error);
    setBusy(false);
  }

  async function start() {
    setBusy(true);
    setVideoUrl("");
    const res = await fetch(`/api/projects/${projectId}/render`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) return fail(body.error);
    setMessage("Rendering...");
    poll(body.jobId);
  }

  return (
    <span>
      <button onClick={start} disabled={busy}>Render</button> {message} {videoUrl && <a href={videoUrl}>Download</a>}
    </span>
  );
}
