create extension if not exists pg_trgm;

create table if not exists public.canetta_exercises (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  name text not null,
  category text,
  body_part text,
  target_muscle text,
  muscle_group text,
  secondary_muscles text[] not null default '{}',
  equipment text,
  instructions jsonb not null default '{}'::jsonb,
  instruction_steps jsonb not null default '{}'::jsonb,
  image_url text,
  gif_url text,
  attribution text,
  source text not null default 'hasaneyldrm/exercises-dataset',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists canetta_exercises_body_part_idx on public.canetta_exercises (body_part);
create index if not exists canetta_exercises_equipment_idx on public.canetta_exercises (equipment);
create index if not exists canetta_exercises_target_idx on public.canetta_exercises (target_muscle);
create index if not exists canetta_exercises_name_trgm_idx on public.canetta_exercises using gin (name gin_trgm_ops);

create table if not exists public.canetta_workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_external_id text,
  exercise_name text not null,
  body_part text,
  equipment text,
  sets_completed integer check (sets_completed is null or sets_completed between 0 and 99),
  reps_completed text,
  difficulty_felt text,
  note text,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists canetta_workout_logs_user_completed_idx on public.canetta_workout_logs (user_id, completed_at desc);

alter table public.canetta_exercises enable row level security;
alter table public.canetta_workout_logs enable row level security;

drop policy if exists "canetta exercises are readable" on public.canetta_exercises;
create policy "canetta exercises are readable" on public.canetta_exercises
for select using (true);

drop policy if exists "canetta workout logs are owned by user" on public.canetta_workout_logs;
create policy "canetta workout logs are owned by user" on public.canetta_workout_logs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
