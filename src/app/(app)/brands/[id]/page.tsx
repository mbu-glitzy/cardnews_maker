import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BrandForm, type BrandFormInitial } from "../brand-form";

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!profile) notFound();

  const initial: BrandFormInitial = {
    id: profile.id,
    name: profile.name,
    logo_url: profile.logo_url,
    color_primary: profile.color_primary,
    color_secondary: profile.color_secondary,
    color_text: profile.color_text,
    font_primary: profile.font_primary,
    font_secondary: profile.font_secondary,
    is_default: profile.is_default,
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8">
        <Link
          href="/brands"
          className="mb-3 inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
        >
          <ChevronLeft className="h-3 w-3" /> 브랜드 목록
        </Link>
        <h1 className="text-2xl font-bold">{profile.name} 편집</h1>
      </header>
      <BrandForm initial={initial} />
    </div>
  );
}
