-- Module 1: Resume Analyzer
--
-- Product decision: one active resume per user, replaced on re-upload
-- (not a resume library). Enforced with a unique constraint on user_id
-- rather than an is_primary flag, which keeps every query trivial:
-- "the resume" is just `select * from resumes where user_id = auth.uid()`.

create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  file_name text not null,
  file_path text not null,        -- path inside the 'resumes' storage bucket
  file_type text not null check (file_type in ('pdf', 'docx')),
  raw_text text,                  -- extracted text, cached so re-analysis doesn't re-parse
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table resumes enable row level security;
grant select, insert, update, delete on resumes to authenticated;

create policy "Users manage their own resume"
  on resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists resume_analyses (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid references resumes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  ats_score int not null check (ats_score between 0 and 100),
  strengths jsonb not null default '[]',
  weaknesses jsonb not null default '[]',
  missing_keywords jsonb not null default '[]',
  formatting_issues jsonb not null default '[]',
  skills_gap jsonb not null default '[]',        -- [{ skill, importance, present }]
  section_feedback jsonb not null default '[]',  -- [{ section, feedback, score }]
  improved_summary text,
  model_version text,
  created_at timestamptz default now()
);

alter table resume_analyses enable row level security;
grant select, insert, update, delete on resume_analyses to authenticated;

create policy "Users manage their own resume analyses"
  on resume_analyses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- One resume being replaced should retire its old analyses history view-wise;
-- we keep the rows (cheap, useful for "improvement over time" later) but the
-- client always queries the latest by created_at desc limit 1.
create index if not exists idx_resume_analyses_user_created
  on resume_analyses (user_id, created_at desc);

-- Storage bucket for resume files. Private — signed URLs only, RLS-gated by
-- path prefix convention: {user_id}/{filename}
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "Users manage files in their own resume folder"
  on storage.objects for all
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
