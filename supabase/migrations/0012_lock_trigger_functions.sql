-- Security advisor clean-up. Safe while live, safe to run twice.
--
-- handle_new_user (sign-up trigger) and rls_auto_enable (event trigger that
-- turns on RLS for new tables) are SECURITY DEFINER and were callable by
-- anyone through /rest/v1/rpc/... because Postgres grants EXECUTE to PUBLIC
-- by default. Triggers don't check EXECUTE when they fire, so revoking it
-- only removes the direct API call.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- A SECURITY DEFINER function without a fixed search_path can be tricked
-- into resolving `profiles` to an attacker-created object.
alter function public.handle_new_user() set search_path = public;
