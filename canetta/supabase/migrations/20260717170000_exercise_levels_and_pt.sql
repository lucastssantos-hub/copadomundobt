alter table public.canetta_exercises
  add column if not exists name_pt text,
  add column if not exists difficulty_level text not null default 'intermediario'
    check (difficulty_level in ('iniciante', 'intermediario', 'avancado'));

create index if not exists canetta_exercises_difficulty_idx
  on public.canetta_exercises (difficulty_level);

comment on column public.canetta_exercises.difficulty_level is 'Classificação operacional determinística do Canetta; não é prescrição clínica.';
comment on column public.canetta_exercises.name_pt is 'Nome de exibição em português; name preserva o nome original do dataset.';
