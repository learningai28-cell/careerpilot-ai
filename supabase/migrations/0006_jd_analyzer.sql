-- Module: JD Analyzer
--
-- Product decision: one active job description per user, replaced on new
-- paste — same single-active-record pattern as `resumes`. This keeps every
-- query trivial ("the JD" = where user_id = auth.uid()) and matches how
-- the module was designed in the approved preview: paste → analyze →
-- single results view, not a saved library of past JDs.
--
-- Breakdown (required/preferred skills, responsibilities, etc.) and the
-- resume match (score, missing keywords, skills gap, recommendations) are
-- combined into ONE analysis row and one Claude call — since there's only
-- ever one active resume, "match" is never ambiguous about which resume
-- it's matching against, so there's no reason to split this into two
-- tables or two AI calls.

create table if not exists job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  title text,
  company text,
  raw_text text not null,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table job_descriptions enable row level security;
grant select, insert, update, delete on job_descriptions to authenticated;

create policy "Users manage their own job description"
  on job_descriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists jd_analyses (
  id uuid primary key default gen_random_uuid(),
  jd_id uuid references job_descriptions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  required_skills jsonb not null default '[]',
  preferred_skills jsonb not null default '[]',
  responsibilities jsonb not null default '[]',
  experience_required text,
  soft_skills jsonb not null default '[]',
  technical_skills jsonb not null default '[]',
  match_score int check (match_score between 0 and 100),
  missing_keywords jsonb not null default '[]',
  skills_gap jsonb not null default '[]',        -- [{ skill, present: boolean }]
  recommendations jsonb not null default '[]',
  created_at timestamptz default now()
);

alter table jd_analyses enable row level security;
grant select, insert, update, delete on jd_analyses to authenticated;

create policy "Users manage their own JD analyses"
  on jd_analyses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_jd_analyses_user_created
  on jd_analyses (user_id, created_at desc);

-- Long-planned link from Interview Coach to a specific JD (see the note
-- left in 0004_interview_coach.sql). Nullable — existing sessions and any
-- future session built without a JD selected remain valid; this only
-- enables it as an option going forward.
alter table interview_sessions
  add column if not exists jd_id uuid references job_descriptions(id) on delete set null;
