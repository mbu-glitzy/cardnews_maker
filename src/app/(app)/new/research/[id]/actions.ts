"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runResearch, type Research } from "@/lib/ai/research";

export type ResearchActionResult =
  | { ok: true; research: Research }
  | { ok: false; error: string };

async function getProjectForUser(projectId: string) {
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

export async function generateResearch(
  projectId: string
): Promise<ResearchActionResult> {
  try {
    const { supabase, user, project } = await getProjectForUser(projectId);

    const { data: cred } = await supabase
      .from("api_credentials")
      .select("research_model")
      .eq("user_id", user.id)
      .maybeSingle();
    const model =
      cred?.research_model === "claude-sonnet-4-6"
        ? "claude-sonnet-4-6"
        : "claude-opus-4-7";

    const research = await runResearch({
      userId: user.id,
      projectId: project.id,
      topic: project.topic,
      tone: project.tone,
      model,
    });

    // upsert (재생성 케이스 포함)
    const { error } = await supabase
      .from("research_reports")
      .upsert(
        {
          project_id: project.id,
          content: research,
          confirmed_at: null,
        },
        { onConflict: "project_id" }
      );

    if (error) {
      console.error("[research] 저장 실패", error);
      return { ok: false, error: error.message };
    }

    revalidatePath(`/new/research/${projectId}`);
    return { ok: true, research };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function confirmResearch(projectId: string): Promise<void> {
  const { supabase, project } = await getProjectForUser(projectId);

  await supabase
    .from("research_reports")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("project_id", project.id);

  await supabase
    .from("projects")
    .update({ status: "planning" })
    .eq("id", project.id);

  redirect(`/new/plan/${projectId}`);
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
