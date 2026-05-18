import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decrypt, maskKey } from "@/lib/crypto";
import type { Row } from "@/types/supabase";
import { SettingsForm } from "./settings-form";
import { InstagramSection } from "./instagram-section";

type Credentials = Row<"api_credentials">;
type IgAccount = Row<"instagram_accounts">;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ig?: string; msg?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: creds }, { data: ig }] = await Promise.all([
    supabase
      .from("api_credentials")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle<Credentials>(),
    supabase
      .from("instagram_accounts")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle<IgAccount>(),
  ]);

  const initial = {
    anthropic_masked: safeMask(creds?.anthropic_key_encrypted),
    google_ai_masked: safeMask(creds?.google_ai_key_encrypted),
    openai_masked: safeMask(creds?.openai_key_encrypted),
    monthly_budget_usd: creds?.monthly_budget_usd ?? null,
    default_engine: creds?.default_engine ?? "nano-banana-pro",
    default_tone: creds?.default_tone ?? "informative",
    default_card_count: creds?.default_card_count ?? 6,
    research_model: creds?.research_model ?? "claude-opus-4-7",
    planning_model: creds?.planning_model ?? "claude-opus-4-7",
  };

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="mt-1 text-sm text-text-secondary">
          API 키 · 예산 · 기본값 · 인스타그램 연결
        </p>
      </header>

      <div className="space-y-8">
        <InstagramSection
          account={
            ig
              ? {
                  ig_username: ig.ig_username,
                  fb_page_name: ig.fb_page_name,
                  token_expires_at: ig.token_expires_at,
                  connected_at: ig.connected_at,
                }
              : null
          }
          statusParam={sp.ig ?? null}
          messageParam={sp.msg ?? null}
        />
        <SettingsForm initial={initial} />
      </div>
    </div>
  );
}

function safeMask(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  try {
    return maskKey(decrypt(encrypted));
  } catch {
    return "****";
  }
}
