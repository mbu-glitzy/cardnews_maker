-- handle_new_user() 는 auth.users INSERT 트리거 전용 함수.
-- 그런데 SECURITY DEFINER + public 스키마에 있어서 PostgREST 가 자동으로
-- /rest/v1/rpc/handle_new_user 엔드포인트로 노출시킴. anon/authenticated 가
-- 외부에서 임의 호출 가능한 상태였음 (의도된 동작 아님).
--
-- 트리거에서는 owner 권한으로 실행되므로 EXECUTE 권한 revoke 해도 정상 작동.
revoke execute on function public.handle_new_user() from anon, authenticated;
