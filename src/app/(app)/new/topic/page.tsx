import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WizardStepper } from "@/components/wizard-stepper";
import type { Row } from "@/types/supabase";
import { TopicForm } from "./topic-form";

export default async function NewTopicPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: brands }, { data: creds }] = await Promise.all([
    supabase
      .from("brand_profiles")
      .select("id, name, is_default")
      .eq("user_id", user!.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<Pick<Row<"brand_profiles">, "id" | "name" | "is_default">[]>(),
    supabase
      .from("api_credentials")
      .select("default_tone, default_card_count, anthropic_key_encrypted")
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);

  const hasAnthropicKey = !!creds?.anthropic_key_encrypted;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-10">
        <WizardStepper current="topic" />
      </div>

      <header className="mb-8">
        <h1 className="text-2xl font-bold">새 카드뉴스 만들기</h1>
        <p className="mt-1 text-sm text-text-secondary">
          토픽과 톤을 정하면 AI가 리서치부터 시작합니다.
        </p>
      </header>

      {!hasAnthropicKey ? (
        <NoApiKeyWarning />
      ) : (
        <TopicForm
          brands={brands ?? []}
          defaultTone={creds?.default_tone ?? "informative"}
          defaultCardCount={creds?.default_card_count ?? 6}
        />
      )}
    </div>
  );
}

function NoApiKeyWarning() {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <p className="mb-2 text-sm font-medium text-text-primary">
        Anthropic API 키가 등록되어 있지 않습니다
      </p>
      <p className="mb-5 text-xs text-text-secondary">
        리서치/기획/카피 단계에 필요합니다. 먼저 설정 페이지에서 등록해주세요.
      </p>
      <Link href="/settings" className="btn-primary text-xs">
        설정으로 이동
      </Link>
    </div>
  );
}
