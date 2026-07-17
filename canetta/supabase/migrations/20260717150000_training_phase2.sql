create table if not exists public.canetta_session_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  session_label text,
  status text not null check (status in ('verde', 'amarelo', 'vermelho')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, session_date, session_label)
);

create index if not exists canetta_session_checkins_user_date_idx
  on public.canetta_session_checkins (user_id, session_date desc);

alter table public.canetta_session_checkins enable row level security;
drop policy if exists "canetta session checkins are owned by user" on public.canetta_session_checkins;
create policy "canetta session checkins are owned by user" on public.canetta_session_checkins
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.canetta_workout_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_log_id uuid references public.canetta_workout_logs(id) on delete set null,
  completed boolean not null default true,
  rpe smallint check (rpe is null or rpe between 1 and 10),
  symptoms_during text[] not null default '{}',
  symptoms_after text[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists canetta_workout_feedback_user_created_idx
  on public.canetta_workout_feedback (user_id, created_at desc);

alter table public.canetta_workout_feedback enable row level security;
drop policy if exists "canetta workout feedback is owned by user" on public.canetta_workout_feedback;
create policy "canetta workout feedback is owned by user" on public.canetta_workout_feedback
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.canetta_training_reassessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  anchor_strength text not null,
  function_level text not null,
  pain_level text not null,
  adherence text not null,
  medication_change boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists canetta_training_reassessments_user_created_idx
  on public.canetta_training_reassessments (user_id, created_at desc);

alter table public.canetta_training_reassessments enable row level security;
drop policy if exists "canetta training reassessments are owned by user" on public.canetta_training_reassessments;
create policy "canetta training reassessments are owned by user" on public.canetta_training_reassessments
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
