import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ExternalLink,
  Search,
  Target,
  Type,
  Image as ImageIcon,
  Check,
  Calendar,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Row, Json } from "@/types/supabase";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  getResumeUrl,
} from "@/lib/project-flow";
import { DeleteProjectButton } from "./delete-button";

type ProjectFull = Row<"projects">;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .maybeSingle<ProjectFull>();
  if (!project) notFound();

  const [research, plan, cards] = await Promise.all([
    supabase
      .from("research_reports")
      .select("confirmed_at, created_at")
      .eq("project_id", id)
      .maybeSingle(),
    supabase
      .from("plans")
      .select("confirmed_at, target_persona, key_message, card_outline")
      .eq("project_id", id)
      .maybeSingle(),
    supabase
      .from("cards")
      .select("order:card_order, role, headline, body, image_url, rendered_url")
      .eq("project_id", id)
      .order("card_order", { ascending: true })
      .returns<
        Array<{
          order: number;
          role: string;
          headline: string;
          body: string;
          image_url: string | null;
          rendered_url: string | null;
        }>
      >(),
  ]);

  const resumeUrl = getResumeUrl(project.id, project.status);
  const statusColor = STATUS_COLORS[project.status];
  const statusLabel = STATUS_LABELS[project.status];
  const isFinished = project.status === "completed";

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
      >
        ← 프로젝트 목록
      </Link>

      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-xs ${statusColor}`}>
              {statusLabel}
            </span>
            <span className="text-xs text-text-muted">
              {project.card_count}장 · {project.tone}
            </span>
            <span className="text-xs text-text-muted">
              {new Date(project.created_at).toLocaleString("ko-KR")}
            </span>
          </div>
          <h1 className="text-2xl font-bold leading-tight">{project.topic}</h1>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {!isFinished && (
            <Link href={resumeUrl} className="btn-primary text-xs">
              이어가기 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <DeleteProjectButton projectId={project.id} topic={project.topic} />
        </div>
      </header>

      {/* 발행 결과 */}
      {project.published_permalink && (
        <section className="card mb-6 flex items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-400">✓ 인스타 발행 완료</p>
            <p className="truncate text-xs text-text-muted">
              {project.published_permalink}
            </p>
            {project.published_at && (
              <p className="text-xs text-text-muted">
                {new Date(project.published_at).toLocaleString("ko-KR")}
              </p>
            )}
          </div>
          <a
            href={project.published_permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" /> 인스타에서 보기
          </a>
        </section>
      )}

      {/* 단계별 진행 상황 */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">단계별 진행 상황</h2>
        <ol className="card divide-y divide-border overflow-hidden">
          <StageRow
            icon={Search}
            title="리서치"
            done={!!research.data?.confirmed_at}
            timestamp={research.data?.confirmed_at ?? research.data?.created_at}
            link={`/new/research/${project.id}`}
          />
          <StageRow
            icon={Target}
            title="기획"
            done={!!plan.data?.confirmed_at}
            timestamp={plan.data?.confirmed_at}
            link={`/new/plan/${project.id}`}
            meta={plan.data?.key_message ?? undefined}
          />
          <StageRow
            icon={Type}
            title="카피"
            done={
              (cards.data?.length ?? 0) > 0 &&
              cards.data!.every((c) => c.headline && c.body)
            }
            link={`/new/copy/${project.id}`}
            meta={
              cards.data && cards.data.length > 0
                ? `${cards.data.filter((c) => c.headline).length} / ${cards.data.length} 작성됨`
                : undefined
            }
          />
          <StageRow
            icon={ImageIcon}
            title="디자인"
            done={
              (cards.data?.length ?? 0) > 0 &&
              cards.data!.every((c) => !!c.image_url)
            }
            link={`/new/design/${project.id}`}
            meta={
              cards.data && cards.data.length > 0
                ? `${cards.data.filter((c) => c.image_url).length} / ${cards.data.length} 이미지`
                : undefined
            }
          />
        </ol>
      </section>

      {/* 기획안 요약 */}
      {plan.data && (
        <section className="card mb-6 overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">기획안 요약</h2>
          </div>
          <div className="space-y-3 px-5 py-4">
            {plan.data.target_persona && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  타겟
                </p>
                <p className="mt-1 text-sm text-text-primary">
                  {plan.data.target_persona}
                </p>
              </div>
            )}
            {plan.data.key_message && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  핵심 메시지
                </p>
                <p className="mt-1 text-sm font-medium text-text-primary">
                  {plan.data.key_message}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 카드 미리보기 (생성된 것만) */}
      {cards.data && cards.data.some((c) => c.image_url) && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">카드 미리보기</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {cards.data.map((c) => (
              <CardThumb key={c.order} card={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StageRow({
  icon: Icon,
  title,
  done,
  link,
  meta,
  timestamp,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  done: boolean;
  link: string;
  meta?: string;
  timestamp?: string | null;
}) {
  return (
    <li>
      <Link
        href={link}
        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-bg-elevated"
      >
        <span
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
            done
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-bg-elevated text-text-muted"
          }`}
        >
          {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text-primary">{title}</p>
          {meta && <p className="truncate text-xs text-text-muted">{meta}</p>}
        </div>
        {timestamp && (
          <span className="hidden flex-shrink-0 items-center gap-1 text-xs text-text-muted sm:flex">
            <Calendar className="h-3 w-3" />
            {new Date(timestamp).toLocaleDateString("ko-KR")}
          </span>
        )}
        <ArrowRight className="h-4 w-4 flex-shrink-0 text-text-muted" />
      </Link>
    </li>
  );
}

function CardThumb({
  card,
}: {
  card: { order: number; image_url: string | null; headline: string };
}) {
  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-square w-full bg-bg-elevated">
        {card.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image_url}
            alt={`카드 ${card.order}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-5 w-5 text-text-muted" />
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-xs font-bold text-white backdrop-blur">
          {card.order}
        </span>
      </div>
      <p className="line-clamp-2 px-2 py-1.5 text-xs text-text-secondary">
        {card.headline || "—"}
      </p>
    </div>
  );
}
