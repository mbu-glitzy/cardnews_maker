"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요."),
  password: z.string().min(6, "비밀번호는 최소 6자 이상."),
});

export type AuthResult = { ok: true } | { ok: false; error: string };

export async function signInWithPassword(formData: FormData): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: translateAuthError(error.message) };
  }

  redirect("/");
}

export async function signUpWithPassword(formData: FormData): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: translateAuthError(error.message) };
  }

  // 이메일 확인이 비활성화된 경우 session 즉시 발급 → 로그인됨
  if (data.session) {
    redirect("/");
  }

  // 이메일 확인이 필요한 경우
  return {
    ok: false,
    error: "가입 메일을 확인하세요. (Supabase의 'Confirm email' 설정을 끄면 즉시 로그인됩니다)",
  };
}

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (message.includes("User already registered")) {
    return "이미 가입된 이메일입니다. 로그인을 사용하세요.";
  }
  if (message.includes("Email not confirmed")) {
    return "이메일 인증이 완료되지 않았습니다. 메일함을 확인하세요.";
  }
  if (message.includes("Password should be")) {
    return "비밀번호 정책을 만족하지 않습니다. (최소 6자)";
  }
  return message;
}
