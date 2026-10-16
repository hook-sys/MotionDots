"use client";
import { useEffect, useState } from "react";

export function ModelsForm() {
  const [message, setMessage] = useState("");
  const [values, setValues] = useState({ textModel: "", voiceModel: "", voiceArtists: "" });

  useEffect(() => {
    fetch("/api/admin/models")
      .then((r) => r.json())
      .then(({ models }) => models && setValues({ ...models, voiceArtists: models.voiceArtists.join("\n") }));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/models", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, voiceArtists: values.voiceArtists.split("\n").map((s) => s.trim()).filter(Boolean) }),
    });
    setMessage(res.ok ? "Saved" : (await res.json()).error);
  }

  return (
    <form onSubmit={save}>
      <h1>AI models</h1>
      <input value={values.textModel} onChange={(e) => setValues({ ...values, textModel: e.target.value })} placeholder="Text model" required />
      <input value={values.voiceModel} onChange={(e) => setValues({ ...values, voiceModel: e.target.value })} placeholder="Voice model (fal id)" required />
      <textarea value={values.voiceArtists} onChange={(e) => setValues({ ...values, voiceArtists: e.target.value })} rows={8} placeholder="Voice artists, one per line" required />
      <button type="submit">Save</button>
      {message && <p>{message}</p>}
    </form>
  );
}
