import "server-only";
import { createFalClient } from "@fal-ai/client";
import { env } from "@/lib/env";
import { getAiModels } from "@/lib/settings";
import { STEP_LABELS, type MediaStep, type Step, type TextStep } from "@/lib/steps";

// The ONLY place MotionDots calls an AI provider: fal.ai. Every AI step runs through here,
// with the model the super admin chose for that step. No default model, no fallback.
//   runStep: voice and transcription, plain fal model ids.
//   runText: the text steps, through a fal chat endpoint (OpenAI-compatible, authenticated with the fal key).

const TIMEOUT_MS = 5 * 60_000;

// A step failed (not configured, or fal rejected/failed). The message is safe to show the user.
export class StepError extends Error {
  constructor(public step: Step, message: string) {
    super(`${STEP_LABELS[step]}: ${message}`);
  }
}

let client: ReturnType<typeof createFalClient> | undefined;
const fal = () => (client ??= createFalClient({ credentials: env("FAL_KEY") }));

// fal's reason (which input field it rejected) rather than just "Unprocessable Entity".
function reason(e: unknown): string {
  const err = e as { name?: string; message?: string; body?: { detail?: unknown } };
  if (err.name === "TimeoutError") return `took longer than ${TIMEOUT_MS / 60_000} minutes`;
  const detail = Array.isArray(err.body?.detail)
    ? (err.body.detail as { loc?: unknown[]; msg?: string }[]).map((d) => `${(d.loc ?? []).filter((x) => x !== "body").join(".")}: ${d.msg ?? ""}`).join("; ")
    : "";
  return `${err.message ?? String(e)}${detail ? ` (${detail})` : ""}`;
}

export async function runStep(step: MediaStep, input: Record<string, unknown>): Promise<{ data: Record<string, unknown>; model: string }> {
  const config = (await getAiModels())[step];
  if (!config) throw new StepError(step, "no model is set. A super admin must set one in /admin/models.");
  try {
    const result = await fal().subscribe(config.model, { input, abortSignal: AbortSignal.timeout(TIMEOUT_MS) });
    return { data: result.data as Record<string, unknown>, model: config.model };
  } catch (e) {
    throw new StepError(step, `${config.model} failed: ${reason(e)}`);
  }
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];
};

// One chat completion for a text step; returns the reply text.
export async function runText(step: TextStep, messages: ChatMessage[]): Promise<string> {
  const config = (await getAiModels())[step];
  if (!config) throw new StepError(step, "no model is set. A super admin must set one in /admin/models.");
  if (!config.endpoint) throw new StepError(step, "no fal endpoint is set. A super admin must set one in /admin/models.");
  const label = `${config.endpoint} / ${config.model}`;
  try {
    const res = await fetch(`https://fal.run/${config.endpoint}/openai/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Key ${env("FAL_KEY")}`, "content-type": "application/json" },
      body: JSON.stringify({ model: config.model, messages, ...(config.reasoning ? { reasoning: { effort: config.reasoning } } : {}) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    const reply = ((await res.json()) as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply) throw new Error("the reply was empty");
    return reply;
  } catch (e) {
    throw new StepError(step, `${label} failed: ${reason(e)}`);
  }
}
