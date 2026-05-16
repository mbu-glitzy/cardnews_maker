import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WizardStepper } from "@/components/wizard-stepper";
import { getProjectOrNotFound } from "../../_lib/get-project";
import { planSchema, type Plan } from "@/lib/ai/planning";
import { PlanPanel } from "./plan-panel";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectOrNotFound(id);

  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("plans")
    .select("target_persona, key_message, card_outline, confirmed_at")
    .eq("project_id", id)
    .maybeSingle();

  let existing: Plan | null = null;
  if (row) {
    const parsed = planSchema.safeParse({
      target_persona: row.target_persona,
      key_message: row.key_message,
      card_outline: row.card_outline,
    });
    if (parsed.success) existing = parsed.data;
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-8">
        <WizardStepper current="plan" projectId={id} />
      </div>

      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          토픽
        </p>
        <h1 className="mt-1 text-xl font-bold leading-tight">{project.topic}</h1>
      </header>

      <PlanPanel
        projectId={id}
        cardCount={project.card_count}
        initial={existing}
        confirmed={!!row?.confirmed_at}
      />
    </div>
  );
}
