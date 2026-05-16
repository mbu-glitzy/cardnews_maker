# 카드뉴스 메이커 작업 목록

## 진행 상황
- 시작: 2026-05-13
- 상태: 진행중
- 현재 Phase: Phase 1 (기반 작업)

---

## Phase 0. 프로젝트 초기 셋업
- [ ] `.gitignore`, `package.json`, `tsconfig.json` 등 초기 파일 생성
- [ ] Next.js 15 + TypeScript + Tailwind 수동 설정 (App Router, src 디렉토리)
- [ ] 핵심 의존성 설치
  - [ ] `next`, `react`, `react-dom`, `typescript`, `tailwindcss`
  - [ ] `@supabase/supabase-js`, `@supabase/ssr`
  - [ ] `@anthropic-ai/sdk`, `@google/genai`, `openai`
  - [ ] `@vercel/og` (Satori 기반 OG 이미지 렌더링)
  - [ ] `zod` (스키마 검증), `react-hook-form`
  - [ ] `lucide-react` (아이콘), `recharts` (사용량 차트)
- [ ] `.env.local.example` 작성
- [ ] `git init` + 초기 커밋
- [ ] 로컬 빌드 확인 (`npm run build`)

## Phase 1. 데이터 기반 구축
- [ ] **DB 스키마** Supabase 마이그레이션 작성
  - [ ] `brand_profiles`
  - [ ] `projects`
  - [ ] `research_reports`
  - [ ] `plans`
  - [ ] `cards`
  - [ ] `usage_logs`
  - [ ] `api_credentials`
- [ ] RLS 정책 (모든 테이블 `auth.uid() = user_id` 기본)
- [ ] Supabase Storage 버킷 2개: `brand-logos`, `card-images`
- [ ] Supabase TS 타입 자동 생성 (`supabase gen types`)
- [ ] API 클라이언트 헬퍼
  - [ ] Supabase 서버/클라이언트 헬퍼 (`@supabase/ssr`)
  - [ ] Anthropic 클라이언트 + 사용량 로깅 래퍼
  - [ ] Google AI (Nano Banana Pro) 클라이언트 + 로깅
  - [ ] OpenAI (GPT Image 2) 클라이언트 + 로깅
- [ ] 비용 단가표 상수 파일 (`src/lib/pricing.ts`)

## Phase 2. 인증 + 기본 레이아웃
- [ ] Supabase Auth (이메일 매직링크)
- [ ] 미들웨어로 보호 라우트 설정
- [ ] 사이드바 네비게이션 (다크모드 기본)
  - [ ] 대시보드 / 새 카드뉴스 / 프로젝트 / 브랜드 / 사용량 / 설정
- [ ] 설정 페이지 (`/settings`) — API 키 입력·테스트·암호화 저장
- [ ] 브랜드 에셋 관리 (`/brands`) — 프로파일 CRUD + 로고 업로드

## Phase 3. 메인 워크플로우 5단계 위저드
- [ ] **3-1. 토픽 입력** (`/new/topic`)
  - 폼 + 브랜드 프로파일 선택 + 일회성 오버라이드
- [ ] **3-2. 리서치** (`/new/research/:id`) — Opus 4.7 + web_search 도구
  - 스트리밍 응답 + 출처 카드 표시
- [ ] **3-3. 기획안** (`/new/plan/:id`) — Opus 4.7
- [ ] **3-4. 카피** (`/new/copy/:id`) — Sonnet 4.6
  - 카드별 인라인 편집 + 개별 재생성
- [ ] **3-5. 디자인** (`/new/design/:id`)
  - 배경 생성 (엔진 토글: Nano Banana Pro 기본 / GPT Image 2)
  - Satori로 1080×1080 합성
  - 미리보기 캐러셀 + 개별/ZIP 다운로드
  - (옵션) 인스타 캡션·해시태그 자동 생성 (Haiku 4.5)

## Phase 4. 사용량 모니터링
- [ ] `/usage` 페이지
  - 모델별 집계 표
  - 일별 추이 라인 차트
  - 프로젝트별 1편당 비용
- [ ] 대시보드(`/`) 위젯 — 이번 달 총 비용 + 최근 프로젝트
- [ ] 월 예산 한도 + 80%/100% 경고 배너

## Phase 5. 프로젝트 히스토리
- [ ] `/projects` 목록
- [ ] `/projects/:id` 상세 (리서치/기획/카피 전체 이력)
- [ ] "복제 후 수정"

## Phase 6. 인스타그램 자동 발행
- [ ] **6-1. Supabase 마이그레이션** (`instagram_accounts` 테이블 + `projects.published_*` 컬럼)
- [ ] **6-2. Meta Developer 앱 셋업** (사용자가 직접 — 가이드 제공)
- [ ] **6-3. OAuth 콜백 라우트** (`/auth/instagram/start`, `/auth/instagram/callback`)
  - short-lived → long-lived 변환
  - 토큰 암호화 저장
- [ ] **6-4. 설정 페이지에 "Instagram 연결" 섹션**
  - 미연결 상태 / 연결됨 (이름·만료일·해제 버튼)
- [ ] **6-5. 발행 lib (`lib/ig/publish.ts`)**
  - 자식 컨테이너 N개 생성
  - 부모 캐러셀 컨테이너 생성
  - `media_publish` 호출
  - 처리 대기 (`status_code` 폴링)
- [ ] **6-6. 디자인 페이지 / 프로젝트 상세에서 "지금 발행" 버튼**
  - 발행 진행 표시 → 성공 시 permalink 표시
- [ ] **6-7. 토큰 갱신 알림 또는 자동 refresh**

## Phase 7. 검증 & 배포
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run build` 통과
- [ ] 핵심 시나리오 1편 풀 워크플로우 로컬 실제 완성
- [ ] RLS 정책 누락 점검
- [ ] Vercel 환경변수 등록 + Preview 배포
- [ ] 운영 비용 1편 실측 → spec.md 기대치와 비교
- [ ] main 머지 → 프로덕션

---

## 완료 후 리뷰
- 잘 된 점:
- 개선할 점:
- lessons.md에 추가할 내용:
