import "server-only";
import { createFalClient } from "@fal-ai/client";
import { env } from "@/lib/env";
import { getStepConfig } from "@/lib/settings";
import { STEP_LABELS, type Step } from "@/lib/steps";

// The ONLY place MotionDots calls an AI provider: fal.ai. Every AI step runs through runStep(),
// with the model the super admin chose for that step. No default model, no fallback.

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
  const err = e as { name?: string; status?: number; message?: string; body?: { detail?: unknown } };
  if (err.name === "TimeoutError") return `took longer than ${TIMEOUT_MS / 60_000} minutes`;
  const detail = Array.isArray(err.body?.detail)
    ? (err.body.detail as { loc?: unknown[]; msg?: string }[]).map((d) => `${(d.loc ?? []).filter((x) => x !== "body").join(".")}: ${d.msg ?? ""}`).join("; ")
    : "";
  return `${err.message ?? String(e)}${detail ? ` (${detail})` : ""}`;
}

export async function runStep(step: Step, input: Record<string, unknown>): Promise<{ data: Record<string, unknown>; model: string }> {
  const config = await getStepConfig(step);
  if (!config) throw new StepError(step, "no model is set. A super admin must set one in /admin/models.");
  const body = config.reasoning ? { ...input, reasoning_effort: config.reasoning } : input;
  try {
    const result = await fal().subscribe(config.model, { input: body, abortSignal: AbortSignal.timeout(TIMEOUT_MS) });
    return { data: result.data as Record<string, unknown>, model: config.model };
  } catch (e) {
    throw new StepError(step, `${config.model} failed: ${reason(e)}`);
  }
}
