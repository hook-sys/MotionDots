"use client";
import { useEffect, useState } from "react";
import { Card, btnPrimary, input } from "@/components/admin/ui";
import { STEPS, STEP_LABELS, TEXT_STEPS, type Step } from "@/lib/steps";

type Row = { endpoint: string; model: string; reasoning: string };
const empty: Row = { endpoint: "", model: "", reasoning: "" };
const isText = (step: Step) => (TEXT_STEPS as readonly string[]).includes(step);

// Placeholders are hints only; nothing is filled in or used unless you save it.
export function ModelsForm() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
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
    setMessage(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: (await res.json()).error });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      {message && <p className={`rounded-xl border px-4 py-3 text-sm ${message.ok ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200" : "border-amber-400/20 bg-amber-400/[0.06] text-amber-200"}`}>{message.text}</p>}
      {STEPS.map((step) => (
        <Card key={step} title={STEP_LABELS[step]}>
          <div className="flex flex-col gap-2">
            {isText(step) ? (
              <>
                <input value={rows[step].endpoint} onChange={(e) => set(step, "endpoint", e.target.value)} placeholder="fal endpoint id (e.g. openrouter/router)" className={input} />
                <input value={rows[step].model} onChange={(e) => set(step, "model", e.target.value)} placeholder="model name (e.g. provider/model-name)" className={input} />
                <select value={rows[step].reasoning} onChange={(e) => set(step, "reasoning", e.target.value)} className={`${input} md:w-56`}>
                  <option value="">Reasoning: not sent</option>
                  <option value="low">Reasoning: low</option>
                  <option value="medium">Reasoning: medium</option>
                  <option value="high">Reasoning: high</option>
                </select>
              </>
            ) : (
              <input value={rows[step].model} onChange={(e) => set(step, "model", e.target.value)} placeholder="fal model id" className={input} />
            )}
          </div>
        </Card>
      ))}
      <Card title="Voice artists">
        <textarea value={artists} onChange={(e) => setArtists(e.target.value)} rows={6} placeholder="Voice names, one per line" className={input} />
      </Card>
      <button className={`${btnPrimary} self-start`}>Save</button>
    </form>
  );
}
