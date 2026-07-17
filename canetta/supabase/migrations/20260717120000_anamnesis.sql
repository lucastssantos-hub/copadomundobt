create table if not exists public.canetta_anamnesis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  consent boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.canetta_anamnesis enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'canetta_anamnesis'
      and policyname = 'canetta anamnesis is owned by user'
  ) then
    create policy "canetta anamnesis is owned by user" on public.canetta_anamnesis
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end;
$$;
