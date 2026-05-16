"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  ArrowRight,
  Check,
} from "lucide-react";
import {
  confirmCopy,
  generateAllCopy,
  regenerateOneCard,
  saveCardEdit,
} from "./actions";

type Card = {
  order: number;
  role: string;
  headline: string;
  body: string;
  cta: string | null;
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  hook: { label: "후킹", color: "bg-amber-500/15 text-amber-400" },
  cover: { label: "커버", color: "bg-amber-500/15 text-amber-400" },
  problem: { label: "문제", color: "bg-red-500/15 text-red-400" },
  solution: { label: "해법", color: "bg-emerald-500/15 text-emerald-400" },
  proof: { label: "근거", color: "bg-sky-500/15 text-sky-400" },
  detail: { label: "디테일", color: "bg-violet-500/15 text-violet-400" },
  cta: { label: "CTA", color: "bg-accent/15 text-accent" },
};

export function CopyPanel({
  projectId,
  cards: initial,
}: {
  projectId: string;
  cards: Card[];
}) {
  const [cards, setCards] = useState<Card[]>(initial);
  const [generating, startGenerate] = useTransition();
  const [confirming, startConfirm] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allEmpty = cards.every((c) => !c.headline && !c.body);
  const allFilled = cards.every((c) => c.headline && c.body);

  function handleGenerateAll() {
    setError(null);
    startGenerate(async () => {
      const res = await generateAllCopy(projectId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCards((prev) =>
        prev.map((c) => {
          const updated = res.cards.find((rc) => rc.order === c.order);
          if (!updated) return c;
          return {
            ...c,
            headline: updated.headline,
            body: updated.body,
            cta: updated.cta ?? null,
          };
        })
      );
    });
  }

  function handleConfirm() {
    setError(null);
    startConfirm(async () => {
      try {
        await confirmCopy(projectId);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  if (allEmpty) {
    return (
      <div className="card flex flex-col items-center px-6 py-16 text-center">
        <Sparkles className="mb-3 h-8 w-8 text-accent" />
        <p className="mb-1 text-sm font-medium">
          {cards.length}장의 카드 카피를 생성합니다
        </p>
        <p className="mb-5 text-xs text-text-secondary">
          Claude Sonnet 4.6 으로 헤드라인 · 본문 · CTA 를 한 번에 생성합니다.
          <br />
          보통 15~25초 소요됩니다.
        </p>
        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
        <button
          type="button"
          onClick={handleGenerateAll}
          disabled={generating}
          className="btn-primary"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> 생성 중...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> 카피 생성
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <CardEditor
            key={c.order}
            projectId={projectId}
            card={c}
            onChange={(updated) =>
              setCards((prev) =>
                prev.map((p) => (p.order === updated.order ? updated : p))
              )
            }
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleGenerateAll}
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
          disabled={generating || confirming || !allFilled}
          className="btn-primary"
        >
          {confirming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> 이동 중...
            </>
          ) : (
            <>
              디자인 단계로
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function CardEditor({
  projectId,
  card,
  onChange,
}: {
  projectId: string;
  card: Card;
  onChange: (c: Card) => void;
}) {
  const [headline, setHeadline] = useState(card.headline);
  const [body, setBody] = useState(card.body);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [regenerating, startRegen] = useTransition();

  const meta = ROLE_LABELS[card.role] ?? {
    label: card.role,
    color: "bg-bg-elevated text-text-secondary",
  };

  async function handleSave() {
    setSaving("saving");
    const res = await saveCardEdit(projectId, card.order, headline, body, null);
    if (res.ok) {
      setSaving("saved");
      setDirty(false);
      onChange({ ...card, headline, body, cta: null });
      setTimeout(() => setSaving("idle"), 1500);
    } else {
      setSaving("error");
    }
  }

  function handleRegenerate() {
    startRegen(async () => {
      const res = await regenerateOneCard(projectId, card.order);
      if (res.ok && res.cards[0]) {
        const updated = res.cards[0];
        setHeadline(updated.headline);
        setBody(updated.body);
        setDirty(false);
        onChange({
          ...card,
          headline: updated.headline,
          body: updated.body,
          cta: null,
        });
      }
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-bg-elevated/50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-elevated text-xs font-bold">
            {card.order}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-xs ${meta.color}`}>
            {meta.label}
          </span>
        </div>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="btn-ghost text-xs"
          title="이 카드만 재생성"
        >
          {regenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div>
          <label className="label text-xs">헤드라인</label>
          <input
            value={headline}
            onChange={(e) => {
              setHeadline(e.target.value);
              setDirty(true);
              setSaving("idle");
            }}
            className="input text-sm"
            maxLength={50}
          />
        </div>
        <div>
          <label className="label text-xs">본문</label>
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setDirty(true);
              setSaving("idle");
            }}
            rows={3}
            className="input resize-none text-sm"
            maxLength={200}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          {saving === "saved" && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check className="h-3 w-3" /> 저장됨
            </span>
          )}
          {saving === "error" && (
            <span className="text-xs text-red-400">저장 실패</span>
          )}
          {dirty && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving === "saving"}
              className="btn-secondary text-xs"
            >
              {saving === "saving" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "수정 저장"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
