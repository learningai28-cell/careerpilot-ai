-- Try-before-signup quick ATS check on the landing page (public-ats-check).
-- Anyone can call it without an account, so every call is logged here and
-- the function refuses once an IP (hashed, never stored raw) or the whole
-- site passes its daily cap. Resume text is never stored.
--
-- Only the Edge Function (service role) touches this table: RLS on, no
-- grants to anon/authenticated.
create table if not exists public.anon_ats_checks (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  ats_score int,
  tokens_used int,
  created_at timestamptz not null default now()
);

alter table public.anon_ats_checks enable row level security;
revoke all on public.anon_ats_checks from anon, authenticated;
grant select, insert, update, delete on public.anon_ats_checks to service_role;

create index if not exists idx_anon_ats_checks_ip_time
  on public.anon_ats_checks (ip_hash, created_at desc);
create index if not exists idx_anon_ats_checks_time
  on public.anon_ats_checks (created_at desc);

-- Checks the caps and records the attempt in one locked step, so parallel
-- requests can't slip past them. Returns the new row id, or null when a cap
-- is reached.
create or replace function public.claim_anon_ats_check(
  p_ip_hash text,
  p_per_ip int,
  p_global int
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('anon_ats_check'));
  if (select count(*) from anon_ats_checks
      where ip_hash = p_ip_hash and created_at > now() - interval '24 hours') >= p_per_ip
     or (select count(*) from anon_ats_checks
         where created_at > now() - interval '24 hours') >= p_global then
    return null;
  end if;
  insert into anon_ats_checks (ip_hash) values (p_ip_hash) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.claim_anon_ats_check(text, int, int) from public, anon, authenticated;
grant execute on function public.claim_anon_ats_check(text, int, int) to service_role;
