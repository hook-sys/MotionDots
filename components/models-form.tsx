"use client";
import { useEffect, useState } from "react";
import { LLM_STEPS, STEPS, STEP_LABELS, type Step } from "@/lib/steps";

type Row = { model: string; reasoning: string };
const empty: Row = { model: "", reasoning: "" };

export function ModelsForm() {
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<Record<Step, Row>>(() => Object.fromEntries(STEPS.map((s) => [s, empty])) as Record<Step, Row>);
  const [artists, setArtists] = useState("");

  useEffect(() => {
    fetch("/api/admin/models")
      .then((r) => r.json())
      .then(({ models }) => {
        if (!models) return;
        setArtists((models.voiceArtists ?? []).join("\n"));
        setRows((prev) => Object.fromEntries(Object.keys(prev).map((s) => [s, { model: models[s]?.model ?? "", reasoning: models[s]?.reasoning ?? "" }])) as Record<Step, Row>);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { voiceArtists: artists.split("\n").map((s) => s.trim()).filter(Boolean) };
    for (const [step, row] of Object.entries(rows)) {
      if (row.model.trim()) body[step] = row.reasoning ? { model: row.model, reasoning: row.reasoning } : { model: row.model };
    }
    const res = await fetch("/api/admin/models", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setMessage(res.ok ? "Saved" : (await res.json()).error);
  }

  return (
    <form onSubmit={save}>
      <h1>MotionDots - AI models</h1>
      <p>Each step runs a fal.ai model id. A step with no model fails with an error.</p>
      {STEPS.map((step) => (
        <fieldset key={step}>
          <legend>{STEP_LABELS[step]}</legend>
          <input value={rows[step].model} onChange={(e) => setRows({ ...rows, [step]: { ...rows[step], model: e.target.value } })} placeholder="fal model id" />
          {(LLM_STEPS as readonly string[]).includes(step) && (
            <select value={rows[step].reasoning} onChange={(e) => setRows({ ...rows, [step]: { ...rows[step], reasoning: e.target.value } })}>
              <option value="">Reasoning: not sent</option>
              <option value="low">Reasoning: low</option>
              <option value="medium">Reasoning: medium</option>
              <option value="high">Reasoning: high</option>
            </select>
          )}
        </fieldset>
      ))}
      <textarea value={artists} onChange={(e) => setArtists(e.target.value)} rows={6} placeholder="Voice artists (voice names), one per line" />
      <button type="submit">Save</button>
      {message && <p>{message}</p>}
    </form>
  );
}
