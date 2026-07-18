alter table public.canetta_nutrition_entries
  add column if not exists meals_tolerated text,
  add column if not exists intake_adequacy text,
  add column if not exists hydration_status text,
  add column if not exists weakness_status text,
  add column if not exists professional_target text;
