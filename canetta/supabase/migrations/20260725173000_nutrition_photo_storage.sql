-- Fotos de refeições: bucket privado, separado por usuário.
insert into storage.buckets (id, name, public)
values ('canetta-meal-photos', 'canetta-meal-photos', false)
on conflict (id) do nothing;

drop policy if exists "canetta meal photos storage read" on storage.objects;
create policy "canetta meal photos storage read" on storage.objects
  for select to authenticated
  using (bucket_id = 'canetta-meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "canetta meal photos storage insert" on storage.objects;
create policy "canetta meal photos storage insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'canetta-meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "canetta meal photos storage delete" on storage.objects;
create policy "canetta meal photos storage delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'canetta-meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
