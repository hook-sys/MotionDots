import { ModelsForm } from "@/components/admin/models-form";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "AI models" };

export default function AdminModelsPage() {
  return (
    <>
      <PageHeader title="AI models" sub="Which fal model runs each step. A step with no model fails with a clear error." />
      <ModelsForm />
    </>
  );
}
