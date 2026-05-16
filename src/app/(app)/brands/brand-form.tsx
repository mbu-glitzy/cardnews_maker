"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  createBrandProfile,
  updateBrandProfile,
  deleteBrandProfile,
} from "./actions";

export type BrandFormInitial = {
  id: string | null;
  name: string;
  logo_url: string | null;
  color_primary: string;
  color_secondary: string;
  color_text: string;
  font_primary: string;
  font_secondary: string | null;
  is_default: boolean;
};

const DEFAULT_INITIAL: BrandFormInitial = {
  id: null,
  name: "",
  logo_url: null,
  color_primary: "#6366f1",
  color_secondary: "#a5b4fc",
  color_text: "#ffffff",
  font_primary: "Pretendard",
  font_secondary: "",
  is_default: false,
};

export function BrandForm({
  initial = DEFAULT_INITIAL,
}: {
  initial?: BrandFormInitial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 미리보기용 state
  const [name, setName] = useState(initial.name);
  const [primary, setPrimary] = useState(initial.color_primary);
  const [secondary, setSecondary] = useState(initial.color_secondary);
  const [textColor, setTextColor] = useState(initial.color_text);
  const [logoPreview, setLogoPreview] = useState<string | null>(initial.logo_url);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = initial.id
        ? await updateBrandProfile(initial.id, formData)
        : await createBrandProfile(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/brands");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!initial.id) return;
    if (!confirm(`"${initial.name}" 프로파일을 삭제할까요?`)) return;
    startTransition(async () => {
      await deleteBrandProfile(initial.id!);
    });
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

  return (
    <form action={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">기본 정보</h2>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div>
              <label className="label" htmlFor="name">프로파일 이름</label>
              <input
                id="name"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 자사 메인 브랜드"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="logo">로고 (PNG · 1MB 이하)</label>
              <input
                id="logo"
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoChange}
                className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-bg-elevated file:px-3 file:py-2 file:text-sm file:font-medium file:text-text-primary hover:file:bg-border"
              />
              {initial.logo_url && !logoPreview?.startsWith("blob:") && (
                <p className="mt-1 text-xs text-text-muted">
                  현재 로고 사용 중. 변경하려면 새 파일을 선택하세요.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">컬러</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-3">
            <ColorInput
              name="color_primary"
              label="메인"
              value={primary}
              onChange={setPrimary}
            />
            <ColorInput
              name="color_secondary"
              label="서브"
              value={secondary}
              onChange={setSecondary}
            />
            <ColorInput
              name="color_text"
              label="텍스트"
              value={textColor}
              onChange={setTextColor}
            />
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">폰트</h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              한글 추천: Pretendard / Noto Sans KR / Gmarket Sans
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="font_primary">메인 폰트</label>
              <input
                id="font_primary"
                name="font_primary"
                required
                defaultValue={initial.font_primary}
                placeholder="Pretendard"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="font_secondary">서브 폰트 (선택)</label>
              <input
                id="font_secondary"
                name="font_secondary"
                defaultValue={initial.font_secondary ?? ""}
                placeholder="비워두면 메인 폰트 사용"
                className="input"
              />
            </div>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4">
            <input
              id="is_default"
              name="is_default"
              type="checkbox"
              defaultChecked={initial.is_default}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            <label htmlFor="is_default" className="text-sm text-text-primary">
              기본 프로파일로 지정
            </label>
          </div>
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between">
          {initial.id ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="btn-ghost text-xs text-red-400 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              disabled={pending}
            >
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> 저장 중...
                </>
              ) : (
                "저장"
              )}
            </button>
          </div>
        </div>
      </div>

      <aside>
        <div className="sticky top-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            미리보기
          </h3>
          <PreviewCard
            name={name || "브랜드 이름"}
            logoUrl={logoPreview}
            primary={primary}
            secondary={secondary}
            textColor={textColor}
          />
        </div>
      </aside>
    </form>
  );
}

function ColorInput({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded border border-border bg-transparent"
        />
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className="input flex-1 font-mono text-xs uppercase"
        />
      </div>
    </div>
  );
}

function PreviewCard({
  name,
  logoUrl,
  primary,
  secondary,
  textColor,
}: {
  name: string;
  logoUrl: string | null;
  primary: string;
  secondary: string;
  textColor: string;
}) {
  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-lg shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
        color: textColor,
      }}
    >
      <div className="flex h-full flex-col items-start justify-between p-5">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="logo"
            width={48}
            height={48}
            unoptimized
            className="h-12 w-auto object-contain"
          />
        ) : (
          <div className="h-12 w-12 rounded bg-white/15" />
        )}
        <div>
          <p className="text-xs opacity-70">샘플 카드</p>
          <p className="text-lg font-bold leading-tight">{name}</p>
        </div>
      </div>
    </div>
  );
}
