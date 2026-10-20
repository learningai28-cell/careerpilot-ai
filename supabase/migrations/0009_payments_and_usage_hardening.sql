-- Payments + usage hardening. Run this in the SQL Editor BEFORE deploying
-- the updated Edge Functions. Everything here is additive and re-runnable
-- (`if not exists`, `create or replace`, `on conflict do nothing`), and the
-- currently-deployed functions keep working against it unchanged — so there
-- is no window where live users are broken between the two steps.
--
-- Fixes:
--   1. One verified payment could upgrade any number of accounts (the
--      signature check proved a payment was real, not whose it was).
--      -> `payments` ledger with unique payment/order ids + grant_pro().
--   2. Pro was only granted if the buyer's browser survived the redirect.
--      -> grant_pro() is idempotent so the new razorpay-webhook function and
--         the browser callback can both call it safely.
--   3. Pro never expired. -> pro_expires_at, checked server-side.
--   4/5. Usage was checked before the Claude call but only logged after it,
--      so parallel requests all passed the check; score-answer had no cap.
--      -> consume_usage() checks and records in one locked transaction
--         BEFORE the Claude call; release_usage() refunds it on failure.

-- ---------------------------------------------------------------------------
-- Pro expiry
-- ---------------------------------------------------------------------------

-- The frontend (useUsage.ts) already reads this column; `if not exists`
-- makes this safe whether or not it was added by hand earlier.
alter table public.profiles
  add column if not exists pro_expires_at timestamptz;

-- Existing Pro users bought 3 months from when they paid. Never shorten a
-- date that is already set.
update public.profiles
set pro_expires_at = coalesce(pro_since, plan_renewed_at, now()) + interval '3 months'
where plan = 'pro' and pro_expires_at is null;

-- No client UPDATE grant is added for pro_expires_at: 0008 granted UPDATE
-- column-by-column, so new columns are service-role-only by default.

-- ---------------------------------------------------------------------------
-- Payments ledger
-- ---------------------------------------------------------------------------

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text not null unique,
  amount int,
  currency text,
  source text not null check (source in ('checkout', 'webhook', 'backfill')),
  created_at timestamptz default now()
);

alter table public.payments enable row level security;
grant select on public.payments to authenticated;
grant select, insert, update, delete on public.payments to service_role;

drop policy if exists "Users read their own payments" on public.payments;
create policy "Users read their own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- Record payments that were already used before this migration, so they
-- can't be replayed onto a new account now.
insert into public.payments (user_id, razorpay_order_id, razorpay_payment_id, source)
select id, razorpay_order_id, razorpay_payment_id, 'backfill'
from public.profiles
where razorpay_payment_id is not null and razorpay_order_id is not null
on conflict do nothing;

-- The only way to make someone Pro. Callable by service_role only (Edge
-- Functions), never from the browser. Idempotent: the same payment arriving
-- twice (browser callback + webhook) extends Pro once; the same payment
-- arriving for a different user is rejected.
create or replace function public.grant_pro(
  p_user_id uuid,
  p_order_id text,
  p_payment_id text,
  p_amount int,
  p_currency text,
  p_source text
) returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_expires timestamptz;
begin
  insert into payments (user_id, razorpay_order_id, razorpay_payment_id, amount, currency, source)
  values (p_user_id, p_order_id, p_payment_id, p_amount, p_currency, p_source)
  on conflict do nothing;

  if not found then
    -- Already recorded. Fine if it's the same user (retry/webhook), an
    -- attack if it isn't.
    select user_id into v_owner from payments
    where razorpay_payment_id = p_payment_id or razorpay_order_id = p_order_id
    limit 1;
    if v_owner is distinct from p_user_id then
      raise exception 'payment_already_used';
    end if;
    select pro_expires_at into v_expires from profiles where id = p_user_id;
    return v_expires;
  end if;

  update profiles
  set plan = 'pro',
      pro_since = case
        when plan = 'pro' and pro_expires_at > now() then coalesce(pro_since, now())
        else now()
      end,
      plan_renewed_at = now(),
      razorpay_order_id = p_order_id,
      razorpay_payment_id = p_payment_id,
      -- Renewing early stacks on top of the remaining time.
      pro_expires_at = greatest(coalesce(pro_expires_at, now()), now()) + interval '3 months'
  where id = p_user_id
  returning pro_expires_at into v_expires;

  if not found then
    raise exception 'profile_not_found';
  end if;

  return v_expires;
end;
$$;

revoke all on function public.grant_pro(uuid, text, text, int, text, text) from public, anon, authenticated;
grant execute on function public.grant_pro(uuid, text, text, int, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Atomic usage metering
-- ---------------------------------------------------------------------------

-- Lets per-item caps (e.g. attempts per interview question) be counted.
alter table public.usage_events
  add column if not exists ref_id uuid;

create index if not exists idx_usage_events_user_module_ref
  on public.usage_events (user_id, module, ref_id);

-- Checks the caller's limit and records the usage in one transaction,
-- serialized per user+module, so parallel requests can't all slip under
-- the cap. Edge Functions call this BEFORE spending tokens on Claude.
--
-- This is now the single server-side source of truth for free-tier limits.
-- Keep src/shared/lib/usageLimits.ts (display only) in sync with it.
create or replace function public.consume_usage(p_module text, p_ref_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_free_limits constant jsonb := '{
    "resume_analyzer": 1,
    "jd_analyzer": 2,
    "interview_coach": 1,
    "career_roadmap": 1,
    "resume_builder_extract": 2,
    "interview_answer": 30
  }';
  -- Applies to every plan: re-scoring the same question beyond this is
  -- almost always a script, not practice.
  v_max_attempts_per_question constant int := 5;
  v_is_pro boolean;
  v_limit int;
  v_used int;
  v_event_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('allowed', false, 'reason', 'Not signed in.');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_uid::text || ':' || p_module));

  if p_module = 'interview_answer' then
    if p_ref_id is null or not exists (
      select 1 from interview_questions q
      join interview_sessions s on s.id = q.session_id
      where q.id = p_ref_id and s.user_id = v_uid
    ) then
      return jsonb_build_object('allowed', false, 'reason', 'Question not found.');
    end if;

    select count(*) into v_used from usage_events
    where user_id = v_uid and module = p_module and ref_id = p_ref_id;
    if v_used >= v_max_attempts_per_question then
      return jsonb_build_object(
        'allowed', false,
        'reason', format('You''ve already had feedback on this question %s times. Try the next question.', v_max_attempts_per_question)
      );
    end if;
  end if;

  select plan = 'pro' and (pro_expires_at is null or pro_expires_at > now())
  into v_is_pro
  from profiles where id = v_uid;

  if not coalesce(v_is_pro, false) then
    v_limit := (v_free_limits ->> p_module)::int;
    if v_limit is not null then
      select count(*) into v_used from usage_events
      where user_id = v_uid
        and module = p_module
        and created_at >= date_trunc('month', now());
      if v_used >= v_limit then
        return jsonb_build_object(
          'allowed', false,
          'reason', format('Free plan limit reached (%s/month for this module). Upgrade to Pro for unlimited use.', v_limit)
        );
      end if;
    end if;
  end if;

  insert into usage_events (user_id, module, ref_id)
  values (v_uid, p_module, p_ref_id)
  returning id into v_event_id;

  return jsonb_build_object('allowed', true, 'event_id', v_event_id);
end;
$$;

revoke all on function public.consume_usage(text, uuid) from public, anon;
grant execute on function public.consume_usage(text, uuid) to authenticated;

-- Refund a usage event when the AI call or save fails after consume_usage.
-- service_role only: if users could call this they could refund every
-- successful use and never hit a limit.
create or replace function public.release_usage(p_event_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from usage_events where id = p_event_id;
$$;

revoke all on function public.release_usage(uuid) from public, anon, authenticated;
grant execute on function public.release_usage(uuid) to service_role;

-- Record token spend once the Claude call finishes (cost reporting only).
create or replace function public.record_usage_tokens(p_event_id uuid, p_tokens int)
returns void
language sql
security definer
set search_path = public
as $$
  update usage_events set tokens_used = p_tokens where id = p_event_id;
$$;

revoke all on function public.record_usage_tokens(uuid, int) from public, anon, authenticated;
grant execute on function public.record_usage_tokens(uuid, int) to service_role;

-- Note: the `authenticated` INSERT grant on usage_events from 0001 is left
-- in place on purpose — the currently-deployed functions still log usage
-- with it until they are replaced. It can be revoked once the new
-- functions are live (a user inserting rows only uses up their own quota).
