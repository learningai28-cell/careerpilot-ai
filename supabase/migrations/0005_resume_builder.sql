-- Module: Resume Builder
--
-- Product decision: one structured "profile data" record per user (same
-- single-active-record pattern as `resumes`), editable in place regardless
-- of whether it originated from AI auto-extraction or manual entry. The
-- `source` column just tracks provenance for the UI, not access control.
--
-- Only the auto-extract action costs an AI call and is usage-capped
-- (module key 'resume_builder_extract' in the usage system). Manual entry,
-- editing, switching templates, and downloading are free and unlimited —
-- there's no AI cost to gate on those paths.

create table if not exists resume_profile_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  full_name text,
  email text,
  phone text,
  location text,
  linkedin_url text,
  portfolio_url text,
  summary text,
  experience jsonb not null default '[]',    -- [{company, title, location, start_date, end_date, bullets: string[]}]
  education jsonb not null default '[]',     -- [{institution, degree, field, start_date, end_date, details}]
  skills jsonb not null default '[]',        -- string[]
  certifications jsonb not null default '[]', -- string[]
  source text not null default 'manual' check (source in ('extracted', 'manual')),
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table resume_profile_data enable row level security;
grant select, insert, update, delete on resume_profile_data to authenticated;

create policy "Users manage their own resume profile data"
  on resume_profile_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
