"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Newspaper,
  Microscope,
  Globe,
} from "lucide-react";
import {
  confirmResearch,
  generateResearch,
} from "./actions";
import type { Research } from "@/lib/ai/research";

const CRED_META = {
  official: { label: "공식", Icon: ShieldCheck, color: "text-emerald-400" },
  news: { label: "언론", Icon: Newspaper, color: "text-sky-400" },
  research: { label: "리서치", Icon: Microscope, color: "text-violet-400" },
  blog: { label: "블로그", Icon: Globe, color: "text-text-secondary" },
  etc: { label: "기타", Icon: Globe, color: "text-text-muted" },
} as const;

export function ResearchPanel({
  projectId,
  initial,
  confirmed,
}: {
  projectId: string;
  initial: Research | null;
  confirmed: boolean;
}) {
  const [research, setResearch] = useState<Research | null>(initial);
  const [generating, startGenerate] = useTransition();
  const [confirming, startConfirm] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startGenerate(async () => {
      const res = await generateResearch(projectId);
      if (res.ok) setResearch(res.research);
      else setError(res.error);
    });
  }

  function handleConfirm() {
    startConfirm(async () => {
      await confirmResearch(projectId);
    });
  }

  if (!research) {
    return (
      <div className="card flex flex-col items-center px-6 py-16 text-center">
        <Sparkles className="mb-3 h-8 w-8 text-accent" />
        <p className="mb-1 text-sm font-medium">웹 리서치를 시작합니다</p>
        <p className="mb-5 text-xs text-text-secondary">
          Claude Opus 4.7 + 웹 검색으로 신뢰할 만한 출처를 모읍니다.
          <br />
          보통 30~60초 소요됩니다.
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
              <Loader2 className="h-4 w-4 animate-spin" /> 리서치 진행 중...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> 리서치 시작
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="card p-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          요약
        </h2>
        <p className="text-sm leading-relaxed text-text-primary">
          {research.summary}
        </p>
      </section>

      {/* Facts */}
      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">
            핵심 사실 ({research.facts.length}개)
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {research.facts.map((fact, i) => (
            <li key={i} className="px-5 py-4">
              <p className="text-sm leading-relaxed text-text-primary">
                {fact.text}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {fact.source_ids.map((sid) => {
                  const src = research.sources.find((s) => s.id === sid);
                  return (
                    <span
                      key={sid}
                      className="rounded bg-bg-elevated px-1.5 py-0.5 text-xs text-text-secondary"
                      title={src?.title}
                    >
                      [{sid}]
                    </span>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Sources */}
      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">
            출처 ({research.sources.length}개)
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {research.sources.map((src) => {
            const meta = CRED_META[src.credibility] ?? CRED_META.etc;
            const Icon = meta.Icon;
            return (
              <li key={src.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 text-xs font-mono text-text-muted">
                  [{src.id}]
                </span>
                <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${meta.color}`} />
                <div className="min-w-0 flex-1">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-text-primary hover:text-accent"
                  >
                    <span className="truncate">{src.title}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 text-text-muted" />
                  </a>
                  <p className="truncate text-xs text-text-muted">{src.url}</p>
                </div>
                <span className={`text-xs ${meta.color}`}>{meta.label}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Actions */}
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
          재생성
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
              {confirmed ? "기획 단계로" : "컨펌하고 기획"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
