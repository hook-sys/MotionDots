import { notFound, redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { ModelsForm } from "@/components/models-form";

export default async function AdminModelsPage() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) {
    if (auth.error.status === 401) redirect("/login");
    notFound();
  }
  return <ModelsForm />;
}
