-- Module 3: AI Interview Coach
--
-- Product decision: JD Analyzer isn't built yet, so sessions are generated
-- from the resume + a manually-entered target role/experience level rather
-- than a linked job_descriptions row. A nullable `jd_id` column (with FK)
-- gets added in a later migration once Module 2 is real — this table is
-- designed so that's an additive `alter table`, not a rework.

create table if not exists interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  resume_id uuid references resumes(id) on delete set null,
  target_role text not null,
  experience_years numeric,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  status text not null default 'active' check (status in ('active', 'completed')),
  overall_score int,
  created_at timestamptz default now()
);

alter table interview_sessions enable row level security;
grant select, insert, update, delete on interview_sessions to authenticated;

create policy "Users manage their own interview sessions"
  on interview_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists interview_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions(id) on delete cascade,
  category text not null check (category in ('hr', 'technical', 'behavioural', 'case_study')),
  question text not null,
  star_sample_answer text,
  follow_up_questions jsonb not null default '[]',
  difficulty text,
  order_index int not null default 0
);

alter table interview_questions enable row level security;
grant select, insert, update, delete on interview_questions to authenticated;

create policy "Users read/write questions in their own sessions"
  on interview_questions for all
  using (
    exists (
      select 1 from interview_sessions s
      where s.id = interview_questions.session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from interview_sessions s
      where s.id = interview_questions.session_id and s.user_id = auth.uid()
    )
  );

create table if not exists interview_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references interview_questions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  answer_text text not null,
  score int check (score between 0 and 100),
  strengths jsonb not null default '[]',
  weaknesses jsonb not null default '[]',
  better_answer text,
  confidence_level text check (confidence_level in ('low', 'medium', 'high')),
  communication_tips jsonb not null default '[]',
  created_at timestamptz default now()
);

alter table interview_answers enable row level security;
grant select, insert, update, delete on interview_answers to authenticated;

create policy "Users manage their own interview answers"
  on interview_answers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_interview_sessions_user_created
  on interview_sessions (user_id, created_at desc);

create index if not exists idx_interview_questions_session_order
  on interview_questions (session_id, order_index);
