-- ============================================================
-- cards."order" → cards.card_order
--
-- "order" 가 SQL 예약어라 PostgREST의 정렬 query param 과 충돌:
-- supabase-js 의 .eq("order", N) 호출이 정렬 표현식으로 잘못 해석돼
-- WHERE 조건이 적용되지 않음. → 전체 행 update / 조회 실패 등 부작용.
--
-- 해결: 컬럼 rename. 코드도 함께 card_order 로 통일.
-- ============================================================

alter table public.cards rename column "order" to card_order;

-- (project_id, order) unique constraint 도 새 이름으로 자동 따라옴
