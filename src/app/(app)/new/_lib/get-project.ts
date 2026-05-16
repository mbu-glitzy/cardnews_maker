import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Row } from "@/types/supabase";

/**
 * 위저드 단계 페이지 공통: 프로젝트 소유권 확인 + 데이터 반환.
 * 본인 프로젝트가 아니거나 존재하지 않으면 404.
 */
export async function getProjectOrNotFound(
  id: string
): Promise<Row<"projects">> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!data) notFound();
  return data;
}
