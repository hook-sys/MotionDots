"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RENDER_CREDITS } from "@/lib/render/cost";

const POLL_MS = 3000;

// Starts a render (or follows the one already running), polling its job until it is done or failed.
export function RenderButton({ projectId, jobId }: { projectId: string; jobId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(!!jobId);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function poll(id: string) {
    const res = await fetch(`/api/render-jobs/${id}`);
    const job = await res.json();
    if (!res.ok) return stop(job.error);
    if (job.status === "done") {
      setBusy(false);
      return router.refresh();
    }
    if (job.status === "failed") {
      stop(`${job.error}. Your credits were returned.`);
      return router.refresh();
    }
    setProgress(job.progress ?? 0);
    timer.current = setTimeout(() => poll(id), POLL_MS);
  }

  function stop(message: string) {
    setError(message);
    setBusy(false);
  }

  useEffect(() => {
    if (jobId) void poll(jobId);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function start() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/projects/${projectId}/render`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) return stop(body.error);
    void poll(body.jobId);
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={start} disabled={busy} className="gs-btn big">
        {busy ? `Rendering${progress ? ` ${Math.round(progress * 100)}%` : "…"}` : `Render video · ${RENDER_CREDITS} credits`}
      </button>
      {busy && (
        <div className="gs-bar-track">
          <i style={{ width: `${Math.round((progress ?? 0.04) * 100)}%` }} />
        </div>
      )}
      {error && <p className="gs-note error">{error}</p>}
    </div>
  );
}
