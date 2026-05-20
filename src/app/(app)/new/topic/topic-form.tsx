"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, Star } from "lucide-react";
import { createProject } from "./actions";

const TONES = [
  { value: "informative", label: "정보형", desc: "팩트·통계·해법" },
  { value: "issue", label: "이슈/시사", desc: "사건·현황·시사점" },
  { value: "emotional", label: "감성형", desc: "스토리·공감·여운" },
  { value: "humorous", label: "유머", desc: "가볍고 위트있게" },
  { value: "sophisticated", label: "세련", desc: "프리미엄 톤" },
];

type Brand = { id: string; name: string; is_default: boolean };

export function TopicForm({
  brands,
  defaultTone,
  defaultCardCount,
}: {
  brands: Brand[];
  defaultTone: string;
  defaultCardCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState(defaultTone);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createProject(formData);
      if (res && "ok" in res && !res.ok) {
        setError(res.error);
      }
      // ok 경우는 server action 내부에서 redirect
    });
  }

  const defaultBrand = brands.find((b) => b.is_default);

  return (
    <form action={handleSubmit} className="space-y-6">
      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">토픽</h2>
        </div>
        <div className="px-5 py-5">
          <textarea
            name="topic"
            required
            minLength={2}
            maxLength={200}
            rows={3}
            placeholder="예: 2026년 SaaS 마케팅에서 효과적인 CTA 전략 5가지"
            className="input resize-none"
            autoFocus
          />
          <p className="mt-2 text-xs text-text-muted">
            구체적일수록 정확한 리서치 결과를 얻습니다. (2~200자)
          </p>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">톤</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 px-5 py-5 sm:grid-cols-3 lg:grid-cols-5">
          {TONES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setTone(t.value)}
              className={`rounded-md border px-3 py-3 text-left text-xs transition-colors ${
                tone === t.value
                  ? "border-accent bg-accent/10 text-text-primary"
                  : "border-border bg-bg-surface text-text-secondary hover:border-border-strong"
              }`}
            >
              <p className="font-medium">{t.label}</p>
              <p className="mt-0.5 text-text-muted">{t.desc}</p>
            </button>
          ))}
          <input type="hidden" name="tone" value={tone} />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">카드 수 · 브랜드</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 px-5 py-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="card_count">카드 수</label>
            <select
              id="card_count"
              name="card_count"
              defaultValue={String(defaultCardCount)}
              className="input"
            >
              {[5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n}장</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="brand_profile_id">브랜드 프로파일</label>
            <select
              id="brand_profile_id"
              name="brand_profile_id"
              defaultValue={defaultBrand?.id ?? ""}
              className="input"
            >
              <option value="">선택 안 함</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.is_default ? "★ 기본" : ""}
                </option>
              ))}
            </select>
            {brands.length === 0 && (
              <p className="mt-1 text-xs text-text-muted">
                브랜드 메뉴에서 프로파일을 먼저 등록하면 자동 적용됩니다.
              </p>
            )}
            {defaultBrand && (
              <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                <Star className="h-3 w-3 fill-current text-accent" />
                기본 프로파일이 자동 선택됨
              </p>
            )}
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-end">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> 리서치 시작 중...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> 리서치 시작
            </>
          )}
        </button>
      </div>
    </form>
  );
}
