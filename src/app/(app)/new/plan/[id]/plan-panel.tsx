"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  ArrowRight,
  Target,
  MessageSquare,
} from "lucide-react";
import {
  confirmPlan,
  generatePlan,
  regenerateCardOutline,
} from "./actions";
import type { Plan } from "@/lib/ai/planning";

type OutlineItem = Plan["card_outline"][number];

function PlanCardRow({
  projectId,
  card,
  disabled,
  onUpdate,
}: {
  projectId: string;
  card: OutlineItem;
  disabled: boolean;
  onUpdate: (next: OutlineItem) => void;
}) {
  const [regen, setRegen] = useState(false);
  const meta = ROLE_LABELS[card.role] ?? {
    label: card.role,
    color: "bg-bg-elevated text-text-secondary",
  };

  async function handleRegenerate() {
    setRegen(true);
    try {
      const res = await regenerateCardOutline(projectId, card.order);
      if (res.ok) {
        const next = res.plan.card_outline.find((c) => c.order === card.order);
        if (next) onUpdate(next);
      }
    } finally {
      setRegen(false);
    }
  }

  return (
    <li className="flex items-start gap-3 px-5 py-4">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated text-xs font-bold">
        {card.order}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-xs ${meta.color}`}>
            {meta.label}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-text-primary">
          {card.summary}
        </p>
      </div>
      <button
        type="button"
        onClick={handleRegenerate}
        disabled={disabled || regen}
        className="btn-ghost text-xs"
        title="이 카드만 재생성"
      >
        {regen ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
      </button>
    </li>
  );
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  hook: { label: "후킹", color: "bg-amber-500/15 text-amber-400" },
  cover: { label: "커버", color: "bg-amber-500/15 text-amber-400" },
  problem: { label: "문제", color: "bg-red-500/15 text-red-400" },
  solution: { label: "해법", color: "bg-emerald-500/15 text-emerald-400" },
  proof: { label: "근거", color: "bg-sky-500/15 text-sky-400" },
  detail: { label: "디테일", color: "bg-violet-500/15 text-violet-400" },
  cta: { label: "CTA", color: "bg-accent/15 text-accent" },
};

export function PlanPanel({
  projectId,
  cardCount,
  initial,
  confirmed,
}: {
  projectId: string;
  cardCount: number;
  initial: Plan | null;
  confirmed: boolean;
}) {
  const [plan, setPlan] = useState<Plan | null>(initial);
  const [generating, startGenerate] = useTransition();
  const [confirming, startConfirm] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startGenerate(async () => {
      const res = await generatePlan(projectId);
      if (res.ok) setPlan(res.plan);
      else setError(res.error);
    });
  }

  function handleConfirm() {
    startConfirm(async () => {
      await confirmPlan(projectId);
    });
  }

  if (!plan) {
    return (
      <div className="card flex flex-col items-center px-6 py-16 text-center">
        <Sparkles className="mb-3 h-8 w-8 text-accent" />
        <p className="mb-1 text-sm font-medium">기획안을 생성합니다</p>
        <p className="mb-5 text-xs text-text-secondary">
          리서치 결과를 바탕으로 {cardCount}장의 카드 구성을 설계합니다.
          <br />
          보통 15~30초 소요됩니다.
        </p>
        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> 기획 진행 중...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> 기획 시작
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          <Target className="h-3.5 w-3.5" /> 타겟
        </div>
        <p className="text-sm leading-relaxed text-text-primary">
          {plan.target_persona}
        </p>
      </section>

      <section className="card p-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          <MessageSquare className="h-3.5 w-3.5" /> 핵심 메시지
        </div>
        <p className="text-base font-medium leading-snug text-text-primary">
          {plan.key_message}
        </p>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">
            카드 구성 ({plan.card_outline.length}장)
          </h2>
        </div>
        <ol className="divide-y divide-border">
          {plan.card_outline.map((card) => (
            <PlanCardRow
              key={card.order}
              projectId={projectId}
              card={card}
              disabled={generating || confirming}
              onUpdate={(updated) =>
                setPlan((prev) =>
                  prev
                    ? {
                        ...prev,
                        card_outline: prev.card_outline
                          .map((c) => (c.order === updated.order ? updated : c))
                          .sort((a, b) => a.order - b.order),
                      }
                    : prev
                )
              }
            />
          ))}
        </ol>
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || confirming}
          className="btn-secondary text-xs"
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          전체 재생성
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={generating || confirming}
          className="btn-primary"
        >
          {confirming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> 이동 중...
            </>
          ) : (
            <>
              {confirmed ? "카피 단계로" : "컨펌하고 카피"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
