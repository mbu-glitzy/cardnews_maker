import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WizardStepper } from "@/components/wizard-stepper";
import { getProjectOrNotFound } from "../../_lib/get-project";
import { researchSchema, type Research } from "@/lib/ai/research";
import { ResearchPanel } from "./research-panel";

export default async function ResearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectOrNotFound(id);

  const supabase = await createSupabaseServerClient();
  const { data: report } = await supabase
    .from("research_reports")
    .select("content, confirmed_at")
    .eq("project_id", id)
    .maybeSingle();

  let existing: Research | null = null;
  if (report?.content) {
    const parsed = researchSchema.safeParse(report.content);
    if (parsed.success) existing = parsed.data;
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-8">
        <WizardStepper current="research" projectId={id} />
      </div>

      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          토픽
        </p>
        <h1 className="mt-1 text-xl font-bold leading-tight">{project.topic}</h1>
      </header>

      <ResearchPanel
        projectId={id}
        initial={existing}
        confirmed={!!report?.confirmed_at}
      />
    </div>
  );
}
