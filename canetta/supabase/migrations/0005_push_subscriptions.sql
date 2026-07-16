create table if not exists public.canetta_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.canetta_push_subscriptions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'canetta_push_subscriptions' and policyname = 'canetta push subscriptions are owned by user') then
    create policy "canetta push subscriptions are owned by user" on public.canetta_push_subscriptions
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end;
$$;
