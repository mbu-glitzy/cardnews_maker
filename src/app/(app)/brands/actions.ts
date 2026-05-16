"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Update } from "@/types/supabase";

const HEX = /^#[0-9a-fA-F]{6}$/;

const baseSchema = z.object({
  name: z.string().trim().min(1, "이름은 필수입니다.").max(60),
  color_primary: z.string().regex(HEX, "HEX 형식 (#RRGGBB)"),
  color_secondary: z.string().regex(HEX, "HEX 형식 (#RRGGBB)"),
  color_text: z.string().regex(HEX, "HEX 형식 (#RRGGBB)"),
  font_primary: z.string().trim().min(1).max(60),
  font_secondary: z.string().trim().max(60).optional().nullable(),
  is_default: z.boolean().optional(),
});

export type BrandResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function uploadLogoIfPresent(
  userId: string,
  file: File | null
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > 1024 * 1024) {
    throw new Error("로고는 1MB 이하만 업로드 가능합니다.");
  }
  const supabase = await createSupabaseServerClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("brand-logos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`로고 업로드 실패: ${error.message}`);

  const { data } = supabase.storage.from("brand-logos").getPublicUrl(path);
  return data.publicUrl;
}

function parseForm(formData: FormData) {
  const parsed = baseSchema.safeParse({
    name: formData.get("name"),
    color_primary: formData.get("color_primary"),
    color_secondary: formData.get("color_secondary"),
    color_text: formData.get("color_text"),
    font_primary: formData.get("font_primary"),
    font_secondary: formData.get("font_secondary") || null,
    is_default: formData.get("is_default") === "on",
  });
  return parsed;
}

export async function createBrandProfile(
  formData: FormData
): Promise<BrandResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  let logoUrl: string | null = null;
  try {
    logoUrl = await uploadLogoIfPresent(
      user.id,
      formData.get("logo") as File | null
    );
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  if (parsed.data.is_default) {
    await supabase
      .from("brand_profiles")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const { data, error } = await supabase
    .from("brand_profiles")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      logo_url: logoUrl,
      color_primary: parsed.data.color_primary,
      color_secondary: parsed.data.color_secondary,
      color_text: parsed.data.color_text,
      font_primary: parsed.data.font_primary,
      font_secondary: parsed.data.font_secondary ?? null,
      is_default: parsed.data.is_default ?? false,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "저장 실패" };
  }
  revalidatePath("/brands");
  return { ok: true, id: data.id };
}

export async function updateBrandProfile(
  id: string,
  formData: FormData
): Promise<BrandResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const updates: Update<"brand_profiles"> = {
    name: parsed.data.name,
    color_primary: parsed.data.color_primary,
    color_secondary: parsed.data.color_secondary,
    color_text: parsed.data.color_text,
    font_primary: parsed.data.font_primary,
    font_secondary: parsed.data.font_secondary ?? null,
    is_default: parsed.data.is_default ?? false,
  };

  try {
    const newLogo = await uploadLogoIfPresent(
      user.id,
      formData.get("logo") as File | null
    );
    if (newLogo) updates.logo_url = newLogo;
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  if (parsed.data.is_default) {
    await supabase
      .from("brand_profiles")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .neq("id", id);
  }

  const { error } = await supabase
    .from("brand_profiles")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/brands");
  revalidatePath(`/brands/${id}`);
  return { ok: true, id };
}

export async function deleteBrandProfile(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("brand_profiles")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/brands");
  redirect("/brands");
}

export async function setDefaultBrandProfile(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("brand_profiles")
    .update({ is_default: false })
    .eq("user_id", user.id);

  await supabase
    .from("brand_profiles")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/brands");
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
