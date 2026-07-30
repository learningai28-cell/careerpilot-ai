-- SECURITY FIX — run this before shipping the Razorpay integration.
--
-- 0001_init_profiles.sql granted blanket `update` on `profiles` to the
-- `authenticated` role, and its RLS policy is `using (auth.uid() = id)` with
-- no column restriction. That combination means any signed-in user can
-- currently run, from the browser console:
--
--   supabase.from('profiles').update({ plan: 'pro' }).eq('id', user.id)
--
-- ...and it succeeds. RLS controls *which rows* a user can touch, not
-- *which columns* — so the free/pro gate that every module's usage limit
-- depends on is self-service today, no payment required. This predates the
-- Razorpay work; it just had no consequence until `plan` started meaning
-- something a user shouldn't be able to grant themselves.
--
-- Fix: revoke the blanket grant and re-grant UPDATE only on the columns a
-- user should be able to edit themselves. `plan`, `plan_renewed_at`,
-- `razorpay_order_id`, `razorpay_payment_id`, and `pro_since` are excluded —
-- Postgres then rejects any client-issued UPDATE that touches those
-- columns before RLS is even evaluated, regardless of what the frontend
-- sends. The `verify-razorpay-payment` Edge Function is the only path left
-- that can set `plan`, and it does so using the Supabase service role key
-- specifically because of this — the one deliberate exception to this
-- project's "Edge Functions run as `authenticated`, never `service_role`"
-- rule, scoped narrowly to this single write.

revoke update on public.profiles from authenticated;

grant update (
  full_name,
  target_role,
  experience_years,
  current_industry,
  avatar_url,
  theme_preference
) on public.profiles to authenticated;

-- profiles.id, created_at, plan, plan_renewed_at, razorpay_order_id,
-- razorpay_payment_id, pro_since are now writable only via service_role
-- (i.e. only from inside an Edge Function using SUPABASE_SERVICE_ROLE_KEY).
