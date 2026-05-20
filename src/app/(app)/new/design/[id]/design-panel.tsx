"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Download,
  ImageIcon,
  Copy as CopyIcon,
  Check,
  Hash,
  PartyPopper,
  Instagram,
  ExternalLink,
} from "lucide-react";
import {
  generatePrompts,
  generateAllImages,
  regenerateOneImage,
  generateCaption,
  markCompleted,
} from "./actions";
import { publishToInstagram } from "./publish-actions";
import { getRoleMeta } from "@/lib/ai/roles";

type CardForDesign = {
  id: string;
  order: number;
  role: string;
  headline: string;
  body: string;
  cta: string | null;
  image_prompt: string | null;
  image_url: string | null;
  engine: string | null;
};

type Status = "draft" | "researching" | "planning" | "copywriting" | "imaging" | "completed";

export function DesignPanel({
  projectId,
  cards: initialCards,
  tone,
  defaultEngine,
  caption: initialCaption,
  hashtags: initialHashtags,
  status,
  publishedPermalink,
  igAccount,
  baseUrl,
}: {
  projectId: string;
  cards: CardForDesign[];
  tone: string;
  defaultEngine: "nano-banana-pro" | "gpt-image-2";
  caption: string | null;
  hashtags: string[] | null;
  status: Status;
  publishedPermalink: string | null;
  igAccount: { ig_username: string | null; token_expires_at: string | null } | null;
  baseUrl: string;
}) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [caption, setCaption] = useState(initialCaption);
  const [hashtags, setHashtags] = useState<string[] | null>(initialHashtags);
  const [engine, setEngine] = useState<"nano-banana-pro" | "gpt-image-2">(
    defaultEngine
  );

  const [promptsLoading, startPrompts] = useTransition();
  const [imagesLoading, startImages] = useTransition();
  const [captionLoading, startCaption] = useTransition();
  const [completing, startComplete] = useTransition();
  const [publishing, startPublish] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedLink, setPublishedLink] = useState<string | null>(
    publishedPermalink
  );

  const allHavePrompts = cards.every((c) => !!c.image_prompt);
  const allHaveImages = cards.every((c) => !!c.image_url);

  function handlePrompts() {
    setError(null);
    startPrompts(async () => {
      const res = await generatePrompts(projectId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCards((prev) =>
        prev.map((c) => {
          const found = res.prompts.find((p) => p.order === c.order);
          return found ? { ...c, image_prompt: found.prompt } : c;
        })
      );
    });
  }

  function handleImages() {
    setError(null);
    startImages(async () => {
      const res = await generateAllImages(projectId, engine);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCards((prev) =>
        prev.map((c) => {
          const found = res.images.find((i) => i.order === c.order);
          return found ? { ...c, image_url: found.url } : c;
        })
      );
    });
  }

  function handleCaption() {
    setError(null);
    startCaption(async () => {
      const res = await generateCaption(projectId);
      if (!res.ok) setError(res.error);
      else {
        setCaption(res.caption);
        setHashtags(res.hashtags);
      }
    });
  }

  function handleComplete() {
    startComplete(async () => {
      await markCompleted(projectId);
      router.push("/");
    });
  }

  function handlePublish() {
    setError(null);
    if (!confirm("이 카드뉴스를 인스타그램에 지금 발행할까요?")) return;
    startPublish(async () => {
      const res = await publishToInstagram(projectId, baseUrl);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPublishedLink(res.permalink);
      router.refresh();
    });
  }

  async function handleRegenOneImage(order: number) {
    setError(null);
    const res = await regenerateOneImage(projectId, order, engine);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCards((prev) =>
      prev.map((c) =>
        c.order === res.order ? { ...c, image_url: res.url } : c
      )
    );
  }

  async function handleDownloadAll() {
    setError(null);
    setDownloading(true);
    try {
      const zip = new JSZip();
      for (const c of cards) {
        const url = `/api/cards/${c.id}/render?t=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${c.order}번 카드 렌더 실패`);
        const blob = await res.blob();
        zip.file(
          `card-${String(c.order).padStart(2, "0")}.png`,
          blob
        );
      }
      const content = await zip.generateAsync({ type: "blob" });
      triggerDownload(content, `cardnews-${projectId.slice(0, 8)}.zip`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadOne(card: CardForDesign) {
    try {
      const url = `/api/cards/${card.id}/render?t=${Date.now()}`;
      const res = await fetch(url);
      const blob = await res.blob();
      triggerDownload(blob, `card-${String(card.order).padStart(2, "0")}.png`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-6">
      {/* 진행 단계 안내 */}
      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">디자인 생성</h2>
          <DesignStepper
            promptsDone={allHavePrompts}
            imagesDone={allHaveImages}
            promptsLoading={promptsLoading}
            imagesLoading={imagesLoading}
          />
        </div>
        <div className="px-5 py-5">
          <div className="mb-4 flex items-center gap-3">
            <label className="text-xs text-text-secondary">이미지 엔진</label>
            <select
              value={engine}
              onChange={(e) =>
                setEngine(e.target.value as "nano-banana-pro" | "gpt-image-2")
              }
              className="input flex-1 max-w-xs"
              disabled={imagesLoading}
            >
              <option value="nano-banana-pro">Nano Banana Pro (권장)</option>
              <option value="gpt-image-2">GPT Image 2</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrompts}
              disabled={promptsLoading || imagesLoading}
              className={`btn-secondary text-xs ${
                allHavePrompts ? "" : "ring-2 ring-accent"
              }`}
            >
              {promptsLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              1. 프롬프트 {allHavePrompts ? "재생성" : "생성"}
            </button>
            <button
              type="button"
              onClick={handleImages}
              disabled={
                !allHavePrompts || promptsLoading || imagesLoading
              }
              className={`btn-primary text-xs ${
                allHavePrompts && !allHaveImages ? "" : ""
              }`}
            >
              {imagesLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  생성 중... (30~60초)
                </>
              ) : (
                <>
                  <ImageIcon className="h-3.5 w-3.5" />
                  2. 배경 이미지 {allHaveImages ? "전체 재생성" : "전체 생성"}
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 카드 그리드 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">
          미리보기 ({cards.length}장)
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {cards.map((c) => (
            <CardPreview
              key={c.id}
              card={c}
              tone={tone}
              onRegenerate={() => handleRegenOneImage(c.order)}
              onDownload={() => handleDownloadOne(c)}
              disabled={imagesLoading || downloading}
            />
          ))}
        </div>
      </section>

      {/* 캡션 */}
      {allHaveImages && (
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">인스타 캡션 · 해시태그</h2>
            <button
              type="button"
              onClick={handleCaption}
              disabled={captionLoading}
              className="btn-ghost text-xs"
            >
              {captionLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : caption ? (
                <RefreshCw className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {caption ? "재생성" : "생성"}
            </button>
          </div>
          <div className="space-y-3 px-5 py-5">
            {caption ? (
              <>
                <CopyableBlock
                  label="캡션"
                  value={caption}
                  multiline
                />
                {hashtags && (
                  <CopyableBlock
                    label="해시태그"
                    value={hashtags.map((h) => `#${h}`).join(" ")}
                    multiline
                    icon={<Hash className="h-3 w-3" />}
                  />
                )}
              </>
            ) : (
              <p className="text-xs text-text-muted">
                Haiku 4.5로 짧고 임팩트 있는 인스타 캡션을 자동 생성합니다.
              </p>
            )}
          </div>
        </section>
      )}

      {/* 인스타 발행 */}
      {allHaveImages && (
        <section className="card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Instagram className="h-4 w-4" /> Instagram 발행
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              연결된 인스타 계정에 캐러셀 게시물로 자동 발행합니다.
            </p>
          </div>
          <div className="px-5 py-5">
            {publishedLink ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-emerald-400">
                    ✓ 발행 완료
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {publishedLink}
                  </p>
                </div>
                <a
                  href={publishedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> 인스타에서 보기
                </a>
              </div>
            ) : !igAccount ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-text-secondary">
                  Instagram 계정이 연결되지 않았습니다.
                </p>
                <Link href="/settings" className="btn-secondary text-xs">
                  설정에서 연결하기
                </Link>
              </div>
            ) : !caption ? (
              <p className="text-xs text-text-muted">
                위 캡션을 먼저 생성해주세요.
              </p>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-text-secondary">
                  연결 계정: <span className="text-text-primary">@{igAccount.ig_username}</span>
                </p>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="btn-primary text-xs"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      발행 중... (1~2분)
                    </>
                  ) : (
                    <>
                      <Instagram className="h-3.5 w-3.5" /> 지금 인스타에 발행
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* 액션 */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={!allHaveImages || downloading}
            className="btn-secondary"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            전체 ZIP 다운로드
          </button>
          {status !== "completed" && (
            <button
              type="button"
              onClick={handleComplete}
              disabled={!allHaveImages || completing}
              className="btn-primary"
            >
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PartyPopper className="h-4 w-4" />
              )}
              완료 처리
            </button>
          )}
          {status === "completed" && (
            <span className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-400">
              ✓ 완료됨
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DesignStepper({
  promptsDone,
  imagesDone,
  promptsLoading,
  imagesLoading,
}: {
  promptsDone: boolean;
  imagesDone: boolean;
  promptsLoading: boolean;
  imagesLoading: boolean;
}) {
  const step1State = promptsLoading
    ? "active"
    : promptsDone
    ? "done"
    : "pending";
  const step2State = imagesLoading
    ? "active"
    : imagesDone
    ? "done"
    : promptsDone
    ? "ready"
    : "pending";
  const step3State = imagesDone ? "ready" : "pending";

  return (
    <ol className="mt-3 flex items-stretch gap-2">
      <StepperItem n={1} label="프롬프트 생성" hint="Sonnet" state={step1State} />
      <StepperItem n={2} label="배경 이미지" hint="이미지 모델" state={step2State} />
      <StepperItem n={3} label="텍스트·로고 합성" hint="코드" state={step3State} />
    </ol>
  );
}

function StepperItem({
  n,
  label,
  hint,
  state,
}: {
  n: number;
  label: string;
  hint: string;
  state: "pending" | "ready" | "active" | "done";
}) {
  const styles: Record<typeof state, string> = {
    pending: "bg-bg-elevated/40 text-text-muted",
    ready: "bg-accent/10 text-accent ring-1 ring-accent/40",
    active: "bg-accent/15 text-accent ring-1 ring-accent",
    done: "bg-emerald-500/10 text-emerald-400",
  };
  const badge: Record<typeof state, string> = {
    pending: "bg-bg-elevated text-text-muted",
    ready: "bg-accent/20 text-accent",
    active: "bg-accent text-white",
    done: "bg-emerald-500/20 text-emerald-400",
  };
  return (
    <li
      className={`flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-xs ${styles[state]}`}
    >
      <span
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${badge[state]}`}
      >
        {state === "done" ? "✓" : n}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium">{label}</p>
        <p className="truncate text-[10px] opacity-70">{hint}</p>
      </div>
    </li>
  );
}

function CardPreview({
  card,
  tone,
  onRegenerate,
  onDownload,
  disabled,
}: {
  card: CardForDesign;
  tone: string;
  onRegenerate: () => void;
  onDownload: () => void;
  disabled: boolean;
}) {
  const [regen, setRegen] = useState(false);
  const hasImage = !!card.image_url;
  const meta = getRoleMeta(card.role, tone);

  async function handleRegenerate() {
    setRegen(true);
    try {
      await onRegenerate();
    } finally {
      setRegen(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      {/* 미리보기 영역 */}
      <div className="relative aspect-square w-full bg-bg-elevated">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/cards/${card.id}/render?ts=${
              card.image_url ?? ""
            }`}
            alt={`카드 ${card.order} 미리보기`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <ImageIcon className="mb-2 h-6 w-6 text-text-muted" />
            <p className="text-xs text-text-muted">
              {card.image_prompt ? "배경 생성 대기" : "프롬프트 생성 전"}
            </p>
          </div>
        )}

        {/* 페이지 번호 + 역할 */}
        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white backdrop-blur">
            {card.order}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.color}`}
          >
            {meta.label}
          </span>
        </div>
      </div>

      {/* 카드 정보 */}
      <div className="px-3 py-3">
        <p className="line-clamp-1 text-xs font-medium">{card.headline}</p>
        <p className="line-clamp-2 mt-0.5 text-xs text-text-muted">
          {card.body}
        </p>

        <div className="mt-3 flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={disabled || regen || !card.image_prompt}
            className="btn-ghost text-xs"
            title="이 카드 배경만 재생성"
          >
            {regen ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={disabled || !hasImage}
            className="btn-ghost text-xs"
            title="개별 다운로드"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyableBlock({
  label,
  value,
  multiline,
  icon,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  icon?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium text-text-secondary">
          {icon} {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="btn-ghost text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> 복사됨
            </>
          ) : (
            <>
              <CopyIcon className="h-3 w-3" /> 복사
            </>
          )}
        </button>
      </div>
      {multiline ? (
        <pre className="rounded-md bg-bg-elevated px-3 py-2.5 text-xs leading-relaxed text-text-primary whitespace-pre-wrap break-words font-sans">
          {value}
        </pre>
      ) : (
        <p className="rounded-md bg-bg-elevated px-3 py-2.5 text-xs text-text-primary">
          {value}
        </p>
      )}
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
