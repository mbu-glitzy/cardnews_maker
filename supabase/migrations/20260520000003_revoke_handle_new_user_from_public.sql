-- 직전 마이그레이션(20260520000002)에서 anon, authenticated 의 EXECUTE 만 revoke 했는데,
-- Postgres 는 함수 생성 시 PUBLIC role 에게 EXECUTE 를 자동 부여한다.
-- anon/authenticated 는 PUBLIC 의 멤버이므로 PUBLIC 권한이 남아있는 한 여전히 실행 가능.
-- PUBLIC 에서도 revoke 해야 advisor 가 통과.
revoke execute on function public.handle_new_user() from public;
