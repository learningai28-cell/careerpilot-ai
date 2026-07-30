-- Adds columns needed to track the Razorpay payment that upgraded a profile
-- to Pro. Already run once directly in the SQL Editor while wiring up the
-- integration; saved here so the migration history matches what's live
-- (per the SOP's own note that migrations are pasted into the SQL Editor,
-- not run via CLI). Re-running is a no-op thanks to `if not exists`.

alter table public.profiles
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists pro_since timestamptz;
