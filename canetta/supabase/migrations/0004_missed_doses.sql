create table if not exists public.canetta_missed_doses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medication text,
  dose text,
  reason text,
  note text,
  scheduled_for timestamptz not null default now(),
  recorded_at timestamptz not null default now()
);

alter table public.canetta_missed_doses enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'canetta_missed_doses' and policyname = 'canetta missed doses are owned by user') then
    create policy "canetta missed doses are owned by user" on public.canetta_missed_doses
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end;
$$;
