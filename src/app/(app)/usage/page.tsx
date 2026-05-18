import Link from "next/link";
import { AlertTriangle, TrendingUp, Hash, Coins } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  aggregateByModel,
  aggregateByOperation,
  aggregateByProject,
  aggregateDaily,
  getMonthlyBudget,
  getUsageRows,
} from "@/lib/usage";
import {
  IMAGE_MODEL_PRICING,
  TEXT_MODEL_PRICING,
  formatUSD,
  type ImageModelId,
  type TextModelId,
} from "@/lib/pricing";
import { UsageChart } from "./usage-chart";

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const range = (sp.range as "7d" | "30d" | "month") ?? "month";
  const { fromIso, toIso, label } = resolveRange(range);

  const [rows, budget] = await Promise.all([
    getUsageRows(userId, fromIso, toIso),
    getMonthlyBudget(userId),
  ]);

  const byModel = aggregateByModel(rows);
  const byOperation = aggregateByOperation(rows);
  const daily = aggregateDaily(rows);
  const byProject = await aggregateByProject(userId, rows);

  const totalCost = rows.reduce((sum, r) => sum + Number(r.cost_usd), 0);
  const totalCalls = rows.length;
  const totalImages = rows.reduce((s, r) => s + (r.image_count ?? 0), 0);
  const totalTokens = rows.reduce(
    (s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0),
    0
  );

  const budgetPct = budget && budget > 0 ? (totalCost / budget) * 100 : null;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">AI 사용량</h1>
        <p className="mt-1 text-sm text-text-secondary">
          모델별 호출량 · 비용 · 일별 추이를 확인합니다.
        </p>
      </header>

      {/* 기간 필터 */}
      <div className="mb-6 flex items-center gap-2">
        <RangeButton range="7d" current={range} label="최근 7일" />
        <RangeButton range="30d" current={range} label="최근 30일" />
        <RangeButton range="month" current={range} label="이번 달" />
        <span className="ml-2 text-xs text-text-muted">{label}</span>
      </div>

      {/* 예산 경고 */}
      {budgetPct !== null && budgetPct >= 80 && (
        <div
          className={`mb-6 flex items-start gap-2 rounded-md border px-4 py-3 text-sm ${
            budgetPct >= 100
              ? "border-red-500/30 bg-red-500/10 text-red-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-400"
          }`}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">
              {budgetPct >= 100 ? "월 예산 초과" : "월 예산 80% 도달"}
            </p>
            <p className="mt-0.5 text-xs">
              현재 {formatUSD(totalCost)} / 한도 {formatUSD(budget!)} (
              {budgetPct.toFixed(0)}%)
            </p>
          </div>
          <Link
            href="/settings"
            className="text-xs underline hover:no-underline"
          >
            예산 조정
          </Link>
        </div>
      )}

      {/* 요약 카드 */}
      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          icon={Coins}
          title="총 비용"
          value={formatUSD(totalCost)}
          hint={
            budget ? `예산 ${formatUSD(budget)} 중 ${(budgetPct ?? 0).toFixed(0)}%` : "예산 미설정"
          }
        />
        <Stat
          icon={TrendingUp}
          title="호출 수"
          value={`${totalCalls.toLocaleString("ko-KR")}회`}
        />
        <Stat
          icon={Hash}
          title="이미지 생성"
          value={`${totalImages.toLocaleString("ko-KR")}장`}
        />
        <Stat
          icon={Hash}
          title="토큰 사용"
          value={`${(totalTokens / 1000).toFixed(1)}K`}
          hint="입력 + 출력"
        />
      </section>

      {/* 일별 추이 차트 */}
      <section className="card mb-6 p-5">
        <h2 className="mb-3 text-sm font-semibold">일별 비용 추이</h2>
        {daily.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            아직 사용량이 없습니다.
          </p>
        ) : (
          <UsageChart data={daily} />
        )}
      </section>

      {/* 단계별 모델 매핑 */}
      <section className="card mb-6 overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">단계별 모델 매핑</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            각 워크플로우 단계에서 실제로 호출된 모델 · 호출 수 · 비용.
          </p>
        </div>
        {byOperation.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-muted">
            기록 없음
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {byOperation.map((op) => (
              <li key={op.operation} className="px-5 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${operationColor(op.operation)}`}>
                      {operationLabel(op.operation)}
                    </span>
                    <span className="text-xs text-text-muted">
                      {op.totalCalls}회
                    </span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {formatUSD(op.totalCostUSD)}
                  </span>
                </div>
                <div className="space-y-1">
                  {op.models.map((m) => (
                    <div
                      key={m.model}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-text-primary">
                          {labelOfModel(m.model)}
                        </span>
                        <span className="ml-2 font-mono text-text-muted">
                          {m.model}
                        </span>
                      </div>
                      <span className="text-text-secondary">{m.calls}회</span>
                      <span className="w-20 text-right font-medium tabular-nums">
                        {formatUSD(m.costUSD)}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 모델별 표 */}
      <section className="card mb-6 overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">모델별 집계</h2>
        </div>
        {byModel.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-muted">
            사용 기록 없음
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-bg-elevated/50 text-xs text-text-secondary">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">모델</th>
                  <th className="px-3 py-2.5 text-right font-medium">호출</th>
                  <th className="px-3 py-2.5 text-right font-medium">입력 토큰</th>
                  <th className="px-3 py-2.5 text-right font-medium">출력 토큰</th>
                  <th className="px-3 py-2.5 text-right font-medium">이미지</th>
                  <th className="px-5 py-2.5 text-right font-medium">비용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {byModel.map((m) => (
                  <tr key={m.model}>
                    <td className="px-5 py-2.5">
                      <div className="font-medium">{labelOfModel(m.model)}</div>
                      <div className="text-xs text-text-muted">{m.model}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {m.calls.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">
                      {m.inputTokens > 0 ? m.inputTokens.toLocaleString("ko-KR") : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">
                      {m.outputTokens > 0 ? m.outputTokens.toLocaleString("ko-KR") : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">
                      {m.imageCount > 0 ? m.imageCount : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                      {formatUSD(m.costUSD)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-bg-elevated/30">
                  <td className="px-5 py-2.5 text-xs font-medium text-text-secondary">
                    합계
                  </td>
                  <td colSpan={4} />
                  <td className="px-5 py-2.5 text-right font-bold tabular-nums">
                    {formatUSD(totalCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 프로젝트별 비용 */}
      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">프로젝트별 비용</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            평균 1편: {byProject.length > 0
              ? formatUSD(
                  byProject.reduce((s, p) => s + p.costUSD, 0) /
                    byProject.length
                )
              : "—"}
          </p>
        </div>
        {byProject.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-muted">
            아직 사용된 프로젝트가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {byProject.slice(0, 20).map((p) => (
              <li key={p.projectId} className="flex items-center gap-3 px-5 py-3">
                <Link
                  href={`/projects/${p.projectId}`}
                  className="min-w-0 flex-1 truncate text-sm text-text-primary hover:text-accent"
                >
                  {p.topic}
                </Link>
                <span className="text-xs text-text-muted">{p.calls}회</span>
                <span className="w-20 text-right font-medium tabular-nums text-sm">
                  {formatUSD(p.costUSD)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RangeButton({
  range,
  current,
  label,
}: {
  range: string;
  current: string;
  label: string;
}) {
  const active = range === current;
  return (
    <Link
      href={`/usage?range=${range}`}
      className={`rounded-md px-3 py-1.5 text-xs ${
        active
          ? "bg-bg-elevated text-text-primary"
          : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
      }`}
    >
      {label}
    </Link>
  );
}

function Stat({
  icon: Icon,
  title,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">{title}</span>
        <Icon className="h-4 w-4 text-text-muted" />
      </div>
      <p className="text-xl font-bold text-text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

const OPERATION_LABELS: Record<string, string> = {
  research: "1. 리서치",
  plan: "2. 기획",
  copy: "3. 카피",
  image: "4. 이미지 (프롬프트+생성)",
  metadata: "5. 캡션·해시태그",
  misc: "기타",
};

const OPERATION_COLORS: Record<string, string> = {
  research: "bg-sky-500/15 text-sky-400",
  plan: "bg-violet-500/15 text-violet-400",
  copy: "bg-amber-500/15 text-amber-400",
  image: "bg-pink-500/15 text-pink-400",
  metadata: "bg-emerald-500/15 text-emerald-400",
  misc: "bg-bg-elevated text-text-secondary",
};

function operationLabel(op: string): string {
  return OPERATION_LABELS[op] ?? op;
}
function operationColor(op: string): string {
  return OPERATION_COLORS[op] ?? OPERATION_COLORS.misc;
}

function labelOfModel(model: string): string {
  if (model in TEXT_MODEL_PRICING) {
    return TEXT_MODEL_PRICING[model as TextModelId].label;
  }
  if (model in IMAGE_MODEL_PRICING) {
    return IMAGE_MODEL_PRICING[model as ImageModelId].label;
  }
  return model;
}

function resolveRange(range: "7d" | "30d" | "month"): {
  fromIso: string;
  toIso?: string;
  label: string;
} {
  const now = new Date();
  if (range === "7d") {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { fromIso: from.toISOString(), label: `${formatYmd(from)} ~ 현재` };
  }
  if (range === "30d") {
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { fromIso: from.toISOString(), label: `${formatYmd(from)} ~ 현재` };
  }
  // month
  const from = new Date();
  from.setUTCDate(1);
  from.setUTCHours(0, 0, 0, 0);
  return {
    fromIso: from.toISOString(),
    label: `${now.getFullYear()}년 ${now.getMonth() + 1}월`,
  };
}

function formatYmd(d: Date) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
