-- Adds the plan tier that gates free-tier usage caps.
-- Presentation Coach is descoped from the active build for now; its tables
-- (presentations, presentation_reviews) are not created in this pass and
-- will ship in a later migration if/when that module is revived.

alter table profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'pro')),
  add column if not exists plan_renewed_at timestamptz default now();

-- Composite index so "count this user's events for this module this month"
-- (the exact query both the client badge and the Edge Function guard run)
-- stays fast as usage_events grows.
create index if not exists idx_usage_events_user_module_created
  on usage_events (user_id, module, created_at);
