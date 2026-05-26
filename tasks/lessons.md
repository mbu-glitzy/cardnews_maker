# 개발 패턴 & 교훈

> 같은 실수 2회 반복 금지. 매 수정/피드백 발생 시 즉시 누적.
> 세션 시작 시 항상 먼저 검토.

---

## 2026-05-13 — Next.js 16 마이그레이션 변경점
- **문제**: Next.js 16부터 `middleware.ts` 파일명이 deprecated. `proxy.ts`로 이름 변경 권장.
- **원인**: Next.js 16의 새 컨벤션. 향후 버전에서 제거될 수 있음.
- **해결**: 빌드는 통과하므로 일단 유지. UI/인증 작업 끝낸 후 한 번에 `src/middleware.ts` → `src/proxy.ts`로 리네임 + 내부 함수명/import 갱신.
- **규칙**: Next.js 17 이전에 정리. 신규 작성 시에는 처음부터 `proxy.ts` 사용 고려.

## 2026-05-13 — Supabase ssr 쿠키 콜백 타입 추론
- **문제**: `@supabase/ssr` 의 `setAll` 콜백 파라미터 `cookiesToSet` 가 strict 모드에서 implicit any 로 잡힘.
- **원인**: 콜백 시그니처 타입 추론이 강타입에서 실패.
- **해결**: `import { type CookieOptions } from "@supabase/ssr"` 후 명시적 타입 `{ name: string; value: string; options: CookieOptions }[]` 적용.
- **규칙**: Supabase ssr 콜백은 모든 곳에서 명시적 타입 사용. 추론 의존 금지.

## 2026-05-13 — `supabase gen types` 결과에 메타데이터 혼입
- **문제**: `npx supabase gen types typescript ...` 출력 끝에 `<claude-code-hint ... />` HTML 태그가 붙음. TS 파일이 깨짐.
- **원인**: Claude Code 환경의 supabase 플러그인이 응답 끝에 메타데이터를 주입.
- **해결**: `scripts/clean-gen-types.mjs` 후처리로 정규식 제거. `npm run gen:types` 스크립트에 체이닝.
- **규칙**: gen types 직접 실행 금지. 반드시 `npm run gen:types` 사용. 새 환경에서 같은 문제 다시 만나면 정규식 패턴(`<claude-code-hint\b[^>]*\/>`) 확인.

## 2026-05-13 — Supabase 자동 생성 타입과 코드 분리 패턴
- **문제**: gen types 결과에는 enum이 `Database["public"]["Enums"]["..."]` 형태로만 노출돼, `AiOperation` 같은 짧은 alias를 직접 export 못 함. supabase.ts에 alias 추가하면 다음 gen types 실행 시 사라짐.
- **원인**: 자동 생성 파일 = 빌드 산출물. 수동 편집 불가.
- **해결**: wrapper 패턴 — `supabase.gen.ts` (자동 생성, 절대 수동 편집 안 함) + `supabase.ts` (수동 wrapper, re-export + alias 정의). 사용처는 항상 `@/types/supabase` import.
- **규칙**: 자동 생성 파일은 별도 `.gen.ts` 접미사로 분리. 사용처는 wrapper만 본다.

## 2026-05-13 — `@supabase/ssr` ↔ `@supabase/supabase-js` 버전 불일치가 타입 추론 전면 붕괴 (핵심)
- **문제**: `.update({...})` → `never`, `.maybeSingle()` → `never[]` 등 supabase-js 호출 결과가 전부 `never` 로 추론.
- **원인**: `@supabase/ssr@0.5.x` 가 `@supabase/supabase-js/dist/module/lib/types` 경로를 import 하는데, supabase-js 최신 버전(2.4x+)에서 그 경로가 사라짐. ssr의 .d.ts 가 모듈을 못 찾아 client 의 schema generic forwarding 이 깨짐 → 모든 row/insert/update 타입이 fallback.
- **해결**: `npm install @supabase/ssr@latest` (0.10.x). 한 줄로 전부 해결.
- **규칙**: supabase-js 또는 ssr 업그레이드 시 둘 다 같이 업그레이드. 한쪽만 올리지 말 것. 의심 증상: 일부는 동작하고 update/insert만 never 로 추론 → 거의 100% 버전 mismatch.
- **검증 trick**: `npx tsc --noEmit some-test.ts` 식으로 임시 파일에 inline 호출을 만들어 보면 `Cannot find module '@supabase/supabase-js/dist/module/lib/types'` 같은 명시적 에러가 노출됨 (실제 사용처에서는 묻혀버림).

## 2026-05-13 — supabase-js `select("...")` 타입 추론 실패 → `.returns<T>()`
- **문제**: `supabase.from("projects").select("id, topic, status, ...")` 결과 `data` 가 `never[]` 로 추론. 필드 접근 시 TS2339.
- **원인**: supabase-js의 select 문자열 리터럴 파서가 우리 Database wrapper 타입 또는 Next 16 환경에서 추론 실패.
- **해결**: `.returns<RowShape[]>()` 체이닝으로 응답 타입 명시. shape 타입은 `Row<"projects">` + `Pick<...>` 로 정의.
- **규칙**: select 문자열로 부분 컬럼 조회 시 반드시 `.returns<T>()` 또는 `select("*")` 사용. 절대 추론에만 의존 금지.

## 2026-05-13 — SQL 예약어 컬럼명 (`order`) → PostgREST 정렬 표현식 충돌
- **문제**: `cards.order` 컬럼에 대한 `.eq("order", N)` 호출이 동작하지 않음. update 시 WHERE 절이 무시돼 모든 행이 동일 값으로 덮어써졌고, 저장 직접 호출도 실패. "저장 실패" / "비어있는 카드가 있습니다" 증상.
- **원인**: PostgREST의 `order` 쿼리 파라미터가 **정렬 표현식 전용 예약어**. supabase-js 의 `.eq("order", N)` 가 `?order=eq.N` 으로 보내지면 정렬로 잘못 해석됨. `.select('"order"', ...)` 따옴표 escape 도 PostgREST 가 식별자 quote 로 받아 컬럼을 못 찾음.
- **해결**: 컬럼 rename `cards.order` → `cards.card_order` (마이그레이션 1줄). 모든 코드의 `.eq("order")` / `.order("order")` / `select("\"order\"")` 일괄 변경. client side 객체에서 `.order` 사용을 유지하고 싶으면 select 에 alias 사용 (`order:card_order`).
- **규칙**: 컬럼명을 정할 때 **SQL 예약어 + PostgREST 예약 쿼리 파라미터 (`select`/`order`/`limit`/`offset`/`columns`) 와 같은 이름 사용 금지**. 신규 스키마 작성 시 `card_order`, `display_order`, `position` 등 충돌 없는 이름.

## 2026-05-20 — Postgres `REVOKE EXECUTE` 는 PUBLIC 도 같이 빼야 한다
- **문제**: `handle_new_user()` SECURITY DEFINER 함수가 `/rest/v1/rpc/handle_new_user` 로 외부 호출 가능 (advisor 경고). `revoke execute ... from anon, authenticated;` 적용했는데 advisor 그대로.
- **원인**: Postgres 는 함수 생성 시 **PUBLIC role 에 EXECUTE 권한 자동 부여**. `anon`/`authenticated` 는 PUBLIC 의 멤버라서, PUBLIC 권한이 남아있는 한 멤버 role 에서 직접 revoke 해도 여전히 실행 가능.
- **해결**: `revoke execute on function ... from public;` 도 같이 적용. PUBLIC + 명시 role 둘 다 회수해야 진짜 차단.
- **규칙**: 신규 함수 생성 마이그레이션 작성 시 처음부터 `revoke execute on function X from public;` 한 줄을 같이 넣을 것. SECURITY DEFINER 면 더더욱.
- **검증 도구**: Supabase MCP 의 `get_advisors(type='security')` 가 PostgREST 노출 여부를 정확히 잡아줌. DDL 변경 후 항상 재실행.

## 2026-05-20 — Supabase MCP 로 마이그레이션 적용 (워크플로우 단순화)
- **상황**: 기존엔 `npx supabase db push --include-all` + `SUPABASE_DB_PASSWORD` 환경변수 + 비밀번호 특수문자 escape 신경써야 했음.
- **현재**: Supabase MCP 의 `apply_migration(project_id, name, query)` 한 번 호출로 DB 적용 + history 기록. 비밀번호 우회 불필요.
- **규칙**: 로컬 git 파일은 별도로 `supabase/migrations/<timestamp>_<name>.sql` 에 같이 작성. MCP 는 DB 적용용, 파일은 git 정합성용. 두 곳 모두 갱신해야 다음 환경(예: Vercel 자동 배포 시 supabase 빌드 단계)에서도 동일.
- **검증**: 적용 후 `list_migrations` + `get_advisors` 자동 호출로 즉시 검증 가능.

## 2026-05-20 — 커밋 = 푸시 (사용자 워크플로우)
- **규칙**: "커밋해줘" 요청 = `git commit` + `git push` 까지. 별도로 푸시 확인 묻지 말 것.
- **이유**: 사용자가 `main` 브랜치 → Vercel 자동 배포 흐름을 의도적으로 사용. 커밋만 하고 멈추면 워크플로우가 끊김.
- **예외**: 사용자가 명시적으로 "푸시는 하지 마" / "로컬에만 커밋" 이라고 한 경우. force push 류는 여전히 별도 확인.

## 2026-05-20 — role enum 의미와 UI 라벨 분리
- **문제**: `cards.role` enum에 `cta` 값을 두고 프롬프트로만 "외부 액션 유도 X, 시리즈 자체 완결" 정책을 강제했더니, UI 라벨 "CTA"가 의미를 거짓말하게 됨. 게다가 톤마다 같은 role(`cta`, `problem`)의 의미가 다른데(informative=인사이트 정리, emotional=여운) UI는 고정 라벨로만 표시.
- **원인**: 데이터 모델의 enum 이름이 도메인 의도와 불일치 + UI 라벨을 톤 컨텍스트 없이 고정 매핑.
- **해결**: enum 값 자체를 `cta` → `closing`으로 rename (`alter type ... rename value` 한 줄 마이그레이션). 라벨은 `src/lib/ai/roles.ts`의 `getRoleMeta(role, tone)` 헬퍼로 톤별 다르게 매핑 (예: closing → informative="인사이트 정리" / emotional="여운"). 색상은 role별로 일관 유지.
- **규칙**: enum 이름은 도메인 의도와 정확히 맞춰야 함. 같은 enum 값이 컨텍스트(여기선 톤)에 따라 의미가 달라진다면 UI 라벨은 헬퍼 함수로 동적 매핑. 인라인 `ROLE_LABELS` 같은 패턴을 여러 컴포넌트에 복붙하지 말 것.
- **부수효과**: `supabase.gen.ts`도 enum 'cta'→'closing' 두 곳 수동 동기 (CLI 재실행 시 동일 결과 보장). `cards.cta` 컬럼(text)은 role enum과 별개이며 항상 null이라 그대로 유지.

## 2026-05-13 — `.env.local.example` 보안 규칙
- **문제**: 사용자가 실제 API 키를 `.env.local.example` 에 입력 → git 커밋 위험.
- **원인**: `.gitignore` 에서 `!.env.local.example` 로 의도적 제외돼 있음 (포맷 공유 목적).
- **해결**: 실제 키는 `.env.local` 에만 입력. `.env.local.example` 은 placeholder 유지.
- **규칙**: 키 관련 작업 시 항상 `.env.local` 인지 `.env.local.example` 인지 명확히 안내. placeholder 복원 패턴 숙지.

## 2026-05-26 — Zod 기본 에러 메시지가 그대로 사용자에게 노출
- **문제**: 토픽 제출 시 "String must contain at most 200 character(s)" 영문 에러가 그대로 노출. UI textarea 에 `maxLength` 가 있어도 IME 조합/복붙/일부 환경에서 우회 가능.
- **원인**: server action 의 `parsed.error.issues.map((i) => i.message).join(", ")` 가 Zod 기본 영문 메시지를 그대로 join. schema 에 한국어 message 미지정.
- **해결**: Zod 체이닝에 `.min(2, { message: "..." }).max(500, { message: "..." })` 식으로 한국어 메시지 명시. 동시에 폼 `maxLength` + 안내 문구도 같은 숫자로 동기화.
- **부수 발견**: 같은 schema 의 `tone` enum 에 `issue` 값이 누락돼 있었음 (폼에는 5개 톤, schema 엔 4개). 새 enum 값 추가 시 server action validation 도 같이 갱신해야 함.
- **규칙**: 사용자 노출 가능성이 있는 모든 Zod schema 는 한국어 message 명시. enum 값 추가/변경 시 (1) DB enum, (2) gen types, (3) server action validation, (4) UI 옵션 — 4곳 모두 같이 갱신.

## 2026-05-26 — Instagram Graph API 캐러셀은 PNG 가 아니라 JPEG (핵심)
- **문제**: 발행 시 "컨테이너 처리 실패: ERROR". `next/og` 의 `ImageResponse` 가 PNG 를 출력 → 그대로 Storage 업로드 → IG 에 전달 → 컨테이너 단계에서 ERROR.
- **원인**: IG Graph API 는 공식적으로 **JPEG 만 지원**. PNG 는 알파 채널/비-sRGB 색공간 등으로 컨테이너 처리 단계에서 ERROR 로 잘 떨어짐. 게다가 `getContainerStatus` 가 `status_code` 만 가져와서 IG 가 알려주는 사유(`status` verbose 필드)를 못 봐 진단도 불가능했음.
- **해결**: (1) `sharp` 추가. publish 직전에 PNG buffer 를 `sharp(pngBuf).flatten({ background: "#ffffff" }).jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer()` 로 JPEG 변환. 업로드 경로/MIME 도 `.jpg` + `image/jpeg`. (2) `getContainerStatus` 가 `status_code,status` 둘 다 fetch 하도록 변경, `waitForFinished` 에러 메시지에 verbose status + container_id 같이 노출.
- **규칙**: 외부 플랫폼에 이미지 올릴 때는 항상 **공식 지원 포맷** 확인. IG = JPEG, X = JPEG/PNG/WebP/GIF 등. `next/og` 결과를 외부에 그대로 보내지 말 것 — 항상 변환 한 단계 거치기. 폴링 기반 외부 API 는 처음부터 verbose status/error fields 같이 요청해서 진단 가능하게 설계.
- **JPEG 변환 옵션 메모**: 카드뉴스처럼 텍스트 비중이 큰 이미지는 `chromaSubsampling: "4:4:4"` (기본 4:2:0 은 텍스트 가장자리 색번짐). `mozjpeg: true` 로 동일 화질 대비 파일 크기 축소.

---
