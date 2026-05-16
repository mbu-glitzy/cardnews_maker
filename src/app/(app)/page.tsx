import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  FolderOpen,
  Palette,
  ArrowRight,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMonthlyCostUSD } from "@/lib/usage";
import { formatUSD } from "@/lib/pricing";
import type { Row } from "@/types/supabase";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  getResumeUrl,
} from "@/lib/project-flow";

type ProjectSummary = Pick<
  Row<"projects">,
  "id" | "topic" | "status" | "created_at" | "card_count"
>;

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const [
    monthlyCost,
    { data: recentProjects },
    monthlyProjectCount,
    { count: brandCount },
  ] = await Promise.all([
    getMonthlyCostUSD(userId),
    supabase
      .from("projects")
      .select("id, topic, status, created_at, card_count")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<ProjectSummary[]>(),
    countThisMonth(supabase, userId),
    supabase
      .from("brand_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="mt-1 text-sm text-text-secondary">
            카드뉴스 메이커에 오신 걸 환영합니다.
          </p>
        </div>
        <Link href="/new/topic" className="btn-primary">
          <Sparkles className="h-4 w-4" />
          <span>새 카드뉴스 만들기</span>
        </Link>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="이번 달 비용"
          value={formatUSD(monthlyCost)}
          icon={TrendingUp}
          hint="모든 AI 모델 합산"
        />
        <StatCard
          title="이번 달 제작"
          value={`${monthlyProjectCount}건`}
          icon={FolderOpen}
        />
        <StatCard
          title="브랜드 프로파일"
          value={`${brandCount ?? 0}개`}
          icon={Palette}
          link={{ href: "/brands", label: "관리하기" }}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">최근 프로젝트</h2>
          {(recentProjects?.length ?? 0) > 0 && (
            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
            >
              전체보기 <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {(recentProjects?.length ?? 0) === 0 ? (
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
        ) : (
          <ul className="card divide-y divide-border">
            {recentProjects!.map((p) => {
              const inProgress = p.status !== "completed";
              const href = inProgress
                ? getResumeUrl(p.id, p.status)
                : `/projects/${p.id}`;
              return (
                <li key={p.id}>
                  <Link
                    href={href}
                    className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-bg-elevated"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] ${STATUS_COLORS[p.status]}`}
                        >
                          {STATUS_LABELS[p.status]}
                        </span>
                        <span className="text-xs text-text-muted">
                          {p.card_count}장
                        </span>
                      </div>
                      <p className="truncate text-sm font-medium text-text-primary">
                        {p.topic}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatDate(p.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                      {inProgress && (
                        <span className="hidden text-accent sm:inline">
                          이어가기
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  link,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">{title}</span>
        <Icon className="h-4 w-4 text-text-muted" />
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      {link && (
        <Link
          href={link.href}
          className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
        >
          {link.label} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

async function countThisMonth(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());
  return count ?? 0;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
