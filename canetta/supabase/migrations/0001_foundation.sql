create type public.canetta_profile_stage as enum ('usa', 'quer_comecar');
create extension if not exists pgcrypto;

create type public.canetta_dose_axis as enum ('aumentando', 'fixa');
create type public.canetta_goal_axis as enum ('perdendo', 'mantendo', 'reduzindo_parou');
create type public.canetta_application_site as enum ('abdomen', 'coxa', 'braco');

create table public.canetta_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  stage public.canetta_profile_stage not null,
  medication text,
  current_dose text,
  frequency text,
  height_cm numeric(5,2),
  goal_weight numeric(5,2),
  biggest_difficulty text,
  created_at timestamptz not null default now()
);

create table public.canetta_journey_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dose_axis public.canetta_dose_axis not null,
  goal_axis public.canetta_goal_axis not null,
  updated_at timestamptz not null default now()
);

create table public.canetta_journey_state_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dose_axis public.canetta_dose_axis not null,
  goal_axis public.canetta_goal_axis not null,
  changed_at timestamptz not null default now()
);

create table public.canetta_dose_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medication text,
  dose text,
  site public.canetta_application_site,
  note text,
  applied_at timestamptz not null default now()
);

create table public.canetta_weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight numeric(5,2) not null,
  recorded_at timestamptz not null default now()
);

create table public.canetta_daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  hunger_level smallint check (hunger_level between 0 and 10),
  energy_level smallint check (energy_level between 0 and 10),
  note text,
  unique (user_id, date)
);

create table public.canetta_weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  protein_logged boolean,
  movement_logged boolean,
  bowel text,
  sleep text,
  note text,
  unique (user_id, week_start)
);

create table public.canetta_side_effects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  types text[] not null default '{}',
  intensity smallint check (intensity between 0 and 10),
  duration text,
  note text,
  recorded_at timestamptz not null default now()
);

create table public.canetta_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  time time not null,
  active boolean not null default true
);

create or replace function public.canetta_touch_journey_state_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger canetta_journey_state_touch_updated_at
before update on public.canetta_journey_state
for each row execute function public.canetta_touch_journey_state_updated_at();

create or replace function public.canetta_log_journey_state_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.canetta_journey_state_log (user_id, dose_axis, goal_axis)
  values (new.user_id, new.dose_axis, new.goal_axis);
  return new;
end;
$$;

create trigger canetta_journey_state_log_insert
after insert or update on public.canetta_journey_state
for each row execute function public.canetta_log_journey_state_change();

alter table public.canetta_profiles enable row level security;
alter table public.canetta_journey_state enable row level security;
alter table public.canetta_journey_state_log enable row level security;
alter table public.canetta_dose_applications enable row level security;
alter table public.canetta_weight_entries enable row level security;
alter table public.canetta_daily_checkins enable row level security;
alter table public.canetta_weekly_checkins enable row level security;
alter table public.canetta_side_effects enable row level security;
alter table public.canetta_reminders enable row level security;

create policy "canetta profiles are owned by user" on public.canetta_profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "canetta journey state is owned by user" on public.canetta_journey_state
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "canetta journey state log is readable by user" on public.canetta_journey_state_log
for select using (auth.uid() = user_id);

create policy "canetta dose applications are owned by user" on public.canetta_dose_applications
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "canetta weight entries are owned by user" on public.canetta_weight_entries
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "canetta daily checkins are owned by user" on public.canetta_daily_checkins
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "canetta weekly checkins are owned by user" on public.canetta_weekly_checkins
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "canetta side effects are owned by user" on public.canetta_side_effects
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "canetta reminders are owned by user" on public.canetta_reminders
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
