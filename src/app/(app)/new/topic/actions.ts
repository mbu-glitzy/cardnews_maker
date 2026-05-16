"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  topic: z.string().trim().min(2).max(200),
  tone: z.enum(["informative", "emotional", "humorous", "sophisticated"]),
  card_count: z
    .string()
    .transform((v) => Number(v))
    .pipe(z.number().int().min(5).max(8)),
  brand_profile_id: z.string().uuid().nullable(),
});

export type CreateProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

export async function createProject(
  formData: FormData
): Promise<CreateProjectResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const brandRaw = formData.get("brand_profile_id");
  const parsed = schema.safeParse({
    topic: formData.get("topic"),
    tone: formData.get("tone"),
    card_count: formData.get("card_count"),
    brand_profile_id: brandRaw === "" || brandRaw === null ? null : brandRaw,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      topic: parsed.data.topic,
      tone: parsed.data.tone,
      card_count: parsed.data.card_count,
      brand_profile_id: parsed.data.brand_profile_id,
      status: "researching",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[new/topic] 프로젝트 생성 실패", error);
    return { ok: false, error: error?.message ?? "프로젝트 생성 실패" };
  }

  redirect(`/new/research/${data.id}`);
}
