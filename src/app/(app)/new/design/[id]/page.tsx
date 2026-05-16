import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WizardStepper } from "@/components/wizard-stepper";
import { getProjectOrNotFound } from "../../_lib/get-project";
import { DesignPanel } from "./design-panel";

type CardForDesign = {
  id: string;
  order: number;
  role: string;
  headline: string;
  body: string;
  cta: string | null;
  image_prompt: string | null;
  image_url: string | null;
  engine: string | null;
};

export default async function DesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectOrNotFound(id);

  const supabase = await createSupabaseServerClient();
  const { data: cards } = await supabase
    .from("cards")
    .select(
      "id, order:card_order, role, headline, body, cta, image_prompt, image_url, engine"
    )
    .eq("project_id", id)
    .order("card_order", { ascending: true })
    .returns<CardForDesign[]>();

  const [{ data: cred }, { data: ig }] = await Promise.all([
    supabase
      .from("api_credentials")
      .select("default_engine")
      .eq("user_id", project.user_id)
      .maybeSingle(),
    supabase
      .from("instagram_accounts")
      .select("ig_username, token_expires_at")
      .eq("user_id", project.user_id)
      .maybeSingle(),
  ]);

  const h = await headers();
  const host = h.get("host") ?? "localhost:9999";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="mb-8">
        <WizardStepper current="design" projectId={id} />
      </div>

      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          토픽
        </p>
        <h1 className="mt-1 text-xl font-bold leading-tight">{project.topic}</h1>
      </header>

      <DesignPanel
        projectId={id}
        cards={cards ?? []}
        defaultEngine={
          (cred?.default_engine as "nano-banana-pro" | "gpt-image-2") ??
          "nano-banana-pro"
        }
        caption={project.caption}
        hashtags={project.hashtags}
        status={project.status}
        publishedPermalink={project.published_permalink}
        igAccount={
          ig
            ? {
                ig_username: ig.ig_username,
                token_expires_at: ig.token_expires_at,
              }
            : null
        }
        baseUrl={baseUrl}
      />
    </div>
  );
}
