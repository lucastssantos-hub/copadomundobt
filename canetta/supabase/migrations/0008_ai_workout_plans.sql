create table if not exists public.canetta_ai_workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  focus text not null,
  rationale text,
  risk_level text check (risk_level in ('low', 'medium', 'high')),
  nutrition_advice text,
  warning text,
  workouts jsonb not null default '[]'::jsonb,
  context_snapshot jsonb not null default '{}'::jsonb,
  ai_model text,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists canetta_ai_workout_plans_user_idx
  on public.canetta_ai_workout_plans (user_id, week_start desc);

alter table public.canetta_ai_workout_plans enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'canetta_ai_workout_plans'
      and policyname = 'canetta ai workout plans readable by owner'
  ) then
    create policy "canetta ai workout plans readable by owner" on public.canetta_ai_workout_plans
    for select using (auth.uid() = user_id);
  end if;
end;
$$;
