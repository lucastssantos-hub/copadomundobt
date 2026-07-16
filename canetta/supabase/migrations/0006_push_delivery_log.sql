create table if not exists public.canetta_push_delivery_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delivery_date date not null,
  delivery_hour smallint not null check (delivery_hour >= 0 and delivery_hour <= 23),
  kind text not null default 'dose_reminder',
  created_at timestamptz not null default now(),
  unique (user_id, delivery_date, delivery_hour, kind)
);

alter table public.canetta_push_delivery_log enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'canetta_push_delivery_log' and policyname = 'canetta push delivery log is owned by user') then
    create policy "canetta push delivery log is owned by user" on public.canetta_push_delivery_log
    for select using (auth.uid() = user_id);
  end if;
end;
$$;
