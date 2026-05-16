import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/supabase.gen";

type CookieSet = { name: string; value: string; options: CookieOptions };

/**
 * 일반 RLS 적용 클라이언트 (사용자 세션 기반).
 * Route Handler / Server Component / Server Action 에서 사용.
 */
export async function createSupabaseServerClient() {
  const env = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieSet) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 등 set 불가 컨텍스트는 무시
          }
        },
      },
    }
  );
}

/**
 * 서비스 롤 클라이언트 (RLS 우회).
 * 시스템 작업, 사용량 로깅 등 신뢰된 서버 작업에만 사용.
 * 절대 클라이언트로 노출 금지.
 */
export function createSupabaseAdminClient() {
  const env = getServerEnv();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export type TypedSupabaseClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;
