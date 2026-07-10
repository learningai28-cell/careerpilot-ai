-- Module 0: core auth-linked profile + usage ledger.
-- Remaining module tables are added in their own migration files
-- (0002_resume_analyzer.sql, 0003_jd_analyzer.sql, ...) as each module is built.
--
-- NOTE: as of Supabase's April 2026 platform change, new tables in the
-- public schema are no longer auto-exposed to the Data API (PostgREST)
-- just by enabling RLS — an explicit GRANT is a separate required step.
-- Every table below bundles: enable RLS, GRANT to authenticated, policies
-- — in that order — per Supabase's current recommended pattern. All app
-- traffic (frontend and Edge Functions alike) runs as the `authenticated`
-- role using the caller's JWT, never `service_role`, so `authenticated`
-- is the only role that needs a grant anywhere in this project.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  target_role text,
  experience_years numeric,
  current_industry text,
  avatar_url text,
  theme_preference text default 'system',
  created_at timestamptz default now()
);

alter table profiles enable row level security;
grant select, insert, update, delete on profiles to authenticated;

create policy "Users manage their own profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  module text not null,
  tokens_used int,
  created_at timestamptz default now()
);

alter table usage_events enable row level security;
grant select, insert on usage_events to authenticated;

create policy "Users read their own usage"
  on usage_events for select
  using (auth.uid() = user_id);

create policy "Users log their own usage"
  on usage_events for insert
  with check (auth.uid() = user_id);
