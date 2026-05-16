# 카드뉴스 메이커 (Cardnews Maker)

## 목적
- 마케팅 에이전시 대표가 자사 인스타그램 운영에 쓸 카드뉴스를 **토픽 입력 한 번으로 리서치 → 기획 → 카피 → 디자인 → 인스타 발행까지 자동화**할 수 있는 1인 운영 도구.
- 자사 계정 **브랜딩을 위한 정보성 콘텐츠** 발행이 목적. 광고/구매 유도 형식이 아니라 가치 전달·인사이트 큐레이션·저장 가치가 있는 시리즈를 만든다. (→ 카드 카피에 광고형 CTA 사용 X)
- 단계마다 HITL(컨펌) 게이트를 두어 품질을 보장하고, 브랜드 에셋(로고/컬러/폰트) 일관성을 100% 유지한다.
- AI 모델별 사용량·비용을 항상 가시화해 운영 비용을 통제한다.

## 사용자 스토리
- **대표(나)로서**, 토픽 하나만 입력하면 공신력 있는 출처가 포함된 리서치 보고서를 받고 싶다. *수동 리서치 시간을 줄이기 위해.*
- **대표로서**, 기획안(타겟·핵심 메시지·카드 구성)을 미리 검토하고 컨펌한 뒤 카피·디자인 단계로 넘어가고 싶다. *방향이 틀어진 상태로 디자인까지 가는 낭비를 막기 위해.*
- **대표로서**, 카드별 카피를 미리 보고 직접 수정한 뒤 디자인으로 넘기고 싶다. *AI 카피의 톤을 내 브랜드 보이스에 맞추기 위해.*
- **대표로서**, 우리 회사 브랜드 에셋이 모든 카드에 자동 적용되되, 특정 콘텐츠에는 일회성으로 다른 톤을 쓰고 싶다. *시리즈 일관성 + 특별 기획물 유연성을 모두 잡기 위해.*
- **대표로서**, 어떤 AI 모델을 얼마나 썼고 비용이 얼마인지 한 화면에서 보고 싶다. *예측 가능한 운영 비용 관리를 위해.*

---

## 기능 요구사항

### F1. 새 카드뉴스 제작 (메인 워크플로우)
- [ ] **F1-1. 토픽 입력**
  - 토픽 텍스트 입력
  - 톤(정보형/감성형/유머/세련 등) 선택
  - 카드 수(5~8장) 선택
  - 사용할 브랜드 에셋 프로파일 선택 ("기본" 또는 "이번만 변경")
- [ ] **F1-2. 리서치 (Opus 4.7 + web_search)**
  - 토픽 기반 웹 리서치 자동 실행
  - 결과: 핵심 사실 5~10개, 통계/인용, **출처 URL 포함**
  - 신뢰도 표시(공식 기관/언론/블로그 등 출처 분류)
  - HITL 게이트: 보고서 검토 → 수정 요청 가능 → 컨펌
- [ ] **F1-3. 기획안 생성 (Opus 4.7)**
  - 입력: 리서치 보고서 + 토픽 + 톤
  - 출력: 타겟 페르소나, 핵심 메시지 1줄, 카드 N장의 흐름(각 카드 역할: 후킹/문제/해법/근거/마무리 등)
  - HITL 게이트: 기획안 전체 재생성 + **카드별 개별 재생성** + 컨펌
- [ ] **F1-4. 카피 생성 (Sonnet 4.6)**
  - 카드별로 헤드라인 + 본문(2~4줄) 생성 (광고형 CTA 사용 안 함 — 브랜딩 콘텐츠 목적)
  - 마지막 카드는 인사이트 정리 / 다음 콘텐츠 예고 / 저장 유도 톤으로 자연스럽게 마무리
  - 카드별 인라인 편집 가능
  - 카드별 "재생성" 버튼 (해당 카드만)
  - HITL 게이트: 전체 컨펌
- [ ] **F1-5. 배경 이미지 생성 (Nano Banana Pro / GPT Image 2 선택)**
  - 카드별 배경 이미지 자동 생성
  - 시리즈 일관성을 위해 첫 카드 스타일을 reference로 후속 카드에 전달
  - 카드별 "재생성" / "프롬프트 직접 편집" 가능
  - 엔진 토글: 기본 Nano Banana Pro / 옵션 GPT Image 2
- [ ] **F1-6. 합성 렌더링 (코드 기반, @vercel/og or Satori)**
  - 1080×1080 PNG 출력
  - 배경 이미지 위에 헤드라인/본문/로고/페이지 번호를 코드로 합성
  - 브랜드 컬러 오버레이, 폰트 적용
  - 카드별 텍스트 위치 템플릿 2~3종 (상단/중앙/하단)
- [ ] **F1-7. 미리보기 & 다운로드**
  - 전체 카드 미리보기 (캐러셀)
  - 개별 PNG 다운로드 + 전체 ZIP 다운로드
  - (옵션) 인스타용 캡션·해시태그 자동 생성 (Haiku 4.5)

- [ ] **F1-8. 인스타그램 자동 발행 (Phase 6)**
  - 완료된 카드뉴스를 연결된 인스타 비즈니스 계정에 캐러셀 형태로 게시
  - 흐름: 카드 N장 이미지 → 자식 미디어 컨테이너 N개 생성 → 부모 캐러셀 컨테이너 생성 → 발행
  - 캡션 + 해시태그 함께 게시
  - 발행 결과(`post_id`, permalink) 프로젝트에 저장
  - "지금 발행" / "예약 발행" 선택 (예약은 v2)

### F2. 브랜드 에셋 관리
- [ ] 브랜드 프로파일 CRUD (이름·설명)
- [ ] 로고 업로드 (PNG, 투명 배경 권장)
- [ ] 메인 컬러 / 서브 컬러 / 텍스트 컬러 (HEX)
- [ ] 메인 폰트 / 서브 폰트 (Google Fonts 또는 업로드)
- [ ] 기본 프로파일 1개 지정
- [ ] 프로파일별 미리보기 카드 1장 자동 생성 (시각 확인용)

### F3. AI 사용량 모니터링
- [ ] **F3-1. 대시보드 위젯** (홈에 요약 카드)
  - 이번 달 총 비용 / 모델별 비용 / 카드뉴스 제작 수
- [ ] **F3-2. 사용량 상세 페이지**
  - 기간 필터 (오늘/이번 주/이번 달/사용자 지정)
  - 모델별 집계 표:
    - Claude Opus 4.7: 입력/출력 토큰, 호출 수, 비용
    - Claude Sonnet 4.6: 입력/출력 토큰, 호출 수, 비용
    - Claude Haiku 4.5: 입력/출력 토큰, 호출 수, 비용
    - Nano Banana Pro: 이미지 수, 비용
    - GPT Image 2: 이미지 수, 비용 (품질별 분리: Low/Med/High)
  - 일별 비용 추이 차트
  - 프로젝트별 비용 분석 (카드뉴스 1편당 평균 비용)
- [ ] **F3-3. 예산 경고**
  - 월 예산 한도 설정
  - 80%/100% 도달 시 화면 상단 배너 표시

### F4. 프로젝트 히스토리
- [ ] 과거 제작 카드뉴스 목록 (썸네일 + 토픽 + 날짜)
- [ ] 상세 페이지에서 리서치/기획/카피 전체 이력 조회
- [ ] 기존 프로젝트 "복제 후 수정" 기능 (시리즈 운영 편의)

### F5. 설정
- [ ] API 키 관리 (Anthropic / Google AI / OpenAI)
  - 입력 폼 + 마스킹 표시
  - 연결 테스트 버튼
- [ ] 기본 카드 수, 기본 톤, 기본 엔진 등 디폴트 설정
- [ ] **인스타그램 계정 연결 (Phase 6)**
  - "Facebook으로 연결" 버튼 → OAuth 흐름
  - 연결된 IG Business 계정 + 페이지 이름 표시
  - long-lived 토큰 만료 시각 표시 (60일)
  - 토큰 자동 갱신 또는 갱신 알림
  - 연결 해제

### F6. 인스타그램 발행 (Phase 6)
- [ ] **F6-1. Meta OAuth 흐름**
  - Facebook Login (Instagram Login 방식도 가능하나 페이지 연결은 필요)
  - 권한: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`
  - short-lived → long-lived (60일) 변환 후 암호화 저장
- [ ] **F6-2. 발행 실행 (디자인 단계 또는 프로젝트 상세에서)**
  - 카드 이미지 N장의 공개 URL 확보 (Supabase Storage)
  - 각 이미지마다 자식 컨테이너 생성 (`POST /{ig-user-id}/media?image_url=...&is_carousel_item=true`)
  - 부모 캐러셀 컨테이너 생성 (`POST /{ig-user-id}/media?media_type=CAROUSEL&children=...&caption=...`)
  - 발행 (`POST /{ig-user-id}/media_publish?creation_id=...`)
  - 결과 저장: `projects.published_post_id`, `projects.published_permalink`, `projects.published_at`
- [ ] **F6-3. 발행 실패 처리**
  - 토큰 만료 → 재로그인 안내
  - rate limit → 에러 표시 + 재시도 안내
  - 컨테이너 처리 대기 (`status_code=IN_PROGRESS`) → 폴링

---

## 비기능 요구사항

### 성능
- 카드뉴스 1편(6장 기준) 전체 생성 시간 **5분 이내** 목표 (HITL 대기 시간 제외)
- 이미지 생성은 카드별 병렬 호출

### 보안
- Supabase Auth (1인 사용이지만 인증 필수)
- API 키는 Supabase의 암호화된 컬럼에 저장 (절대 클라이언트 노출 금지)
- 모든 외부 API 호출은 **Server Action / Route Handler**에서만 실행
- RLS: 모든 테이블 활성화, `auth.uid() = user_id` 기본 정책

### 제약
- 1인 사용 가정 → 동시성 고려 최소화
- 카피·기획 단계에선 스트리밍 응답 사용 (UX 개선)
- 이미지 저장은 Supabase Storage (PNG, 1080×1080 기준 ~500KB 예상)
- 모바일 대응 우선순위 낮음 (데스크탑 작업 위주)

### 비용 관리
- 모든 AI 호출은 **사용량 로깅 후 응답** (실패해도 로깅은 시도)
- 토큰 카운팅은 SDK 응답의 `usage` 객체 기준
- 이미지 호출은 응답 코드 200일 때만 과금 카운트

---

## 데이터 모델

### `brand_profiles`
| 필드 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | auth.users 참조 |
| name | text | 프로파일 이름 |
| logo_url | text | Supabase Storage URL |
| color_primary | text | HEX |
| color_secondary | text | HEX |
| color_text | text | HEX |
| font_primary | text | 폰트명 또는 파일 URL |
| font_secondary | text | |
| is_default | boolean | |
| created_at | timestamptz | |

### `projects`
| 필드 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| topic | text | |
| tone | text | |
| card_count | int | 5~8 |
| brand_profile_id | uuid | brand_profiles 참조 (옵션) |
| brand_override | jsonb | 일회성 브랜드 변경 시 |
| status | text | draft/researching/planning/copywriting/imaging/completed/published |
| caption | text | 인스타 캡션 |
| hashtags | text[] | 해시태그 배열 |
| published_post_id | text | Phase 6 — IG 게시물 ID |
| published_permalink | text | Phase 6 — IG 게시물 URL |
| published_at | timestamptz | Phase 6 — 발행 시각 |
| created_at | timestamptz | |

### `research_reports`
| 필드 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| project_id | uuid | |
| content | jsonb | 사실, 출처 URL 배열, 신뢰도 |
| confirmed_at | timestamptz | HITL 컨펌 시각 |

### `plans`
| 필드 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| project_id | uuid | |
| target_persona | text | |
| key_message | text | |
| card_outline | jsonb | [{order, role, summary}, ...] |
| confirmed_at | timestamptz | |

### `cards`
| 필드 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| project_id | uuid | |
| order | int | 1~N |
| role | text | hook/problem/solution/proof/cta |
| headline | text | |
| body | text | |
| cta | text | (마지막 카드만) |
| image_prompt | text | AI 이미지 프롬프트 |
| image_url | text | 배경 이미지 |
| rendered_url | text | 최종 합성된 1080×1080 PNG |
| engine | text | nano-banana-pro / gpt-image-2 |

### `usage_logs`
| 필드 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| project_id | uuid | nullable |
| model | text | claude-opus-4-7 / claude-sonnet-4-6 / claude-haiku-4-5 / nano-banana-pro / gpt-image-2 |
| operation | text | research / plan / copy / image / metadata |
| input_tokens | int | nullable (이미지 모델은 null) |
| output_tokens | int | nullable |
| image_count | int | nullable (텍스트 모델은 null) |
| image_quality | text | nullable (low/medium/high) |
| cost_usd | numeric(10,4) | 호출 직후 단가표로 계산 |
| created_at | timestamptz | |

### `api_credentials`
| 필드 | 타입 | 비고 |
|---|---|---|
| user_id | uuid PK | |
| anthropic_key_encrypted | text | |
| google_ai_key_encrypted | text | |
| openai_key_encrypted | text | |
| monthly_budget_usd | numeric | nullable |

### `instagram_accounts` (Phase 6)
| 필드 | 타입 | 비고 |
|---|---|---|
| user_id | uuid PK | |
| ig_user_id | text | Instagram Business Account ID |
| ig_username | text | @handle |
| fb_page_id | text | 연결된 Facebook Page ID |
| fb_page_name | text | 페이지 이름 (표시용) |
| access_token_encrypted | text | long-lived token (60일) |
| token_expires_at | timestamptz | 만료 시각 |
| connected_at | timestamptz | |
| updated_at | timestamptz | |

---

## UI/UX 방향

### 페이지 구조
```
/                       대시보드 (이번 달 사용량 요약 + 최근 프로젝트)
/new                    새 카드뉴스 만들기 (단계별 위저드)
  /new/topic            1단계. 토픽 입력
  /new/research/:id     2단계. 리서치 검토
  /new/plan/:id         3단계. 기획안 검토
  /new/copy/:id         4단계. 카피 편집
  /new/design/:id       5단계. 디자인 생성 & 미리보기
/projects               프로젝트 목록
/projects/:id           프로젝트 상세 (전체 이력 + 발행 버튼)
/brands                 브랜드 에셋 관리
/usage                  AI 사용량 모니터링
/settings               API 키 / 디폴트 설정 / 인스타 계정 연결 (Phase 6)
/auth/instagram/start   인스타 OAuth 시작 (Phase 6)
/auth/instagram/callback인스타 OAuth 콜백 (Phase 6)
```

### 핵심 인터랙션
- **위저드 진행 표시**: 상단에 5단계 stepper, 각 단계 컨펌 시 다음으로 이동
- **HITL 컨펌 UX**: 각 단계 결과 카드 하단에 [수정 요청] / [재생성] / [컨펌하고 다음] 3버튼
- **스트리밍 응답**: 리서치/기획/카피 생성 시 텍스트가 실시간으로 흘러나오게
- **카드 그리드**: 카피·디자인 단계에서 카드들을 격자로 펼쳐 보여주고, 카드별 개별 액션 가능
- **사용량 대시보드**: 도넛 차트(모델 비중) + 라인 차트(일별 추이) + 테이블(상세)

### 디자인 톤
- 다크 모드 우선 (디자이너 친화적, 색상 판단에 유리)
- Tailwind 기본 팔레트 사용, 강조 컬러 1개만 (예: indigo)
- 깔끔한 카드 기반 레이아웃, 여백 넉넉히

---

## 완료 기준 (Definition of Done)
- [ ] 토픽 입력 → 다운로드까지 풀 워크플로우 로컬에서 1편 실제 완성
- [ ] 브랜드 에셋 프로파일 등록 후 카드뉴스에 자동 반영 확인
- [ ] 사용량 페이지에서 위 1편 제작 비용이 정확히 집계되는지 확인
- [ ] `npx tsc --noEmit` 오류 없음
- [ ] `npm run build` 성공
- [ ] Supabase RLS 모든 테이블 활성화 확인
- [ ] API 키 모두 Vercel 환경변수 또는 DB 암호화 컬럼에 저장 (코드에 노출 없음)
- [ ] Vercel Preview 배포 정상 동작
- [ ] 핵심 케이스 테스트:
  - [ ] 리서치 단계에서 출처 URL이 클릭 가능한 형태로 표시되는가
  - [ ] 카피 수정 후 디자인 단계로 넘어가도 수정사항이 반영되는가
  - [ ] 브랜드 일회성 변경이 해당 프로젝트에만 적용되는가
  - [ ] 사용량 합계가 모델별 단가표와 일치하는가
  - [ ] 월 예산 80% 초과 시 경고 배너가 표시되는가
