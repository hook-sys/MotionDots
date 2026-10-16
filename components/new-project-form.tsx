"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ASPECT_RATIOS, type AspectRatio } from "@/lib/aspect";
import { MAX_SCRIPT_CHARS, voiceCredits } from "@/lib/voice/rules";

const label = "text-sm font-medium";
const input =
  "w-full rounded-xl border border-foreground/12 bg-white/80 px-3.5 py-2.5 text-sm placeholder:text-foreground/35 focus:border-[#0a66d6] focus:outline-none focus:ring-4 focus:ring-[#0a66d6]/15";
const area =
  "w-full resize-y rounded-2xl border border-foreground/12 bg-white/80 p-4 text-base leading-relaxed placeholder:text-foreground/35 focus:border-[#0a66d6] focus:outline-none focus:ring-4 focus:ring-[#0a66d6]/15";

const SHAPE_HINT: Record<AspectRatio, string> = { "16:9": "Web, YouTube", "9:16": "Reels, TikTok", "1:1": "Feed" };

type Props = { artists: string[]; canGenerate: boolean; canUpload: boolean; credits: number };

// The four inputs: script or uploaded voice, voice artist, logo/icon, aspect ratio.
// The voice is made first (/api/voice/*), then the project is created (/api/projects).
export function NewProjectForm({ artists, canGenerate, canUpload, credits }: Props) {
  const router = useRouter();
  const [script, setScript] = useState("");
  const [artist, setArtist] = useState(artists[0] ?? "");
  const [format, setFormat] = useState<AspectRatio>("16:9");
  const [voice, setVoice] = useState<{ id: string; text: string } | null>(null);
  const [logo, setLogo] = useState<{ file: File; url: string } | null>(null);
  const [busy, setBusy] = useState<"" | "voice" | "upload" | "create">("");
  const [error, setError] = useState("");

  const cost = script.trim() ? voiceCredits(script.trim()) : 0;

  async function generate() {
    setError("");
    setBusy("voice");
    const res = await fetch("/api/voice/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ script, voiceArtist: artist }) });
    const body = await res.json();
    setBusy("");
    if (!res.ok) return setError(body.error);
    setVoice({ id: body.voiceoverId, text: `Voice by ${artist} is ready (${body.credits} credits used)` });
  }

  async function upload(file: File) {
    setError("");
    setBusy("upload");
    const data = new FormData();
    data.set("file", file);
    const res = await fetch("/api/voice/upload", { method: "POST", body: data });
    const body = await res.json();
    setBusy("");
    if (!res.ok) return setError(body.error);
    setVoice({ id: body.voiceoverId, text: `Your recording is ready (${file.name})` });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!voice || !logo) return;
    setError("");
    setBusy("create");
    const data = new FormData();
    data.set("voiceoverId", voice.id);
    data.set("logo", logo.file);
    data.set("aspectRatio", format);
    if (script.trim()) data.set("script", script.trim());
    const res = await fetch("/api/projects", { method: "POST", body: data });
    const body = await res.json();
    if (!res.ok) {
      setBusy("");
      return setError(body.error);
    }
    router.push(`/projects/${body.projectId}`);
  }

  const submit = (
    <button className="gs-btn big w-full" disabled={!voice || !logo || busy !== ""}>
      {busy === "create" ? "Creating…" : "Create project"}
    </button>
  );
  const missing = !voice ? "Add a voice first" : !logo ? "Add your logo" : "";

  return (
    <form onSubmit={create} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        <Step n={1} title="Script" sub="Write what the voice should say. Optional if you upload your own recording.">
          <textarea value={script} onChange={(e) => setScript(e.target.value.slice(0, MAX_SCRIPT_CHARS))} rows={6} placeholder="Your voiceover script" className={area} />
          <span className="self-end text-xs tabular-nums text-foreground/50">
            {script.length}/{MAX_SCRIPT_CHARS}
          </span>
        </Step>

        <Step n={2} title="Voice" sub="Pick a voice artist to read your script, or upload your own recording.">
          {voice ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#0a66d6] bg-white/70 p-4 ring-4 ring-[#0a66d6]/15">
              <span className="text-sm font-medium">{voice.text}</span>
              <button type="button" onClick={() => setVoice(null)} className="text-sm text-[#0a66d6] hover:underline">
                Change
              </button>
            </div>
          ) : (
            <>
              <Field title="Voice artist">
                {canGenerate && artists.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
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
                ) : (
                  <p className="rounded-xl border border-foreground/10 bg-white/70 px-4 py-3 text-sm text-foreground/60">Generated voices are coming soon. You can upload your own recording below.</p>
                )}
              </Field>
              {canGenerate && artists.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className="gs-btn" disabled={!script.trim() || !artist || busy !== "" || cost > credits} onClick={generate}>
                    {busy === "voice" ? "Generating…" : "Generate voice"}
                  </button>
                  <span className="text-xs text-foreground/55">{cost > credits ? `Needs ${cost} credits, you have ${credits}` : cost ? `Costs ${cost} credit${cost > 1 ? "s" : ""}` : "Write a script first"}</span>
                </div>
              )}
              <Upload title="Or upload your own recording" text={busy === "upload" ? "Uploading and transcribing…" : "Upload a recording"} sub={canUpload ? "MP3, WAV, M4A, OGG or WebM · up to 25 MB" : "Coming soon"}>
                <input type="file" accept="audio/*" disabled={!canUpload || busy !== ""} className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </Upload>
            </>
          )}
        </Step>

        <Step n={3} title="Logo or icon" sub="Shown in your video.">
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

        <Step n={4} title="Shape">
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

        {error && <p className="rounded-xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1281b]">{error}</p>}
      </div>

      <aside className="flex flex-col gap-4 self-start rounded-2xl bg-white/70 p-5 ring-1 ring-black/[0.06] lg:sticky lg:top-6">
        <span className="flex aspect-video items-center justify-center rounded-xl bg-[#1d1d1f]">
          <span className="rounded-md border-2 border-white/80" style={{ width: (Number(format.split(":")[0]) / Math.max(...format.split(":").map(Number))) * 56, height: (Number(format.split(":")[1]) / Math.max(...format.split(":").map(Number))) * 56 }} />
        </span>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Summary k="Shape" v={format} />
          <Summary k="Voice" v={voice ? "Ready" : "—"} />
          <Summary k="Logo" v={logo ? "Added" : "—"} />
          <Summary k="Credits" v={credits.toLocaleString("en-US")} />
        </dl>
        {submit}
        {missing && <p className="text-center text-xs text-foreground/50">{missing}</p>}
        <p className="text-center text-[11px] text-foreground/45">Rendering is a separate step · download as MP4</p>
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

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={label}>{title}</span>
      {children}
    </div>
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
