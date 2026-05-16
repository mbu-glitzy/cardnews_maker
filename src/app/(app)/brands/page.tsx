import Link from "next/link";
import Image from "next/image";
import { Plus, Star } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Row } from "@/types/supabase";
import { setDefaultBrandProfile } from "./actions";

export default async function BrandsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("user_id", user!.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<Row<"brand_profiles">[]>();

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">브랜드 에셋</h1>
          <p className="mt-1 text-sm text-text-secondary">
            로고 · 컬러 · 폰트를 프로파일로 관리합니다.
          </p>
        </div>
        <Link href="/brands/new" className="btn-primary">
          <Plus className="h-4 w-4" /> 새 프로파일
        </Link>
      </header>

      {(profiles?.length ?? 0) === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles!.map((p) => (
            <BrandCard key={p.id} profile={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function BrandCard({ profile }: { profile: Row<"brand_profiles"> }) {
  const setDefault = setDefaultBrandProfile.bind(null, profile.id);
  return (
    <div className="card overflow-hidden">
      <div
        className="aspect-square w-full"
        style={{
          background: `linear-gradient(135deg, ${profile.color_primary} 0%, ${profile.color_secondary} 100%)`,
          color: profile.color_text,
        }}
      >
        <div className="flex h-full flex-col items-start justify-between p-5">
          {profile.logo_url ? (
            <Image
              src={profile.logo_url}
              alt={`${profile.name} 로고`}
              width={56}
              height={56}
              unoptimized
              className="h-14 w-auto object-contain"
            />
          ) : (
            <div className="h-14 w-14 rounded bg-white/15" />
          )}
          <div>
            <p className="text-xs opacity-70">샘플 카드</p>
            <p className="text-lg font-bold leading-tight">{profile.name}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{profile.name}</p>
          <p className="text-xs text-text-muted">
            {profile.font_primary}
            {profile.is_default && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-accent">
                <Star className="h-3 w-3 fill-current" /> 기본
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-1">
          {!profile.is_default && (
            <form action={setDefault}>
              <button
                type="submit"
                className="btn-ghost text-xs"
                title="기본으로 설정"
              >
                <Star className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
          <Link
            href={`/brands/${profile.id}`}
            className="btn-secondary text-xs"
          >
            편집
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated">
        <Plus className="h-5 w-5 text-text-muted" />
      </div>
      <p className="mb-1 text-sm font-medium text-text-primary">
        아직 등록된 브랜드 프로파일이 없습니다
      </p>
      <p className="mb-5 text-xs text-text-secondary">
        로고와 컬러를 등록하면 모든 카드뉴스에 자동 적용됩니다.
      </p>
      <Link href="/brands/new" className="btn-primary text-xs">
        첫 프로파일 만들기
      </Link>
    </div>
  );
}
