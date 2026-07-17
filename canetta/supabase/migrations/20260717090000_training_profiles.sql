create table if not exists public.canetta_training_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  experience_level text not null check (experience_level in ('nunca_treinei', 'retomando', 'treino_regular')),
  training_location text not null check (training_location in ('casa_sem_equipamento', 'casa_com_equipamento', 'academia')),
  days_per_week smallint not null check (days_per_week between 2 and 5),
  minutes_per_session smallint not null check (minutes_per_session between 15 and 120),
  limitations text,
  updated_at timestamptz not null default now()
);

alter table public.canetta_training_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'canetta_training_profiles'
      and policyname = 'canetta training profiles are owned by user'
  ) then
    create policy "canetta training profiles are owned by user" on public.canetta_training_profiles
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end;
$$;
