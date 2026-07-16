create table if not exists public.canetta_routine_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  water_cups smallint check (water_cups >= 0),
  movement text,
  sleep text,
  hunger text,
  note text,
  photo boolean not null default false,
  recorded_at timestamptz not null default now()
);

create table if not exists public.canetta_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  recorded_at timestamptz not null default now()
);

alter table public.canetta_routine_entries enable row level security;
alter table public.canetta_questions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'canetta_routine_entries' and policyname = 'canetta routine entries are owned by user') then
    create policy "canetta routine entries are owned by user" on public.canetta_routine_entries
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'canetta_questions' and policyname = 'canetta questions are owned by user') then
    create policy "canetta questions are owned by user" on public.canetta_questions
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end;
$$;
