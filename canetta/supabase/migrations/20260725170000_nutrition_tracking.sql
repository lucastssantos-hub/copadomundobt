-- Canetta: tracking alimentar estruturado.
-- Estes dados são estimativas/revisões do usuário; não representam prescrição.

create table if not exists public.canetta_meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_label text,
  logged_at timestamptz not null default now(),
  note text,
  estimate_basis text not null default 'manual' check (estimate_basis in ('foto', 'foto_revisada', 'pesos_informados', 'manual')),
  confidence_score numeric(4,3) check (confidence_score is null or confidence_score between 0 and 1),
  review_status text not null default 'revisao_pendente' check (review_status in ('revisao_pendente', 'revisada', 'confirmada')),
  calories numeric(8,2),
  protein_g numeric(8,2),
  carbs_g numeric(8,2),
  fat_g numeric(8,2),
  fiber_g numeric(8,2)
);
alter table public.canetta_meal_entries enable row level security;
create policy "canetta meal entries are owned by user" on public.canetta_meal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.canetta_meal_foods (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.canetta_meal_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  food_name text not null,
  grams numeric(8,2) check (grams is null or grams between 0 and 10000),
  source text not null default 'manual',
  source_version text,
  kcal_per_100g numeric(8,2),
  protein_per_100g numeric(8,2),
  carbs_per_100g numeric(8,2),
  fat_per_100g numeric(8,2),
  fiber_per_100g numeric(8,2),
  confidence_score numeric(4,3) check (confidence_score is null or confidence_score between 0 and 1),
  sort_order smallint not null default 0
);
alter table public.canetta_meal_foods enable row level security;
create policy "canetta meal foods are owned by user" on public.canetta_meal_foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.canetta_meal_photos (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.canetta_meal_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);
alter table public.canetta_meal_photos enable row level security;
create policy "canetta meal photos are owned by user" on public.canetta_meal_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.canetta_meal_symptoms (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.canetta_meal_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pre_meal_hunger text check (pre_meal_hunger is null or pre_meal_hunger in ('nenhuma', 'leve', 'moderada', 'forte')),
  post_meal_satiety text check (post_meal_satiety is null or post_meal_satiety in ('nenhuma', 'leve', 'moderada', 'forte')),
  nausea_level text check (nausea_level is null or nausea_level in ('nenhuma', 'leve', 'moderada', 'forte')),
  bloating_level text check (bloating_level is null or bloating_level in ('nenhuma', 'leve', 'moderada', 'forte')),
  sweet_craving_level text check (sweet_craving_level is null or sweet_craving_level in ('nenhuma', 'leve', 'moderada', 'forte')),
  food_aversion_level text check (food_aversion_level is null or food_aversion_level in ('nenhuma', 'leve', 'moderada', 'forte')),
  note text
);
alter table public.canetta_meal_symptoms enable row level security;
create policy "canetta meal symptoms are owned by user" on public.canetta_meal_symptoms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.canetta_water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  volume_ml smallint not null check (volume_ml between 1 and 10000),
  logged_at timestamptz not null default now()
);
alter table public.canetta_water_logs enable row level security;
create policy "canetta water logs are owned by user" on public.canetta_water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists canetta_meal_entries_user_logged_idx on public.canetta_meal_entries(user_id, logged_at desc);
create index if not exists canetta_meal_foods_meal_idx on public.canetta_meal_foods(meal_id, sort_order);
create index if not exists canetta_water_logs_user_logged_idx on public.canetta_water_logs(user_id, logged_at desc);
