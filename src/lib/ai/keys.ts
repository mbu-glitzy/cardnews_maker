import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";

/**
 * 사용자별 API 키 조회.
 * 우선순위: DB(사용자가 설정 페이지에 입력한 키) > process.env (개발 편의)
 */

type Provider = "anthropic" | "google" | "openai";

const ENV_FALLBACK: Record<Provider, string | undefined> = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_AI_API_KEY,
  openai: process.env.OPENAI_API_KEY,
};

const DB_COLUMN: Record<Provider, string> = {
  anthropic: "anthropic_key_encrypted",
  google: "google_ai_key_encrypted",
  openai: "openai_key_encrypted",
};

export async function getUserApiKey(
  userId: string,
  provider: Provider
): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("api_credentials")
    .select(DB_COLUMN[provider])
    .eq("user_id", userId)
    .maybeSingle();

  const encrypted = (data as Record<string, string | null> | null)?.[
    DB_COLUMN[provider]
  ];
  if (encrypted) {
    try {
      return decrypt(encrypted);
    } catch (e) {
      console.error(`[keys] ${provider} 키 복호화 실패`, e);
    }
  }

  return ENV_FALLBACK[provider] ?? null;
}

export async function requireUserApiKey(
  userId: string,
  provider: Provider
): Promise<string> {
  const key = await getUserApiKey(userId, provider);
  if (!key) {
    throw new Error(
      `${provider} API 키가 설정되지 않았습니다. 설정 페이지에서 키를 등록해주세요.`
    );
  }
  return key;
}
