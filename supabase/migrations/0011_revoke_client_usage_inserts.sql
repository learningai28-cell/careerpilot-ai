-- Run ONLY AFTER the Edge Functions from the scaling-hardening release are
-- deployed (they record usage through consume_usage, not a client insert).
-- The functions that are live before that still insert into usage_events
-- with the user's own JWT, so running this earlier would break them.
--
-- After deploy, nothing legitimate inserts usage rows as `authenticated`,
-- and leaving the grant lets users write junk rows into the cost ledger.
drop policy if exists "Users log their own usage" on public.usage_events;
revoke insert on public.usage_events from authenticated;
