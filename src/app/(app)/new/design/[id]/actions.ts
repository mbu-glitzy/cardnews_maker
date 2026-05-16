"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateImageWithNanoBanana } from "@/lib/ai/google";
import { generateImageWithGptImage } from "@/lib/ai/openai";
import { runImagePrompts } from "@/lib/ai/image-prompts";
import { runCaption } from "@/lib/ai/caption";
import { uploadBase64ToBucket } from "@/lib/storage";
import type { Row } from "@/types/supabase";

export type DesignActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type PromptsResult =
  | { ok: true; prompts: Array<{ order: number; prompt: string }> }
  | { ok: false; error: string };

export type ImagesResult =
  | { ok: true; images: Array<{ order: number; url: string }> }
  | { ok: false; error: string };

export type OneImageResult =
  | { ok: true; order: number; url: string }
  | { ok: false; error: string };

async function getContext(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) throw new Error("프로젝트를 찾을 수 없습니다.");

  return { supabase, user, project };
}

async function getBrandColors(
  projectId: string
): Promise<{ primary: string; secondary: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("brand_profile_id")
    .eq("id", projectId)
    .maybeSingle();

  if (project?.brand_profile_id) {
    const { data: brand } = await supabase
      .from("brand_profiles")
      .select("color_primary, color_secondary")
      .eq("id", project.brand_profile_id)
      .maybeSingle();
    if (brand) {
      return {
        primary: brand.color_primary,
        secondary: brand.color_secondary,
      };
    }
  }
  return { primary: "#6366f1", secondary: "#a5b4fc" };
}

/**
 * 카드별 이미지 프롬프트 일괄 생성 (Sonnet).
 */
export async function generatePrompts(
  projectId: string
): Promise<PromptsResult> {
  try {
    const { supabase, user, project } = await getContext(projectId);

    const { data: cards } = await supabase
      .from("cards")
      .select("order:card_order, role, headline, body")
      .eq("project_id", projectId)
      .order("card_order", { ascending: true })
      .returns<
        Array<{
          order: number;
          role: string;
          headline: string;
          body: string;
        }>
      >();
    if (!cards || cards.length === 0) {
      return { ok: false, error: "카드가 없습니다." };
    }

    const colors = await getBrandColors(projectId);

    const prompts = await runImagePrompts({
      userId: user.id,
      projectId: project.id,
      topic: project.topic,
      tone: project.tone,
      brandPrimary: colors.primary,
      brandSecondary: colors.secondary,
      cards: cards.map((c) => ({
        order: c.order,
        role: c.role,
        headline: c.headline,
        body: c.body,
      })),
    });

    for (const p of prompts) {
      await supabase
        .from("cards")
        .update({ image_prompt: p.prompt })
        .eq("project_id", projectId)
        .eq("card_order", p.order);
    }

    revalidatePath(`/new/design/${projectId}`);
    return { ok: true, prompts };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * 단일 카드 배경 이미지 생성.
 */
async function generateOneImage(params: {
  userId: string;
  projectId: string;
  order: number;
  prompt: string;
  engine: "nano-banana-pro" | "gpt-image-2";
}): Promise<string> {
  let result: { imageBase64: string; mimeType: string };
  if (params.engine === "gpt-image-2") {
    result = await generateImageWithGptImage({
      userId: params.userId,
      projectId: params.projectId,
      prompt: params.prompt,
      operation: "image",
      quality: "medium",
      size: "1024x1024",
    });
  } else {
    result = await generateImageWithNanoBanana({
      userId: params.userId,
      projectId: params.projectId,
      prompt: params.prompt,
      operation: "image",
    });
  }

  const ext = result.mimeType.includes("png") ? "png" : "jpg";
  const path = `${params.userId}/${params.projectId}/card-${params.order}-${Date.now()}.${ext}`;
  return uploadBase64ToBucket({
    bucket: "card-images",
    path,
    base64: result.imageBase64,
    contentType: result.mimeType,
  });
}

/**
 * 카드 전체 배경 이미지 일괄 생성 (병렬).
 */
export async function generateAllImages(
  projectId: string,
  engineOverride?: "nano-banana-pro" | "gpt-image-2"
): Promise<ImagesResult> {
  try {
    const { supabase, user, project } = await getContext(projectId);

    // 기본 엔진 결정
    let engine: "nano-banana-pro" | "gpt-image-2" =
      engineOverride ?? "nano-banana-pro";
    if (!engineOverride) {
      const { data: cred } = await supabase
        .from("api_credentials")
        .select("default_engine")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cred?.default_engine === "gpt-image-2") engine = "gpt-image-2";
    }

    const { data: cards } = await supabase
      .from("cards")
      .select("order:card_order, image_prompt")
      .eq("project_id", projectId)
      .order("card_order", { ascending: true })
      .returns<Array<{ order: number; image_prompt: string | null }>>();
    if (!cards || cards.length === 0) {
      return { ok: false, error: "카드가 없습니다." };
    }
    const missing = cards.filter((c) => !c.image_prompt);
    if (missing.length > 0) {
      return {
        ok: false,
        error: `이미지 프롬프트가 없는 카드: ${missing.map((c) => c.order).join(", ")}. 먼저 프롬프트를 생성하세요.`,
      };
    }

    const results = await Promise.allSettled(
      cards.map(async (c) => {
        const url = await generateOneImage({
          userId: user.id,
          projectId: project.id,
          order: c.order,
          prompt: c.image_prompt!,
          engine,
        });
        await supabase
          .from("cards")
          .update({ image_url: url, engine })
          .eq("project_id", projectId)
          .eq("card_order", c.order);
        return { order: c.order, url };
      })
    );

    const failed = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );
    if (failed.length > 0) {
      const reasons = failed.map((f) =>
        f.reason instanceof Error ? f.reason.message : String(f.reason)
      );
      console.error("[design] 일부 이미지 생성 실패", reasons);
      return {
        ok: false,
        error: `${failed.length}장 생성 실패. 첫 번째 에러: ${reasons[0]}`,
      };
    }

    const images = results
      .filter(
        (r): r is PromiseFulfilledResult<{ order: number; url: string }> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    revalidatePath(`/new/design/${projectId}`);
    return { ok: true, images };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * 카드 1장 이미지 재생성.
 */
export async function regenerateOneImage(
  projectId: string,
  order: number,
  engineOverride?: "nano-banana-pro" | "gpt-image-2"
): Promise<OneImageResult> {
  try {
    const { supabase, user, project } = await getContext(projectId);

    const { data: card } = await supabase
      .from("cards")
      .select("image_prompt, engine")
      .eq("project_id", projectId)
      .eq("card_order", order)
      .maybeSingle();
    if (!card?.image_prompt) {
      return { ok: false, error: "이미지 프롬프트가 없습니다." };
    }

    let engine: "nano-banana-pro" | "gpt-image-2" =
      engineOverride ??
      (card.engine as "nano-banana-pro" | "gpt-image-2" | null) ??
      "nano-banana-pro";

    const url = await generateOneImage({
      userId: user.id,
      projectId: project.id,
      order,
      prompt: card.image_prompt,
      engine,
    });

    await supabase
      .from("cards")
      .update({ image_url: url, engine })
      .eq("project_id", projectId)
      .eq("card_order", order);

    revalidatePath(`/new/design/${projectId}`);
    return { ok: true, order, url };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * 카드 한 장의 image_prompt 수동 편집.
 */
export async function saveImagePrompt(
  projectId: string,
  order: number,
  prompt: string
): Promise<DesignActionResult> {
  try {
    const { supabase } = await getContext(projectId);
    const { error } = await supabase
      .from("cards")
      .update({ image_prompt: prompt })
      .eq("project_id", projectId)
      .eq("card_order", order);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/new/design/${projectId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * 캡션·해시태그 생성 (Haiku).
 */
export async function generateCaption(
  projectId: string
): Promise<{ ok: true; caption: string; hashtags: string[] } | { ok: false; error: string }> {
  try {
    const { supabase, user, project } = await getContext(projectId);

    const { data: planRow } = await supabase
      .from("plans")
      .select("key_message")
      .eq("project_id", projectId)
      .maybeSingle();
    if (!planRow) return { ok: false, error: "기획안이 없습니다." };

    const { data: cards } = await supabase
      .from("cards")
      .select("headline, body")
      .eq("project_id", projectId)
      .order("card_order", { ascending: true })
      .returns<Pick<Row<"cards">, "headline" | "body">[]>();
    if (!cards || cards.length === 0) return { ok: false, error: "카드가 없습니다." };

    const result = await runCaption({
      userId: user.id,
      projectId: project.id,
      topic: project.topic,
      tone: project.tone,
      keyMessage: planRow.key_message,
      cards,
    });

    await supabase
      .from("projects")
      .update({ caption: result.caption, hashtags: result.hashtags })
      .eq("id", project.id);

    revalidatePath(`/new/design/${projectId}`);
    return { ok: true, caption: result.caption, hashtags: result.hashtags };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * 프로젝트 완료 처리.
 */
export async function markCompleted(projectId: string): Promise<void> {
  const { supabase, project } = await getContext(projectId);
  await supabase
    .from("projects")
    .update({ status: "completed" })
    .eq("id", project.id);
  revalidatePath(`/new/design/${projectId}`);
  revalidatePath("/");
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
