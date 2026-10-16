import { Site } from "@/components/site/site";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  return <Site initial="overview" signedIn={!!user} />;
}
