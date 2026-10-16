import { requireUser } from "@/lib/auth";
import { getAiModels } from "@/lib/settings";

// The voice artists the admin made available.
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  try {
    return Response.json({ voiceArtists: (await getAiModels()).voiceArtists });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 503 });
  }
}
