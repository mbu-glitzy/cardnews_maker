import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Row } from "@/types/supabase";
import { ProjectRow } from "./project-row";

type ProjectListItem = Pick<
  Row<"projects">,
  | "id"
  | "topic"
  | "tone"
  | "card_count"
  | "status"
  | "created_at"
  | "published_permalink"
  | "published_at"
>;

export default async function ProjectsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, topic, tone, card_count, status, created_at, published_permalink, published_at"
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .returns<ProjectListItem[]>();

  const rows = projects ?? [];

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">프로젝트</h1>
          <p className="mt-1 text-sm text-text-secondary">
            지금까지 만든 모든 카드뉴스. 진행 중인 항목은 이어서 작업할 수 있습니다.
          </p>
        </div>
        <Link href="/new/topic" className="btn-primary">
          <Sparkles className="h-4 w-4" /> 새 카드뉴스
        </Link>
      </header>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="card divide-y divide-border">
          {rows.map((p) => (
            <ProjectRow key={p.id} project={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <Sparkles className="mb-3 h-8 w-8 text-text-muted" />
      <p className="mb-1 text-sm font-medium text-text-primary">
        아직 만든 카드뉴스가 없습니다
      </p>
      <p className="mb-5 text-xs text-text-secondary">
        토픽 하나 입력하면 5분 안에 첫 카드뉴스가 완성됩니다.
      </p>
      <Link href="/new/topic" className="btn-primary text-xs">
        지금 시작하기
      </Link>
    </div>
  );
}
