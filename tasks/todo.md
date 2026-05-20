# 카드뉴스 메이커 작업 목록

## 진행 상황
- 시작: 2026-05-13
- v0.1 릴리스: 2026-05-13
- 현재 상태: **Phase 7 완료 — 운영 진입 (2026-05-20 기준)**
- 다음 마일스톤: 운영하며 발견되는 이슈 수정 + v0.2 (예약 발행 등)

---

## Phase 0. 프로젝트 초기 셋업 ✅
- [x] `.gitignore`, `package.json`, `tsconfig.json` 등 초기 파일 생성
- [x] Next.js 16 + TypeScript + Tailwind 셋업 (App Router, src 디렉토리)
- [x] 핵심 의존성 설치
  - [x] `next`, `react`, `react-dom`, `typescript`, `tailwindcss`
  - [x] `@supabase/supabase-js`, `@supabase/ssr`
  - [x] `@anthropic-ai/sdk`, `@google/genai`, `openai`
  - [x] `@vercel/og` (Satori 기반 OG 이미지 렌더링)
  - [x] `zod` (스키마 검증), `react-hook-form`
  - [x] `lucide-react` (아이콘), `recharts` (사용량 차트)
- [x] `.env.local.example` 작성
- [x] `git init` + 초기 커밋
- [x] 로컬 빌드 확인 (`npm run build`)

## Phase 1. 데이터 기반 구축 ✅
- [x] **DB 스키마** Supabase 마이그레이션
  - [x] `brand_profiles` / `projects` / `research_reports` / `plans` / `cards` / `usage_logs` / `api_credentials`
- [x] RLS 정책 (모든 테이블 `auth.uid() = user_id` 기본)
- [x] Supabase Storage 버킷 3개: `brand-logos`, `card-images`, `rendered-cards`
- [x] Supabase TS 타입 자동 생성 (`npm run gen:types` → `supabase.gen.ts` wrapper 패턴)
- [x] API 클라이언트 헬퍼
  - [x] Supabase 서버/클라이언트 헬퍼 (`@supabase/ssr`)
  - [x] Anthropic 클라이언트 + 사용량 로깅 래퍼 (`lib/ai/anthropic.ts`)
  - [x] Google AI (Nano Banana Pro) 클라이언트 + 로깅 (`lib/ai/google.ts`)
  - [x] OpenAI (GPT Image 2) 클라이언트 + 로깅 (`lib/ai/openai.ts`)
- [x] 비용 단가표 상수 파일 (`src/lib/pricing.ts`)

## Phase 2. 인증 + 기본 레이아웃 ✅
- [x] Supabase Auth (이메일 매직링크)
- [x] `src/proxy.ts` 로 보호 라우트 설정 (Next.js 16 컨벤션)
- [x] 사이드바 네비게이션 (다크모드 기본)
  - [x] 대시보드 / 새 카드뉴스 / 프로젝트 / 브랜드 / 사용량 / 설정
- [x] 설정 페이지 (`/settings`) — API 키 입력·테스트·암호화 저장
- [x] 브랜드 에셋 관리 (`/brands`) — 프로파일 CRUD + 로고 업로드

## Phase 3. 메인 워크플로우 5단계 위저드 ✅
- [x] **3-1. 토픽 입력** (`/new/topic`) — 폼 + 브랜드 프로파일 선택 + 일회성 오버라이드
- [x] **3-2. 리서치** (`/new/research/:id`) — Opus 4.7 + web_search 도구
- [x] **3-3. 기획안** (`/new/plan/:id`) — Opus 4.7, 톤별 카드 흐름 분기
- [x] **3-4. 카피** (`/new/copy/:id`) — Sonnet 4.6, 카드별 인라인 편집·재생성
- [x] **3-5. 디자인** (`/new/design/:id`)
  - [x] 시각적 3-step stepper (프롬프트 → 배경 → 합성)
  - [x] 배경 생성 엔진 토글 (Nano Banana Pro / GPT Image 2)
  - [x] Satori 1080×1080 합성
  - [x] 미리보기 캐러셀 + 개별/ZIP 다운로드
  - [x] 인스타 캡션·해시태그 자동 생성 (Haiku 4.5)
- [x] **(추가)** 톤별 카드 역할 라벨 동적 매핑 (`getRoleMeta`)
- [x] **(추가)** `cta` → `closing` enum rename (외부 액션 유도 X, 끝맺음 메시지로 명확화)

## Phase 4. 사용량 모니터링 ✅
- [x] `/usage` 페이지 (모델별 집계 / 일별 추이 / 단계별 분석)
- [x] 대시보드(`/`) 위젯 — 이번 달 총 비용 + 최근 프로젝트
- [x] 월 예산 한도 + 80%/100% 경고 배너

## Phase 5. 프로젝트 히스토리 ✅
- [x] `/projects` 목록
- [x] `/projects/:id` 상세 (리서치/기획/카피 전체 이력)
- [x] "복제 후 수정"

## Phase 6. 인스타그램 자동 발행 ✅
- [x] **6-1. Supabase 마이그레이션** (`instagram_accounts` 테이블 + `projects.published_*` 컬럼)
- [x] **6-2. Meta Developer 앱 셋업**
- [x] **6-3. OAuth 콜백 라우트** (`/auth/instagram/start`, `/auth/instagram/callback`)
- [x] **6-4. 설정 페이지에 "Instagram 연결" 섹션**
- [x] **6-5. 발행 lib** (`lib/ig/publish.ts` — 자식/부모 컨테이너 + media_publish + 폴링)
- [x] **6-6. 디자인 페이지 "지금 발행" 버튼** + permalink 표시
- [x] **6-7. 토큰 만료일 표시** (자동 refresh 는 v2 예정)

## Phase 7. 검증 & 배포 ✅
- [x] `npx tsc --noEmit` 통과
- [x] `npm run build` 통과 (`.env.local` 키 설정 후)
- [x] 핵심 시나리오 1편 풀 워크플로우 로컬 실제 완성
- [x] **RLS 정책 누락 점검** — Supabase MCP `get_advisors` 로 자동 검출, ERROR 0건. 부수 WARN 5건은 의식적 보류 (실데이터 노출 없음, 향후 처리)
- [x] **handle_new_user RPC 외부 노출 차단** (2026-05-20 — PUBLIC + anon + authenticated EXECUTE revoke)
- [x] Vercel 환경변수 등록 + Preview 배포
- [x] 운영 비용 1편 실측
- [x] main 머지 → 프로덕션

---

## Phase 7 보류 항목 (운영 중 처리)

WARN 수준 보안 권고 5건 — 데이터 노출 없으나 디펜스 인 뎁스 차원에서 향후 정리:
- [ ] `set_updated_at()` 함수 search_path 고정 (`SET search_path = ''`)
- [ ] Public Storage 버킷(`brand-logos`, `card-images`, `rendered-cards`) SELECT policy 좁히기 (listing 차단, 직접 URL 접근만 허용)
- [ ] Supabase Auth → Leaked Password Protection 활성화 (Dashboard GUI)

## v0.2 후보 (운영하며 결정)
- [ ] **Sentry 도입** — 프로덕션 에러 추적 (Phase 7 진입 시 미루기로 결정. 운영 중 묻히는 에러 발견되면 즉시 적용)
- [ ] **GitHub MCP 연결** — PR/이슈 채팅 통합 (사용자 보류, 필요 시 추가)
- [ ] **인스타 예약 발행** — 스케줄 큐 + 자동 트리거
- [ ] **카드뉴스 시리즈 묶음** — 복수 프로젝트를 하나의 캠페인으로

---

## 완료 후 리뷰 (v0.1)

### 잘 된 점
- **HITL 게이트 패턴**: 5단계 위저드 각 단계에서 컨펌 받는 흐름이 잘 작동. 결과물 품질 안정적.
- **톤별 카드 흐름 분기**: 모든 톤에 problem→solution→proof 를 기계적으로 적용하지 않고, 톤(informative/issue/emotional/humorous/sophisticated)마다 다른 카드 구성 패턴 강제. 정보형 vs 감성형 vs 이슈형이 실제로 다르게 나옴.
- **사용량 단계별 로깅**: research/plan/copy/image 별로 따로 집계되어 1편당 어디서 비용이 많이 드는지 가시화.
- **role enum 의미 정합성**: 초기에 `cta` 로 두고 프롬프트로 "외부 액션 유도 X" 강제했던 게 거짓말이라 `closing` 으로 rename + 톤별 동적 라벨 헬퍼 도입. 데이터 모델이 의도와 정확히 일치.
- **Supabase MCP 워크플로우**: `apply_migration` + `get_advisors` 로 DB 작업이 채팅에서 끝남. 비밀번호 escape 같은 부수 작업 사라짐.

### 개선할 점
- **워딩 다듬기가 작은 PR 로 누적**: 첫 릴리스에서 워딩에 신경 못 쓴 부분이 톤별 라벨 작업과 함께 묶여 처리됐음. 다음엔 워딩 가이드를 spec 작성 시점에 한 번 정해두면 좋겠음.
- **보안 advisor 5건 미처리**: WARN 이지만 운영 진입 전에 끝낼 수도 있었음. 우선순위 판단은 합리적이었으나 처리 기준을 명확히 (ERROR 만 차단 / WARN 도 시간 두고 처리).
- **풀 워크플로우 통합 테스트가 수동**: 토픽→발행까지 한 번 돌려보는 게 사람의 손에 의존. 핵심 경로 e2e 자동화는 v0.2 검토.

### lessons.md 에 추가된 패턴
- role enum 의미와 UI 라벨 분리 (톤 컨텍스트 헬퍼)
- Postgres REVOKE EXECUTE 는 PUBLIC 도 같이 빼야 함
- Supabase MCP 마이그레이션 워크플로우 (DB + git 정합성)
- 커밋 = 푸시 (main → Vercel 자동 배포)
- (기존) Next.js 16 / Supabase ssr 버전 / PostgREST order 예약어 / gen types 후처리 등
