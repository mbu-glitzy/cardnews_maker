"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { researchSchema } from "@/lib/ai/research";
import {
  runPlanning,
  runRegenerateCardOutline,
  type Plan,
} from "@/lib/ai/planning";
import type { Json } from "@/types/supabase";

export type PlanActionResult =
  | { ok: true; plan: Plan }
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

  const { data: report } = await supabase
    .from("research_reports")
    .select("content")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!report?.content) throw new Error("리서치 결과가 없습니다.");

  const research = researchSchema.parse(report.content);
  return { supabase, user, project, research };
}

export async function generatePlan(
  projectId: string
): Promise<PlanActionResult> {
  try {
    const { supabase, user, project, research } = await getContext(projectId);

    const { data: cred } = await supabase
      .from("api_credentials")
      .select("planning_model")
      .eq("user_id", user.id)
      .maybeSingle();
    const model =
      cred?.planning_model === "claude-sonnet-4-6"
        ? "claude-sonnet-4-6"
        : "claude-opus-4-7";

    const plan = await runPlanning({
      userId: user.id,
      projectId: project.id,
      topic: project.topic,
      tone: project.tone,
      cardCount: project.card_count,
      research,
      model,
    });

    const { error } = await supabase.from("plans").upsert(
      {
        project_id: project.id,
        target_persona: plan.target_persona,
        key_message: plan.key_message,
        card_outline: plan.card_outline as unknown as Json,
        confirmed_at: null,
      },
      { onConflict: "project_id" }
    );
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/new/plan/${projectId}`);
    return { ok: true, plan };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * 카드 1장 outline 만 다시 생성.
 */
export async function regenerateCardOutline(
  projectId: string,
  order: number
): Promise<PlanActionResult> {
  try {
    const { supabase, user, project, research } = await getContext(projectId);

    const { data: planRow } = await supabase
      .from("plans")
      .select("target_persona, key_message, card_outline")
      .eq("project_id", projectId)
      .maybeSingle();
    if (!planRow) {
      return { ok: false, error: "기획안이 없습니다." };
    }

    const currentPlan: Plan = {
      target_persona: planRow.target_persona,
      key_message: planRow.key_message,
      card_outline: planRow.card_outline as Plan["card_outline"],
    };

    const { data: cred } = await supabase
      .from("api_credentials")
      .select("planning_model")
      .eq("user_id", user.id)
      .maybeSingle();
    const model =
      cred?.planning_model === "claude-sonnet-4-6"
        ? "claude-sonnet-4-6"
        : "claude-opus-4-7";

    const newCard = await runRegenerateCardOutline({
      userId: user.id,
      projectId: project.id,
      topic: project.topic,
      tone: project.tone,
      research,
      plan: currentPlan,
      targetOrder: order,
      model,
    });

    const nextOutline = currentPlan.card_outline
      .map((c) => (c.order === order ? newCard : c))
      .sort((a, b) => a.order - b.order);

    const nextPlan: Plan = { ...currentPlan, card_outline: nextOutline };

    const { error } = await supabase
      .from("plans")
      .update({
        card_outline: nextOutline as unknown as Json,
        confirmed_at: null,
      })
      .eq("project_id", projectId);
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/new/plan/${projectId}`);
    return { ok: true, plan: nextPlan };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * 기획안 컨펌 → cards 테이블 미리 생성 (없을 때만) → 카피 단계로
 */
export async function confirmPlan(projectId: string): Promise<void> {
  const { supabase, project } = await getContext(projectId);

  const { data: plan } = await supabase
    .from("plans")
    .select("card_outline")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!plan) throw new Error("기획안이 없습니다.");

  const outline = plan.card_outline as Array<{
    order: number;
    role: string;
    summary: string;
  }>;

  // 기존 카드 확인
  const { count: existingCount } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if ((existingCount ?? 0) === 0) {
    const rows = outline.map((c) => ({
      project_id: projectId,
      card_order: c.order,
      role: c.role as
        | "hook"
        | "problem"
        | "solution"
        | "proof"
        | "closing"
        | "detail"
        | "cover",
      headline: "",
      body: "",
    }));
    const { error } = await supabase.from("cards").insert(rows);
    if (error) throw new Error(`카드 초기 생성 실패: ${error.message}`);
  }

  await supabase
    .from("plans")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("project_id", projectId);

  await supabase
    .from("projects")
    .update({ status: "copywriting" })
    .eq("id", project.id);

  redirect(`/new/copy/${projectId}`);
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
