"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { planSchema } from "@/lib/ai/planning";
import { runCopywriting, type CardCopy } from "@/lib/ai/copywriting";

export type CopyActionResult =
  | { ok: true; cards: CardCopy[] }
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

  const { data: planRow } = await supabase
    .from("plans")
    .select("target_persona, key_message, card_outline")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!planRow) throw new Error("기획안이 없습니다.");

  const plan = planSchema.parse({
    target_persona: planRow.target_persona,
    key_message: planRow.key_message,
    card_outline: planRow.card_outline,
  });

  return { supabase, user, project, plan };
}

/**
 * 전체 카드 카피 일괄 생성 (덮어쓰기).
 */
export async function generateAllCopy(
  projectId: string
): Promise<CopyActionResult> {
  try {
    const { supabase, user, project, plan } = await getContext(projectId);

    const cards = await runCopywriting({
      userId: user.id,
      projectId: project.id,
      topic: project.topic,
      tone: project.tone,
      plan,
    });

    // 모든 카드 업데이트
    for (const c of cards) {
      await supabase
        .from("cards")
        .update({
          headline: c.headline,
          body: c.body,
          cta: c.cta ?? null,
        })
        .eq("project_id", projectId)
        .eq("card_order", c.order);
    }

    revalidatePath(`/new/copy/${projectId}`);
    return { ok: true, cards };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * 특정 카드 1장만 재생성. 다른 카드 카피는 컨텍스트로 전달.
 */
export async function regenerateOneCard(
  projectId: string,
  order: number
): Promise<CopyActionResult> {
  try {
    const { supabase, user, project, plan } = await getContext(projectId);

    const { data: existingRows } = await supabase
      .from("cards")
      .select("card_order, headline, body, cta")
      .eq("project_id", projectId)
      .order("card_order", { ascending: true });

    const existing: CardCopy[] = (existingRows ?? [])
      .filter((r) => r.card_order !== order && (r.headline || r.body))
      .map((r) => ({
        order: r.card_order,
        headline: r.headline,
        body: r.body,
        cta: r.cta,
      }));

    const cards = await runCopywriting({
      userId: user.id,
      projectId: project.id,
      topic: project.topic,
      tone: project.tone,
      plan,
      onlyOrders: [order],
      existing,
    });

    const target = cards.find((c) => c.order === order);
    if (!target) throw new Error("재생성된 카드를 찾을 수 없습니다.");

    await supabase
      .from("cards")
      .update({
        headline: target.headline,
        body: target.body,
        cta: target.cta ?? null,
      })
      .eq("project_id", projectId)
      .eq("card_order", order);

    revalidatePath(`/new/copy/${projectId}`);
    return { ok: true, cards: [target] };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * 카드 카피 수동 편집 저장.
 */
export async function saveCardEdit(
  projectId: string,
  order: number,
  headline: string,
  body: string,
  cta: string | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 소유권 검증
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) return { ok: false, error: "프로젝트를 찾을 수 없습니다." };

  const { error } = await supabase
    .from("cards")
    .update({
      headline,
      body,
      cta: cta && cta.trim() !== "" ? cta : null,
    })
    .eq("project_id", projectId)
    .eq("card_order", order);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/new/copy/${projectId}`);
  return { ok: true };
}

export async function confirmCopy(projectId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // 빈 카피 있으면 거부
  const { data: cards } = await supabase
    .from("cards")
    .select("card_order, headline, body")
    .eq("project_id", projectId)
    .order("card_order", { ascending: true });

  if (!cards || cards.length === 0) throw new Error("카드가 없습니다.");
  const empty = cards.filter((c) => !c.headline || !c.body);
  if (empty.length > 0) {
    throw new Error(
      `비어 있는 카드가 있습니다: ${empty.map((c) => c.card_order).join(", ")}`
    );
  }

  await supabase
    .from("projects")
    .update({ status: "imaging" })
    .eq("id", projectId)
    .eq("user_id", user.id);

  redirect(`/new/design/${projectId}`);
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
