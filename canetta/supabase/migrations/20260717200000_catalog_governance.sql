-- Governança e reprodutibilidade da curadoria. A aprovação é sempre explícita;
-- nenhum script automático deve marcar taxonomy_status como reviewed.
alter table public.canetta_exercises
  add column if not exists taxonomy_status text not null default 'automatic'
    check (taxonomy_status in ('automatic','reviewed','blocked'));

create index if not exists canetta_exercises_taxonomy_status_idx
  on public.canetta_exercises (taxonomy_status, production_eligible);

alter table public.canetta_ai_workout_plans
  add column if not exists essential_catalog_version text,
  add column if not exists taxonomy_version text,
  add column if not exists validation_rules_version text;

comment on column public.canetta_exercises.taxonomy_status is 'Revisão humana da taxonomia; automatic nunca pode ser usado em produção.';
comment on column public.canetta_ai_workout_plans.essential_catalog_version is 'Versão do catálogo curado usada para gerar o plano.';
comment on column public.canetta_ai_workout_plans.taxonomy_version is 'Versão da taxonomia operacional usada para gerar o plano.';
comment on column public.canetta_ai_workout_plans.validation_rules_version is 'Versão dos validadores usada para aceitar o plano.';
