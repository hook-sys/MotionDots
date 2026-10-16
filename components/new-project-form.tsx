"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ASPECT_RATIOS } from "@/lib/aspect";

export function NewProjectForm() {
  const router = useRouter();
  const [artists, setArtists] = useState<string[]>([]);
  const [voiceoverId, setVoiceoverId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/voice/artists")
      .then((r) => r.json())
      .then((d) => (d.voiceArtists ? setArtists(d.voiceArtists) : setMessage(d.error)));
  }, []);

  async function generate(form: HTMLFormElement) {
    const data = new FormData(form);
    const res = await fetch("/api/voice/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ script: data.get("script"), voiceArtist: data.get("voiceArtist") }),
    });
    const body = await res.json();
    if (res.ok) setVoiceoverId(body.voiceoverId);
    setMessage(res.ok ? `Voice ready (${body.credits} credits used)` : body.error);
  }

  async function upload(file: File) {
    const data = new FormData();
    data.set("file", file);
    const res = await fetch("/api/voice/upload", { method: "POST", body: data });
    const body = await res.json();
    if (res.ok) setVoiceoverId(body.voiceoverId);
    setMessage(res.ok ? "Voice uploaded" : body.error);
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set("voiceoverId", voiceoverId);
    const res = await fetch("/api/projects", { method: "POST", body: data });
    const body = await res.json();
    if (res.ok) router.push("/dashboard");
    else setMessage(body.error);
  }

  return (
    <form onSubmit={create}>
      <h1>New project</h1>
      <textarea name="script" rows={6} placeholder="Voiceover script" />
      <select name="voiceArtist" disabled={!artists.length}>
        {artists.map((a) => (
          <option key={a}>{a}</option>
        ))}
      </select>
      <button type="button" onClick={(e) => generate(e.currentTarget.form!)}>
        Generate voice from script
      </button>
      <label>
        Or upload your own recording
        <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
      <label>
        Logo or icon
        <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" required />
      </label>
      <select name="aspectRatio">
        {ASPECT_RATIOS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <button type="submit" disabled={!voiceoverId}>
        Create project
      </button>
      {message && <p className="error">{message}</p>}
    </form>
  );
}
