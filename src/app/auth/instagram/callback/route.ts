import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  listUserPagesWithIg,
  getIgAccountInfo,
} from "@/lib/ig/graph";
import { encrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const incomingState = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  if (errorParam) {
    return redirectWithError(
      url.origin,
      `Meta 권한 거부 (${errorParam}): ${errorDesc ?? ""}`
    );
  }
  if (!code) {
    return redirectWithError(url.origin, "code 누락");
  }

  // CSRF state 검증
  const cookieState = request.cookies.get("ig_oauth_state")?.value;
  if (!cookieState || cookieState !== incomingState) {
    return redirectWithError(url.origin, "state 불일치 (CSRF 의심)");
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return redirectWithError(url.origin, "META_APP_* 환경변수 누락");
  }

  const redirectUri = `${url.origin}/auth/instagram/callback`;

  try {
    // 1) code → short-lived token
    const shortTok = await exchangeCodeForToken({
      appId,
      appSecret,
      redirectUri,
      code,
    });

    // 2) → long-lived (60일)
    const longTok = await exchangeForLongLivedToken({
      appId,
      appSecret,
      shortToken: shortTok.access_token,
    });

    // 3) 페이지 목록 + IG 비즈 계정 ID
    const pages = await listUserPagesWithIg(longTok.access_token);
    const pageWithIg = pages.find((p) => !!p.instagram_business_account);
    if (!pageWithIg || !pageWithIg.instagram_business_account) {
      return redirectWithError(
        url.origin,
        "IG 비즈니스 계정이 연결된 페이지가 없습니다. Facebook Page ↔ Instagram 연결을 먼저 완료하세요."
      );
    }

    const igUserId = pageWithIg.instagram_business_account.id;

    // 4) IG 계정 정보 (username)
    const igInfo = await getIgAccountInfo(igUserId, pageWithIg.access_token);

    // 5) DB 저장 — page_access_token 을 암호화 (실제 발행 시 사용)
    //    long-lived user token 보다 page_access_token 이 IG 발행에 필요
    const expiresAt = longTok.expires_in
      ? new Date(Date.now() + longTok.expires_in * 1000)
      : null;

    const { error } = await supabase.from("instagram_accounts").upsert(
      {
        user_id: user.id,
        ig_user_id: igUserId,
        ig_username: igInfo.username,
        fb_page_id: pageWithIg.id,
        fb_page_name: pageWithIg.name,
        access_token_encrypted: encrypt(pageWithIg.access_token),
        token_expires_at: expiresAt ? expiresAt.toISOString() : null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return redirectWithError(url.origin, `저장 실패: ${error.message}`);
    }

    const ok = NextResponse.redirect(
      new URL("/settings?ig=connected", url.origin)
    );
    ok.cookies.delete("ig_oauth_state");
    return ok;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return redirectWithError(url.origin, msg);
  }
}

function redirectWithError(origin: string, message: string) {
  const u = new URL("/settings", origin);
  u.searchParams.set("ig", "error");
  u.searchParams.set("msg", message.slice(0, 200));
  return NextResponse.redirect(u);
}
