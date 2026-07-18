alter table public.canetta_nutrition_entries
  add column if not exists protein_target_grams smallint,
  add column if not exists protein_target_source text;
