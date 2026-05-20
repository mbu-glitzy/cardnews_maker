"use client";

import { useState, useTransition } from "react";
import { Check, CircleAlert, Loader2, ShieldCheck } from "lucide-react";
import {
  saveSettings,
  testAnthropic,
  testGoogleAi,
  testOpenAi,
  type TestResult,
} from "./actions";

type Initial = {
  anthropic_masked: string | null;
  google_ai_masked: string | null;
  openai_masked: string | null;
  monthly_budget_usd: number | null;
  default_engine: string;
  default_tone: string;
  default_card_count: number;
  research_model: string;
  planning_model: string;
};

export function SettingsForm({ initial }: { initial: Initial }) {
  const [saving, startSaving] = useTransition();
  const [saveResult, setSaveResult] = useState<
    { ok: boolean; msg: string } | null
  >(null);

  // 입력값 (변경된 키만 저장 대상)
  const [anthropic, setAnthropic] = useState("");
  const [googleAi, setGoogleAi] = useState("");
  const [openai, setOpenai] = useState("");

  function handleSubmit(formData: FormData) {
    setSaveResult(null);
    startSaving(async () => {
      const res = await saveSettings(formData);
      setSaveResult({
        ok: res.ok,
        msg: res.ok ? res.message : res.error,
      });
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* AI API 키 */}
      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">AI API 키</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            저장 시 자동 암호화됩니다. 변경하려면 새 키를 입력하세요.
          </p>
        </div>
        <div className="divide-y divide-border">
          <KeyRow
            name="anthropic_key"
            label="Anthropic (Claude)"
            placeholder="sk-ant-api03-..."
            masked={initial.anthropic_masked}
            value={anthropic}
            onChange={setAnthropic}
            onTest={() => testAnthropic(anthropic)}
            testDisabled={anthropic.trim().length === 0}
          />
          <KeyRow
            name="google_ai_key"
            label="Google AI (Nano Banana Pro)"
            placeholder="AIzaSy..."
            masked={initial.google_ai_masked}
            value={googleAi}
            onChange={setGoogleAi}
            onTest={() => testGoogleAi(googleAi)}
            testDisabled={googleAi.trim().length === 0}
          />
          <KeyRow
            name="openai_key"
            label="OpenAI (GPT Image 2)"
            placeholder="sk-proj-..."
            masked={initial.openai_masked}
            value={openai}
            onChange={setOpenai}
            onTest={() => testOpenAi(openai)}
            testDisabled={openai.trim().length === 0}
          />
        </div>
      </section>

      {/* 예산 및 디폴트 */}
      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">운영 기본값</h2>
        </div>
        <div className="space-y-5 px-5 py-5">
          <div>
            <label className="label" htmlFor="monthly_budget_usd">
              월 예산 (USD)
            </label>
            <input
              id="monthly_budget_usd"
              name="monthly_budget_usd"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initial.monthly_budget_usd ?? ""}
              placeholder="제한 없음 (비워두면 미설정)"
              className="input"
            />
            <p className="mt-1 text-xs text-text-muted">
              80% 도달 시 경고, 100% 도달 시 사용량 페이지에 배너 표시.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="default_engine">
                기본 이미지 엔진
              </label>
              <select
                id="default_engine"
                name="default_engine"
                defaultValue={initial.default_engine}
                className="input"
              >
                <option value="nano-banana-pro">Nano Banana Pro (권장)</option>
                <option value="gpt-image-2">GPT Image 2</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="default_tone">
                기본 톤
              </label>
              <select
                id="default_tone"
                name="default_tone"
                defaultValue={initial.default_tone}
                className="input"
              >
                <option value="informative">정보형</option>
                <option value="issue">이슈/시사</option>
                <option value="emotional">감성형</option>
                <option value="humorous">유머</option>
                <option value="sophisticated">세련</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="default_card_count">
                기본 카드 수
              </label>
              <select
                id="default_card_count"
                name="default_card_count"
                defaultValue={String(initial.default_card_count)}
                className="input"
              >
                {[5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}장
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* AI 모델 선택 (비용 영향 큼) */}
      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">AI 모델 선택</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            리서치·기획 단계의 모델 선택. <span className="text-amber-400">Opus 4.7은 정교하지만 약 5배 비쌈.</span>{" "}
            카피·이미지 프롬프트는 Sonnet, 캡션은 Haiku 고정.
          </p>
        </div>
        <div className="space-y-4 px-5 py-5">
          <ModelChoice
            name="research_model"
            label="리서치 (web 검색 + 출처 정리)"
            initial={initial.research_model}
            hint="입력 토큰이 크게 늘어나는 단계 — 모델 차이가 비용에 가장 큼"
          />
          <ModelChoice
            name="planning_model"
            label="기획 (타겟·핵심 메시지·카드 구성)"
            initial={initial.planning_model}
            hint="추론 품질이 결과에 직접 반영됨"
          />
        </div>
      </section>

      {/* 저장 */}
      <div className="flex items-center justify-end gap-3">
        {saveResult && (
          <span
            className={`text-sm ${
              saveResult.ok ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {saveResult.msg}
          </span>
        )}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> 저장 중...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" /> 저장
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function ModelChoice({
  name,
  label,
  initial,
  hint,
}: {
  name: string;
  label: string;
  initial: string;
  hint: string;
}) {
  const [value, setValue] = useState(initial);
  const options = [
    {
      value: "claude-opus-4-7",
      title: "Claude Opus 4.7",
      desc: "최고 품질 · 비쌈",
      price: "$15 / $75 per 1M tokens",
    },
    {
      value: "claude-sonnet-4-6",
      title: "Claude Sonnet 4.6",
      desc: "가성비 · 충분히 좋음",
      price: "$3 / $15 per 1M tokens",
    },
  ];

  return (
    <div>
      <label className="label">{label}</label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              type="button"
              key={o.value}
              onClick={() => setValue(o.value)}
              className={`rounded-md border px-3 py-3 text-left text-xs transition-colors ${
                selected
                  ? "border-accent bg-accent/10"
                  : "border-border bg-bg-surface hover:border-border-strong"
              }`}
            >
              <p className="font-medium text-text-primary">{o.title}</p>
              <p className="mt-0.5 text-text-secondary">{o.desc}</p>
              <p className="mt-1 font-mono text-text-muted">{o.price}</p>
            </button>
          );
        })}
      </div>
      <input type="hidden" name={name} value={value} />
      <p className="mt-1 text-xs text-text-muted">{hint}</p>
    </div>
  );
}

function KeyRow({
  name,
  label,
  placeholder,
  masked,
  value,
  onChange,
  onTest,
  testDisabled,
}: {
  name: string;
  label: string;
  placeholder: string;
  masked: string | null;
  value: string;
  onChange: (v: string) => void;
  onTest: () => Promise<TestResult>;
  testDisabled: boolean;
}) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  async function handleTest() {
    setTesting(true);
    setResult(null);
    try {
      const r = await onTest();
      setResult(r);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="px-5 py-4">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary" htmlFor={name}>
          {label}
        </label>
        {masked ? (
          <span className="text-xs text-emerald-400">등록됨 · {masked}</span>
        ) : (
          <span className="text-xs text-text-muted">미등록</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          id={name}
          name={name}
          type="password"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={masked ? "변경하려면 새 키 입력" : placeholder}
          className="input flex-1"
        />
        <button
          type="button"
          onClick={handleTest}
          disabled={testDisabled || testing}
          className="btn-secondary text-xs"
        >
          {testing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "테스트"
          )}
        </button>
      </div>
      {result && (
        <div
          className={`mt-2 flex items-start gap-1.5 text-xs ${
            result.ok ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {result.ok ? (
            <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          )}
          <span className="break-all">
            {result.ok ? result.detail : result.error}
          </span>
        </div>
      )}
    </div>
  );
}
