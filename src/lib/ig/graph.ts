/**
 * Instagram Graph API 호출 헬퍼.
 * 모든 호출은 fetch 기반. Node 런타임 + Edge 런타임 둘 다 동작.
 */

const API_VERSION = process.env.META_GRAPH_API_VERSION ?? "v23.0";
const GRAPH_BASE = `https://graph.facebook.com/${API_VERSION}`;
const OAUTH_BASE = `https://www.facebook.com/${API_VERSION}/dialog/oauth`;

export const REQUIRED_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

export function buildAuthUrl(params: {
  appId: string;
  redirectUri: string;
  state: string;
}): string {
  const u = new URL(OAUTH_BASE);
  u.searchParams.set("client_id", params.appId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("scope", REQUIRED_SCOPES.join(","));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", params.state);
  return u.toString();
}

interface ShortTokenResp {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

/**
 * OAuth code → short-lived access_token
 */
export async function exchangeCodeForToken(params: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}): Promise<ShortTokenResp> {
  const u = new URL(`${GRAPH_BASE}/oauth/access_token`);
  u.searchParams.set("client_id", params.appId);
  u.searchParams.set("client_secret", params.appSecret);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("code", params.code);

  const res = await fetch(u.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`code 교환 실패 (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * short-lived → long-lived (60일)
 */
export async function exchangeForLongLivedToken(params: {
  appId: string;
  appSecret: string;
  shortToken: string;
}): Promise<{ access_token: string; expires_in: number }> {
  const u = new URL(`${GRAPH_BASE}/oauth/access_token`);
  u.searchParams.set("grant_type", "fb_exchange_token");
  u.searchParams.set("client_id", params.appId);
  u.searchParams.set("client_secret", params.appSecret);
  u.searchParams.set("fb_exchange_token", params.shortToken);

  const res = await fetch(u.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`long-lived 변환 실패 (${res.status}): ${text}`);
  }
  return res.json();
}

interface PageNode {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

/**
 * 사용자 토큰으로 접근 가능한 페이지 목록 + 각 페이지의 IG 비즈 계정 ID.
 */
export async function listUserPagesWithIg(
  userAccessToken: string
): Promise<PageNode[]> {
  const u = new URL(`${GRAPH_BASE}/me/accounts`);
  u.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account"
  );
  u.searchParams.set("access_token", userAccessToken);

  const res = await fetch(u.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`페이지 목록 조회 실패 (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { data: PageNode[] };
  return data.data ?? [];
}

/**
 * IG Business Account 기본 정보 (username 등).
 */
export async function getIgAccountInfo(
  igUserId: string,
  pageAccessToken: string
): Promise<{ id: string; username: string }> {
  const u = new URL(`${GRAPH_BASE}/${igUserId}`);
  u.searchParams.set("fields", "id,username");
  u.searchParams.set("access_token", pageAccessToken);

  const res = await fetch(u.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IG 계정 정보 조회 실패 (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * 자식 컨테이너 (캐러셀 아이템) 생성. is_carousel_item=true.
 */
export async function createChildContainer(params: {
  igUserId: string;
  pageAccessToken: string;
  imageUrl: string;
}): Promise<string> {
  const body = new URLSearchParams({
    image_url: params.imageUrl,
    is_carousel_item: "true",
    access_token: params.pageAccessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/${params.igUserId}/media`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`자식 컨테이너 생성 실패 (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * 부모 캐러셀 컨테이너 생성.
 */
export async function createCarouselContainer(params: {
  igUserId: string;
  pageAccessToken: string;
  childIds: string[];
  caption: string;
}): Promise<string> {
  const body = new URLSearchParams({
    media_type: "CAROUSEL",
    children: params.childIds.join(","),
    caption: params.caption,
    access_token: params.pageAccessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/${params.igUserId}/media`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`캐러셀 컨테이너 생성 실패 (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * 컨테이너 상태 확인. FINISHED 가 되면 게시 가능.
 * status_code: IN_PROGRESS | FINISHED | ERROR | EXPIRED | PUBLISHED
 *
 * 주의: IG Graph v23.0 에서 컨테이너 객체는 `status_code` 만 안정적으로 지원.
 * 과거 버전의 verbose `status` 필드를 같이 요청하면 (#100 subcode 33) 으로 400.
 * verbose 사유가 필요하면 status_code === ERROR 일 때 별도 호출 (best-effort).
 *
 * Return shape:
 *  - statusCode: 위 6개 값 중 하나 (HTTP 응답 본문에서 파싱)
 *  - status: verbose 메시지 (HTTP 실패 시 응답 본문 raw)
 *  - transient: HTTP 응답이 실패했지만 재시도 가능한 경우 true (e.g. code 100/subcode 33 — 컨테이너 propagation 지연)
 */
export async function getContainerStatus(
  containerId: string,
  pageAccessToken: string
): Promise<{ statusCode: string; status: string | null; transient: boolean }> {
  const u = new URL(`${GRAPH_BASE}/${containerId}`);
  u.searchParams.set("fields", "status_code");
  u.searchParams.set("access_token", pageAccessToken);
  const res = await fetch(u.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const transient = isTransientLookupError(text);
    return {
      statusCode: transient ? "IN_PROGRESS" : "ERROR",
      status: `상태 조회 실패 (${res.status}): ${text}`,
      transient,
    };
  }
  const data = (await res.json()) as { status_code?: string };
  return {
    statusCode: data.status_code ?? "UNKNOWN",
    status: null,
    transient: false,
  };
}

/**
 * Meta Graph API 가 "방금 만든 객체가 아직 안 보임" 으로 돌려주는 transient 에러 판별.
 * code=100 + subcode=33 = "Object does not exist or cannot be loaded...".
 * 컨테이너 생성 직후 1~3초 안에 흔히 발생. 재시도하면 풀린다.
 */
function isTransientLookupError(bodyText: string): boolean {
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { code?: number; error_subcode?: number };
    };
    const code = parsed.error?.code;
    const sub = parsed.error?.error_subcode;
    return code === 100 && sub === 33;
  } catch {
    return false;
  }
}

/**
 * ERROR 상태일 때 best-effort 로 verbose 사유 시도.
 * `status` 필드를 단독으로 한 번 더 요청. 권한/필드 미지원이면 null 반환.
 */
async function tryFetchVerboseStatus(
  containerId: string,
  pageAccessToken: string
): Promise<string | null> {
  try {
    const u = new URL(`${GRAPH_BASE}/${containerId}`);
    u.searchParams.set("fields", "status");
    u.searchParams.set("access_token", pageAccessToken);
    const res = await fetch(u.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: string };
    return data.status ?? null;
  } catch {
    return null;
  }
}

/**
 * 컨테이너 발행 → 게시물 ID 반환.
 */
export async function publishMedia(params: {
  igUserId: string;
  pageAccessToken: string;
  creationId: string;
}): Promise<{ id: string }> {
  const body = new URLSearchParams({
    creation_id: params.creationId,
    access_token: params.pageAccessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/${params.igUserId}/media_publish`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`media_publish 실패 (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * 게시물의 permalink 조회.
 */
export async function getMediaPermalink(
  mediaId: string,
  pageAccessToken: string
): Promise<string | null> {
  const u = new URL(`${GRAPH_BASE}/${mediaId}`);
  u.searchParams.set("fields", "permalink");
  u.searchParams.set("access_token", pageAccessToken);
  const res = await fetch(u.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as { permalink?: string };
  return data.permalink ?? null;
}

/**
 * 캐러셀 발행 한방 처리:
 *  1) 각 이미지 자식 컨테이너 N개 생성 (병렬)
 *  2) 컨테이너 처리 대기 (폴링)
 *  3) 부모 캐러셀 컨테이너 생성
 *  4) 부모 컨테이너 처리 대기
 *  5) 발행
 *  6) permalink 조회
 */
export async function publishCarousel(params: {
  igUserId: string;
  pageAccessToken: string;
  imageUrls: string[];
  caption: string;
}): Promise<{ id: string; permalink: string | null }> {
  if (params.imageUrls.length < 2 || params.imageUrls.length > 10) {
    throw new Error("캐러셀은 2~10장이어야 합니다.");
  }

  // 1) 자식 컨테이너 병렬 생성
  const childIds = await Promise.all(
    params.imageUrls.map((url) =>
      createChildContainer({
        igUserId: params.igUserId,
        pageAccessToken: params.pageAccessToken,
        imageUrl: url,
      })
    )
  );

  // 2) 자식 컨테이너 처리 대기 (각각)
  await Promise.all(
    childIds.map((id) => waitForFinished(id, params.pageAccessToken))
  );

  // 3) 부모 캐러셀 컨테이너
  const carouselId = await createCarouselContainer({
    igUserId: params.igUserId,
    pageAccessToken: params.pageAccessToken,
    childIds,
    caption: params.caption,
  });

  // 4) 부모 처리 대기
  await waitForFinished(carouselId, params.pageAccessToken);

  // 5) 발행
  const published = await publishMedia({
    igUserId: params.igUserId,
    pageAccessToken: params.pageAccessToken,
    creationId: carouselId,
  });

  // 6) permalink
  const permalink = await getMediaPermalink(
    published.id,
    params.pageAccessToken
  );

  return { id: published.id, permalink };
}

async function waitForFinished(
  containerId: string,
  pageAccessToken: string,
  opts: { maxWaitMs?: number; intervalMs?: number; initialDelayMs?: number } = {}
): Promise<void> {
  const max = opts.maxWaitMs ?? 60_000;
  const interval = opts.intervalMs ?? 2_000;
  // IG 가 새로 만든 컨테이너 ID 를 Meta 엣지에 propagate 하는 데 1~2초 정도 걸린다.
  // 그 사이 GET 하면 code=100/subcode=33 으로 떨어진다. 첫 폴링 전 약간 대기.
  const initialDelay = opts.initialDelayMs ?? 1_500;
  await new Promise((r) => setTimeout(r, initialDelay));

  const start = Date.now();
  let lastTransientError: string | null = null;

  while (Date.now() - start < max) {
    const { statusCode, status, transient } = await getContainerStatus(
      containerId,
      pageAccessToken
    );

    if (statusCode === "FINISHED") return;

    if (transient) {
      // 아직 propagation 중. 다음 폴링에 다시 시도.
      lastTransientError = status;
    } else if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      const verbose =
        status ?? (await tryFetchVerboseStatus(containerId, pageAccessToken));
      const detail = verbose ? ` — ${verbose}` : "";
      throw new Error(
        `컨테이너 처리 실패: ${statusCode}${detail} (container_id=${containerId})`
      );
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  const tail = lastTransientError
    ? ` — 마지막 응답: ${lastTransientError}`
    : "";
  throw new Error(
    `컨테이너 처리 시간 초과 (60초)${tail} (container_id=${containerId})`
  );
}
