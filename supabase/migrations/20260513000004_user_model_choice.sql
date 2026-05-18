-- ============================================================
-- 리서치/기획 단계의 모델을 사용자가 선택할 수 있도록.
--   - opus (Claude Opus 4.7) : 정교한 추론, 비싸지만 품질 최상
--   - sonnet (Claude Sonnet 4.6) : 가성비 좋음, 약 5배 저렴
-- 카피·이미지 프롬프트·캡션은 모델이 고정 (Sonnet/Haiku).
-- ============================================================

alter table public.api_credentials
  add column if not exists research_model text not null default 'claude-opus-4-7',
  add column if not exists planning_model text not null default 'claude-opus-4-7';
