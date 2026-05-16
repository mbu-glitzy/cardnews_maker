"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import type { Insert } from "@/types/supabase";

const settingsSchema = z.object({
  anthropic_key: z.string().optional(),
  google_ai_key: z.string().optional(),
  openai_key: z.string().optional(),
  monthly_budget_usd: z
    .string()
    .optional()
    .transform((v) => {
      if (!v || v.trim() === "") return null;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : null;
    }),
  default_engine: z.enum(["nano-banana-pro", "gpt-image-2"]),
  default_tone: z.enum(["informative", "emotional", "humorous", "sophisticated"]),
  default_card_count: z
    .string()
    .transform((v) => Number(v))
    .pipe(z.number().int().min(5).max(8)),
});

export type SettingsResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function saveSettings(
  formData: FormData
): Promise<SettingsResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = settingsSchema.safeParse({
    anthropic_key: formData.get("anthropic_key") ?? undefined,
    google_ai_key: formData.get("google_ai_key") ?? undefined,
    openai_key: formData.get("openai_key") ?? undefined,
    monthly_budget_usd: formData.get("monthly_budget_usd") ?? undefined,
    default_engine: formData.get("default_engine"),
    default_tone: formData.get("default_tone"),
    default_card_count: formData.get("default_card_count"),
  });
  if (!parsed.success) {
    return { ok: false, error: "입력값이 올바르지 않습니다." };
  }
  const d = parsed.data;

  const updates: Insert<"api_credentials"> = {
    user_id: user.id,
    monthly_budget_usd: d.monthly_budget_usd,
    default_engine: d.default_engine,
    default_tone: d.default_tone,
    default_card_count: d.default_card_count,
  };

  if (d.anthropic_key && d.anthropic_key.trim() !== "") {
    updates.anthropic_key_encrypted = encrypt(d.anthropic_key.trim());
  }
  if (d.google_ai_key && d.google_ai_key.trim() !== "") {
    updates.google_ai_key_encrypted = encrypt(d.google_ai_key.trim());
  }
  if (d.openai_key && d.openai_key.trim() !== "") {
    updates.openai_key_encrypted = encrypt(d.openai_key.trim());
  }

  const { error } = await supabase
    .from("api_credentials")
    .upsert(updates, { onConflict: "user_id" });

  if (error) {
    console.error("[settings] 저장 실패", error);
    return { ok: false, error: "저장 중 오류가 발생했습니다." };
  }

  revalidatePath("/settings");
  return { ok: true, message: "설정이 저장되었습니다." };
}

/**
 * 각 AI 서비스 연결 테스트.
 */
export type TestResult = { ok: true; detail: string } | { ok: false; error: string };

export async function testAnthropic(rawKey: string): Promise<TestResult> {
  try {
    const client = new Anthropic({ apiKey: rawKey.trim() });
    const r = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{ role: "user", content: "ping" }],
    });
    const text = r.content
      .filter((c): c is Anthropic.Messages.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("")
      .slice(0, 60);
    return { ok: true, detail: `응답: ${text || "(빈 응답)"}` };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function testGoogleAi(rawKey: string): Promise<TestResult> {
  try {
    const client = new GoogleGenAI({ apiKey: rawKey.trim() });
    const r = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
    });
    const text = r.text?.slice(0, 60) ?? "(빈 응답)";
    return { ok: true, detail: `응답: ${text}` };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function testOpenAi(rawKey: string): Promise<TestResult> {
  try {
    const client = new OpenAI({ apiKey: rawKey.trim() });
    const r = await client.models.list();
    const count = r.data.length;
    return { ok: true, detail: `${count}개 모델 접근 가능` };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
