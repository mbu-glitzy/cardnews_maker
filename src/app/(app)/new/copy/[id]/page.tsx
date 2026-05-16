import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WizardStepper } from "@/components/wizard-stepper";
import { getProjectOrNotFound } from "../../_lib/get-project";
import { CopyPanel } from "./copy-panel";

type CardRow = {
  order: number;
  role: string;
  headline: string;
  body: string;
  cta: string | null;
};

export default async function CopyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectOrNotFound(id);

  const supabase = await createSupabaseServerClient();
  const { data: cards } = await supabase
    .from("cards")
    .select("order:card_order, role, headline, body, cta")
    .eq("project_id", id)
    .order("card_order", { ascending: true })
    .returns<CardRow[]>();

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8">
        <WizardStepper current="copy" projectId={id} />
      </div>

      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          토픽
        </p>
        <h1 className="mt-1 text-xl font-bold leading-tight">{project.topic}</h1>
      </header>

      <CopyPanel projectId={id} cards={cards ?? []} />
    </div>
  );
}
