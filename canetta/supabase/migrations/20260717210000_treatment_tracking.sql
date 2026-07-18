-- Canetta: acompanhamento estruturado do tratamento (sem prescrição).
-- Todos os campos representam fatos informados pelo usuário ou pelo profissional.

alter table public.canetta_profiles
  add column if not exists medication_code text,
  add column if not exists route text,
  add column if not exists dose_unit text,
  add column if not exists schedule_interval_days smallint check (schedule_interval_days is null or schedule_interval_days between 1 and 90);

alter table public.canetta_dose_applications
  add column if not exists scheduled_for timestamptz,
  add column if not exists dose_unit text,
  add column if not exists route text;

alter table public.canetta_side_effects
  add column if not exists application_id uuid references public.canetta_dose_applications(id) on delete set null,
  add column if not exists days_since_application smallint check (days_since_application is null or days_since_application between 0 and 90),
  add column if not exists hydration_ok boolean;

create table if not exists public.canetta_body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  waist_cm numeric(5,2) check (waist_cm is null or waist_cm between 20 and 300),
  hip_cm numeric(5,2) check (hip_cm is null or hip_cm between 20 and 300),
  note text,
  recorded_at timestamptz not null default now(),
  check (waist_cm is not null or hip_cm is not null)
);
alter table public.canetta_body_measurements enable row level security;
create policy "canetta body measurements are owned by user" on public.canetta_body_measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.canetta_nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_label text,
  protein_logged boolean,
  water_cups smallint check (water_cups is null or water_cups between 0 and 50),
  note text,
  recorded_at timestamptz not null default now()
);
alter table public.canetta_nutrition_entries enable row level security;
create policy "canetta nutrition entries are owned by user" on public.canetta_nutrition_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.canetta_personal_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('7d', '30d', 'all')),
  range_start date not null,
  range_end date not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.canetta_personal_reports enable row level security;
create policy "canetta personal reports are owned by user" on public.canetta_personal_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
