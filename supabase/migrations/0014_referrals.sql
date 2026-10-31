-- Referral programme: every user gets an invite code; for every 2 invited
-- friends who sign up AND use a feature, the inviter gets 7 days of Pro
-- (max 8 weeks). Safe to run while live, safe to run twice.
--
-- Users can't write these columns themselves: 0008 grants UPDATE on
-- profiles column-by-column, so new columns are server-side only.

alter table public.profiles
  add column if not exists referral_code text unique
    default substr(md5(gen_random_uuid()::text), 1, 8),
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists referred_at timestamptz,
  add column if not exists referral_credited boolean not null default false,
  add column if not exists referral_weeks_earned int not null default 0;

update public.profiles
set referral_code = substr(md5(gen_random_uuid()::text), 1, 8)
where referral_code is null;

create index if not exists idx_profiles_referred_by on public.profiles (referred_by);

-- Called by the app right after a new user's first sign-in, with the code
-- from the invite link they arrived on. Only brand-new accounts (< 3 days)
-- can be linked, only once, and never to themselves.
create or replace function public.claim_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_referrer uuid;
begin
  if v_uid is null or p_code is null then
    return false;
  end if;
  select id into v_referrer from profiles where referral_code = lower(trim(p_code));
  if v_referrer is null or v_referrer = v_uid then
    return false;
  end if;
  update profiles
  set referred_by = v_referrer, referred_at = now()
  where id = v_uid
    and referred_by is null
    and created_at > now() - interval '3 days';
  return found;
end;
$$;

revoke all on function public.claim_referral(text) from public, anon;
grant execute on function public.claim_referral(text) to authenticated;

-- When an invited user uses a feature for the first time, credit the
-- inviter; every 2nd credited friend adds 7 days of Pro (cap 8 weeks).
create or replace function public.credit_referral_on_first_use()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_credited int;
begin
  update profiles
  set referral_credited = true
  where id = new.user_id and referred_by is not null and not referral_credited
  returning referred_by into v_referrer;

  if v_referrer is null then
    return new;
  end if;

  select count(*) into v_credited
  from profiles where referred_by = v_referrer and referral_credited;

  if v_credited % 2 = 0 then
    update profiles
    set plan = 'pro',
        pro_expires_at = greatest(coalesce(pro_expires_at, now()), now()) + interval '7 days',
        referral_weeks_earned = referral_weeks_earned + 1
    where id = v_referrer and referral_weeks_earned < 8;
  end if;
  return new;
end;
$$;

revoke all on function public.credit_referral_on_first_use() from public, anon, authenticated;

drop trigger if exists trg_credit_referral on public.usage_events;
create trigger trg_credit_referral
  after insert on public.usage_events
  for each row execute function public.credit_referral_on_first_use();

-- What the invite card on the dashboard shows. Counts only, no names.
create or replace function public.get_my_referrals()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'code', p.referral_code,
    'joined', (select count(*) from profiles r where r.referred_by = p.id),
    'active', (select count(*) from profiles r where r.referred_by = p.id and r.referral_credited),
    'weeks_earned', p.referral_weeks_earned
  )
  from profiles p where p.id = auth.uid();
$$;

revoke all on function public.get_my_referrals() from public, anon;
grant execute on function public.get_my_referrals() to authenticated;
