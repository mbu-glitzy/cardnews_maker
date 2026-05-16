import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/ig/graph";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const appId = process.env.META_APP_ID;
  if (!appId) {
    return new Response("META_APP_ID 가 설정되지 않았습니다.", { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/auth/instagram/callback`;
  const state = randomBytes(24).toString("hex");

  const authUrl = buildAuthUrl({ appId, redirectUri, state });
  const response = NextResponse.redirect(authUrl);

  // state 를 쿠키에 저장 (CSRF 방어). 10분 TTL.
  response.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/instagram",
    maxAge: 600,
  });

  return response;
}
