"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { publishCarousel } from "@/lib/ig/graph";
import { uploadBase64ToBucket } from "@/lib/storage";

export type PublishResult =
  | { ok: true; postId: string; permalink: string | null }
  | { ok: false; error: string };

/**
 * 카드뉴스를 인스타에 캐러셀로 발행.
 *
 * 흐름:
 * 1) instagram_accounts 에서 토큰·igUserId 가져옴
 * 2) 카드별 render API 를 서버에서 호출해 합성된 PNG buffer 얻음
 * 3) rendered-cards 버킷에 업로드 → 공개 URL 확보
 * 4) Instagram Graph API 로 캐러셀 발행
 * 5) 결과 projects 에 저장
 */
export async function publishToInstagram(
  projectId: string,
  baseUrl: string
): Promise<PublishResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "로그인이 필요합니다." };

    // 1) 프로젝트 + 인스타 계정
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!project) return { ok: false, error: "프로젝트를 찾을 수 없습니다." };

    if (!project.caption) {
      return {
        ok: false,
        error: "인스타 캡션이 없습니다. 디자인 단계에서 캡션을 먼저 생성하세요.",
      };
    }

    const { data: ig } = await supabase
      .from("instagram_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!ig) {
      return {
        ok: false,
        error: "Instagram 계정이 연결되지 않았습니다. 설정에서 먼저 연결하세요.",
      };
    }

    let pageAccessToken: string;
    try {
      pageAccessToken = decrypt(ig.access_token_encrypted);
    } catch {
      return { ok: false, error: "저장된 토큰을 읽을 수 없습니다. 재연결하세요." };
    }

    // 2) 카드 목록 + 렌더링
    const { data: cards } = await supabase
      .from("cards")
      .select("id, order:card_order")
      .eq("project_id", projectId)
      .order("card_order", { ascending: true })
      .returns<Array<{ id: string; order: number }>>();
    if (!cards || cards.length < 2) {
      return { ok: false, error: "발행하려면 최소 2장의 카드가 필요합니다." };
    }
    if (cards.length > 10) {
      return { ok: false, error: "인스타 캐러셀은 최대 10장입니다." };
    }

    // 각 카드 render API → PNG buffer → Storage 업로드 → 공개 URL
    const renderUrls = await Promise.all(
      cards.map(async (c) => {
        const renderUrl = `${baseUrl}/api/cards/${c.id}/render?t=${Date.now()}`;
        const res = await fetch(renderUrl);
        if (!res.ok) {
          throw new Error(`${c.order}번 카드 렌더 실패 (${res.status})`);
        }
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.startsWith("image/")) {
          throw new Error(
            `${c.order}번 카드 렌더 응답이 이미지가 아님 (content-type: ${ct})`
          );
        }
        const pngBuf = Buffer.from(await res.arrayBuffer());
        if (pngBuf.length < 1000) {
          throw new Error(
            `${c.order}번 카드 렌더 결과가 너무 작음 (${pngBuf.length} bytes)`
          );
        }
        // IG Graph API 는 JPEG 만 공식 지원. PNG 는 컨테이너 단계에서 ERROR 로 떨어지는 일이 잦음.
        // 알파 채널 평탄화 + sRGB + JPEG 인코딩으로 통일.
        const jpegBuf = await sharp(pngBuf)
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" })
          .toBuffer();
        const base64 = jpegBuf.toString("base64");
        const path = `${user.id}/${projectId}/published-${c.order}-${Date.now()}.jpg`;
        return uploadBase64ToBucket({
          bucket: "rendered-cards",
          path,
          base64,
          contentType: "image/jpeg",
        });
      })
    );

    // 업로드 검증 — 첫 URL 이 외부에서 fetch 가능한 이미지인지
    if (renderUrls.length > 0) {
      const check = await fetch(renderUrls[0], { method: "HEAD" });
      const cct = check.headers.get("content-type") ?? "";
      if (!check.ok || !cct.startsWith("image/")) {
        return {
          ok: false,
          error: `업로드된 이미지 URL 검증 실패: status=${check.status}, content-type=${cct}, url=${renderUrls[0]}`,
        };
      }
      console.log("[publish] storage urls:", renderUrls);
    }

    // 3) 캡션 + 해시태그 합치기
    const fullCaption = buildCaption(project.caption, project.hashtags);

    // 4) Instagram 캐러셀 발행
    const result = await publishCarousel({
      igUserId: ig.ig_user_id,
      pageAccessToken,
      imageUrls: renderUrls,
      caption: fullCaption,
    });

    // 5) 결과 저장 (RLS 우회 위해 admin)
    const admin = createSupabaseAdminClient();
    await admin
      .from("projects")
      .update({
        published_post_id: result.id,
        published_permalink: result.permalink,
        published_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", projectId);

    revalidatePath(`/new/design/${projectId}`);
    revalidatePath("/");
    return { ok: true, postId: result.id, permalink: result.permalink };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[publish] 실패", e);
    return { ok: false, error: msg };
  }
}

function buildCaption(caption: string, hashtags: string[] | null): string {
  if (!hashtags || hashtags.length === 0) return caption;
  return `${caption}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`;
}
