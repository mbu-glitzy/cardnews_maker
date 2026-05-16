import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FONT_BOLD_URL =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Bold.otf";
const FONT_REGULAR_URL =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Regular.otf";

let cachedFonts: { bold: ArrayBuffer; regular: ArrayBuffer } | null = null;

async function loadFonts() {
  if (cachedFonts) return cachedFonts;
  const [bold, regular] = await Promise.all([
    fetch(FONT_BOLD_URL).then((r) => {
      if (!r.ok) throw new Error(`폰트 로드 실패 (Bold): ${r.status}`);
      return r.arrayBuffer();
    }),
    fetch(FONT_REGULAR_URL).then((r) => {
      if (!r.ok) throw new Error(`폰트 로드 실패 (Regular): ${r.status}`);
      return r.arrayBuffer();
    }),
  ]);
  cachedFonts = { bold, regular };
  return cachedFonts;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: cardId } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 카드 + 프로젝트 + 브랜드 조회
  const { data: card } = await admin
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .maybeSingle();
  if (!card) {
    return new Response("Card not found", { status: 404 });
  }

  const { data: project } = await admin
    .from("projects")
    .select("brand_profile_id, card_count, user_id")
    .eq("id", card.project_id)
    .maybeSingle();
  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  let brand: {
    color_primary: string;
    color_secondary: string;
    color_text: string;
    logo_url: string | null;
  } = {
    color_primary: "#6366f1",
    color_secondary: "#a5b4fc",
    color_text: "#ffffff",
    logo_url: null,
  };
  if (project.brand_profile_id) {
    const { data: b } = await admin
      .from("brand_profiles")
      .select("color_primary, color_secondary, color_text, logo_url")
      .eq("id", project.brand_profile_id)
      .maybeSingle();
    if (b) brand = b;
  }

  const fonts = await loadFonts();

  const isCover = card.card_order === 1;
  const headline = card.headline || "";
  const body = card.body || "";
  const bgImage = card.image_url;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1080px",
          display: "flex",
          position: "relative",
          fontFamily: "Pretendard",
          color: brand.color_text,
          background: `linear-gradient(135deg, ${brand.color_primary} 0%, ${brand.color_secondary} 100%)`,
        }}
      >
        {/* 배경 이미지 */}
        {bgImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgImage}
            alt=""
            width={1080}
            height={1080}
            style={{
              position: "absolute",
              inset: 0,
              width: "1080px",
              height: "1080px",
              objectFit: "cover",
            }}
          />
        )}

        {/* 그라데이션 오버레이 (가독성 확보) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "1080px",
            height: "1080px",
            display: "flex",
            background: `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)`,
          }}
        />

        {/* 컨텐츠 영역 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "80px 70px",
            width: "1080px",
            height: "1080px",
          }}
        >
          {/* 상단: 로고 */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {brand.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logo_url}
                alt=""
                height={80}
                style={{ maxHeight: "80px", maxWidth: "240px", objectFit: "contain" }}
              />
            ) : (
              <div style={{ display: "flex" }} />
            )}
          </div>

          {/* 하단: 헤드라인 + 본문 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: isCover ? "84px" : "72px",
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                marginBottom: "24px",
                wordBreak: "keep-all",
              }}
            >
              {headline}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "34px",
                fontWeight: 400,
                lineHeight: 1.45,
                opacity: 0.92,
                wordBreak: "keep-all",
              }}
            >
              {body}
            </div>
          </div>
        </div>

        {/* 우하단 페이지 번호 */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "70px",
            display: "flex",
            fontSize: "24px",
            fontWeight: 700,
            opacity: 0.65,
          }}
        >
          {card.card_order} / {project.card_count}
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: "Pretendard", data: fonts.regular, weight: 400, style: "normal" },
        { name: "Pretendard", data: fonts.bold, weight: 700, style: "normal" },
      ],
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    }
  );
}
