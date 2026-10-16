import { requireUser } from "@/lib/auth";
import { getAiModels } from "@/lib/settings";

// The voice artists the super admin made available.
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { voiceArtists } = await getAiModels();
  if (!voiceArtists.length) return Response.json({ error: "No voice artists are set. A super admin must add them in /admin/models." }, { status: 503 });
  return Response.json({ voiceArtists });
}
