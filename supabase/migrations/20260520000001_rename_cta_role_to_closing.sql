-- card_role enum: 'cta' → 'closing'
-- 마지막 카드의 역할이 "외부 액션 유도"가 아니라 "시리즈 자체 완결의 끝맺음 메시지"라는
-- 의미를 정확히 반영하기 위한 rename. 기존 데이터는 자동 마이그레이션됨.
alter type public.card_role rename value 'cta' to 'closing';
