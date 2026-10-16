"use client";
import { useEffect, useState } from "react";
import { STEPS, STEP_LABELS, TEXT_STEPS, type Step } from "@/lib/steps";

type Row = { endpoint: string; model: string; reasoning: string };
const empty: Row = { endpoint: "", model: "", reasoning: "" };
const isText = (step: Step) => (TEXT_STEPS as readonly string[]).includes(step);

// Placeholders are hints only; nothing is filled in or used unless you save it.
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
        setRows(Object.fromEntries(STEPS.map((s) => [s, { endpoint: models[s]?.endpoint ?? "", model: models[s]?.model ?? "", reasoning: models[s]?.reasoning ?? "" }])) as Record<Step, Row>);
      });
  }, []);

  function set(step: Step, field: keyof Row, value: string) {
    setRows({ ...rows, [step]: { ...rows[step], [field]: value } });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { voiceArtists: artists.split("\n").map((s) => s.trim()).filter(Boolean) };
    for (const step of STEPS) {
      const row = rows[step];
      if (!row.model.trim()) continue;
      body[step] = isText(step)
        ? { endpoint: row.endpoint, model: row.model, ...(row.reasoning ? { reasoning: row.reasoning } : {}) }
        : { model: row.model };
    }
    const res = await fetch("/api/admin/models", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setMessage(res.ok ? "Saved" : (await res.json()).error);
  }

  return (
    <form onSubmit={save}>
      <h1>MotionDots - AI models</h1>
      <p>Every step runs through fal.ai. A step with no model fails with an error.</p>
      {STEPS.map((step) => (
        <fieldset key={step}>
          <legend>{STEP_LABELS[step]}</legend>
          {isText(step) ? (
            <>
              <input value={rows[step].endpoint} onChange={(e) => set(step, "endpoint", e.target.value)} placeholder="fal endpoint id (e.g. openrouter/router)" />
              <input value={rows[step].model} onChange={(e) => set(step, "model", e.target.value)} placeholder="model name (e.g. provider/model-name)" />
              <select value={rows[step].reasoning} onChange={(e) => set(step, "reasoning", e.target.value)}>
                <option value="">Reasoning: not sent</option>
                <option value="low">Reasoning: low</option>
                <option value="medium">Reasoning: medium</option>
                <option value="high">Reasoning: high</option>
              </select>
            </>
          ) : (
            <input value={rows[step].model} onChange={(e) => set(step, "model", e.target.value)} placeholder="fal model id" />
          )}
        </fieldset>
      ))}
      <textarea value={artists} onChange={(e) => setArtists(e.target.value)} rows={6} placeholder="Voice artists (voice names), one per line" />
      <button type="submit">Save</button>
      {message && <p>{message}</p>}
    </form>
  );
}
