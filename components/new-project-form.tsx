"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ASPECT_RATIOS, type AspectRatio } from "@/lib/aspect";
import { RENDER_CREDITS } from "@/lib/render/cost";
import { MAX_SCRIPT_CHARS, voiceCredits } from "@/lib/voice/rules";

const label = "text-sm font-medium";
const area =
  "w-full resize-y rounded-2xl border border-foreground/12 bg-white/80 p-4 text-base leading-relaxed placeholder:text-foreground/35 focus:border-[#0a66d6] focus:outline-none focus:ring-4 focus:ring-[#0a66d6]/15";

const SHAPE_HINT: Record<AspectRatio, string> = { "16:9": "Web, YouTube", "9:16": "Reels, TikTok", "1:1": "Feed" };
const STAGE_TEXT = { voice: "Making your voice…", project: "Setting up your video…", render: "Starting the render…" };

type Props = { artists: string[]; canGenerate: boolean; canUpload: boolean; credits: number };

// The four inputs: script or your own recording, voice artist, logo/icon, aspect ratio.
// One button: it makes the voice, creates the project and starts the render, then opens the video page.
export function NewProjectForm({ artists, canGenerate, canUpload, credits }: Props) {
  const router = useRouter();
  const [script, setScript] = useState("");
  const [artist, setArtist] = useState(artists[0] ?? "");
  const [format, setFormat] = useState<AspectRatio>("16:9");
  const [recording, setRecording] = useState<File | null>(null);
  const [logo, setLogo] = useState<{ file: File; url: string } | null>(null);
  const [stage, setStage] = useState<keyof typeof STAGE_TEXT | "">("");
  const [error, setError] = useState("");
  const [projectId, setProjectId] = useState("");
  // (a voice already made for these inputs is reused if a later step failed: no second charge)
  const made = useRef<{ key: string; id: string } | null>(null);

  const useScript = !recording;
  const cost = (useScript && script.trim() ? voiceCredits(script.trim()) : 0) + RENDER_CREDITS;
  const ready = !!logo && (recording ? canUpload : !!script.trim() && canGenerate && !!artist);

  async function call(url: string, init: RequestInit) {
    const res = await fetch(url, init);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Something went wrong");
    return body;
  }

  async function makeVoice(): Promise<string> {
    const key = `${recording?.name ?? ""}|${script}|${artist}`;
    if (made.current?.key === key) return made.current.id;
    let id: string;
    if (recording) {
      const data = new FormData();
      data.set("file", recording);
      id = (await call("/api/voice/upload", { method: "POST", body: data })).voiceoverId;
    } else {
      const body = JSON.stringify({ script: script.trim(), voiceArtist: artist });
      id = (await call("/api/voice/generate", { method: "POST", headers: { "content-type": "application/json" }, body })).voiceoverId;
    }
    made.current = { key, id };
    return id;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!logo) return;
    setError("");
    try {
      setStage("voice");
      const voiceoverId = await makeVoice();
      setStage("project");
      const data = new FormData();
      data.set("voiceoverId", voiceoverId);
      data.set("logo", logo.file);
      data.set("aspectRatio", format);
      if (script.trim()) data.set("script", script.trim());
      const id: string = (await call("/api/projects", { method: "POST", body: data })).projectId;
      setProjectId(id);
      setStage("render");
      await call(`/api/projects/${id}/render`, { method: "POST" });
      router.push(`/projects/${id}`);
    } catch (err) {
      setError((err as Error).message);
      setStage("");
    }
  }

  const missing = !logo ? "Add your logo" : !script.trim() && !recording ? "Write a script or upload a recording" : cost > credits ? `Needs ${cost} credits, you have ${credits}` : "";

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        <Step n={1} title="Script" sub="Write what the voice should say.">
          <textarea value={script} onChange={(e) => setScript(e.target.value.slice(0, MAX_SCRIPT_CHARS))} rows={6} placeholder="Your voiceover script" className={area} />
          <span className="self-end text-xs tabular-nums text-foreground/50">
            {script.length}/{MAX_SCRIPT_CHARS}
          </span>
          {!canGenerate && <p className="rounded-xl border border-foreground/10 bg-white/70 px-4 py-3 text-sm text-foreground/60">Voices from a script are coming soon. You can upload your own recording below.</p>}
        </Step>

        {canGenerate && artists.length > 0 && (
          <Step n={2} title="Voice artist" sub="Who reads your script.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {artists.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setArtist(a)}
                  aria-pressed={artist === a}
                  className={`rounded-2xl border bg-white/70 p-3.5 text-left text-sm font-semibold ${artist === a ? "border-[#0a66d6] ring-4 ring-[#0a66d6]/15" : "border-foreground/10 hover:bg-white"}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </Step>
        )}

        <Step n={3} title="Your own voice (optional)" sub="Upload a recording and it is used instead of the script's voice.">
          <Upload title="Recording" text={recording ? recording.name : "Upload a recording"} sub={canUpload ? "MP3, WAV, M4A, OGG or WebM · up to 25 MB" : "Coming soon"}>
            <input type="file" accept="audio/*" disabled={!canUpload} className="sr-only" onChange={(e) => setRecording(e.target.files?.[0] ?? null)} />
          </Upload>
          {recording && (
            <button type="button" onClick={() => setRecording(null)} className="self-start text-sm text-[#0a66d6] hover:underline">
              Remove recording
            </button>
          )}
        </Step>

        <Step n={4} title="Logo or icon" sub="Shown in your video.">
          <Upload
            title="Logo or icon"
            text={logo ? logo.file.name : "Upload a logo"}
            sub="PNG, JPG or WebP · up to 5 MB"
            preview={logo ? <span className="size-12 rounded-lg bg-[#1d1d1f] bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${logo.url})` }} /> : undefined}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setLogo({ file, url: URL.createObjectURL(file) });
              }}
            />
          </Upload>
        </Step>

        <Step n={5} title="Shape">
          <div className="grid grid-cols-3 gap-3">
            {ASPECT_RATIOS.map((f) => {
              const [w, h] = f.split(":").map(Number);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  aria-pressed={format === f}
                  className={`flex flex-col items-center gap-2 rounded-2xl border bg-white/70 p-3 ${format === f ? "border-[#0a66d6] ring-4 ring-[#0a66d6]/15" : "border-foreground/12 hover:border-foreground/30"}`}
                >
                  <span className="flex h-12 items-center justify-center">
                    <span className={`rounded-md border-2 ${format === f ? "border-[#0a66d6]" : "border-foreground/30"}`} style={{ width: (w / Math.max(w, h)) * 44, height: (h / Math.max(w, h)) * 44 }} />
                  </span>
                  <span className="text-sm font-medium">{f}</span>
                  <span className="text-[11px] text-foreground/50">{SHAPE_HINT[f]}</span>
                </button>
              );
            })}
          </div>
        </Step>

        {error && (
          <p className="rounded-xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1281b]">
            {error}
            {projectId && (
              <>
                {" "}
                <Link href={`/projects/${projectId}`} className="font-medium underline">
                  Open your video
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      <aside className="flex flex-col gap-4 self-start rounded-2xl bg-white/70 p-5 ring-1 ring-black/[0.06] lg:sticky lg:top-6">
        <span className="flex aspect-video items-center justify-center rounded-xl bg-[#1d1d1f]">
          <span className="rounded-md border-2 border-white/80" style={{ width: (Number(format.split(":")[0]) / Math.max(...format.split(":").map(Number))) * 56, height: (Number(format.split(":")[1]) / Math.max(...format.split(":").map(Number))) * 56 }} />
        </span>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Summary k="Shape" v={format} />
          <Summary k="Voice" v={recording ? "Your recording" : canGenerate ? artist || "—" : "—"} />
          <Summary k="Cost" v={`${cost} credits`} />
          <Summary k="You have" v={credits.toLocaleString("en-US")} />
        </dl>
        <button className="gs-btn big w-full" disabled={!ready || cost > credits || stage !== ""}>
          {stage ? STAGE_TEXT[stage] : "Create video"}
        </button>
        {missing && <p className="text-center text-xs text-foreground/50">{missing}</p>}
        <p className="text-center text-[11px] text-foreground/45">Your video is made in the background · download as MP4</p>
      </aside>
    </form>
  );
}

function Step({ n, title, sub, children }: { n: number; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white/70 p-5 ring-1 ring-black/[0.06] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-xs font-bold text-white">{n}</span>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {sub && <p className="mt-0.5 text-xs text-foreground/55">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Upload({ title, text, sub, preview, children }: { title: string; text: string; sub: string; preview?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={label}>{title}</span>
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-foreground/20 bg-white/60 px-3 py-4 text-center text-sm hover:border-[#0a66d6]/60 hover:bg-white">
        {preview ?? <span className="flex size-9 items-center justify-center rounded-full bg-[#0a66d6]/10 text-lg text-[#0a66d6]">↑</span>}
        <span className="max-w-full truncate font-medium text-foreground/80">{text}</span>
        <span className="max-w-full truncate text-[11px] text-foreground/45">{sub}</span>
        {children}
      </label>
    </div>
  );
}

function Summary({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-foreground/45">{k}</dt>
      <dd className="truncate font-medium">{v}</dd>
    </div>
  );
}
