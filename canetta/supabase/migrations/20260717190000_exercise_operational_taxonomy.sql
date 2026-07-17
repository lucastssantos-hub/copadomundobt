-- Taxonomia operacional do catálogo. Não representa evidência clínica nem
-- superioridade fisiológica: é um contrato de produto para seleção segura,
-- previsível e auditável de exercícios.
alter table public.canetta_exercises
  add column if not exists primary_pattern text,
  add column if not exists secondary_patterns text[] not null default '{}',
  add column if not exists movement_family text,
  add column if not exists joint_class text,
  add column if not exists session_role text,
  add column if not exists exercise_tier text,
  add column if not exists valid_slots text[] not null default '{}',
  add column if not exists valid_session_types text[] not null default '{}',
  add column if not exists technical_complexity smallint,
  add column if not exists balance_demand smallint,
  add column if not exists mobility_demand smallint,
  add column if not exists setup_complexity smallint,
  add column if not exists progression_clarity smallint,
  add column if not exists unsupervised_suitability smallint,
  add column if not exists is_hybrid boolean not null default false,
  add column if not exists is_unilateral boolean not null default false,
  add column if not exists requires_spotter boolean not null default false,
  add column if not exists media_verified boolean not null default false,
  add column if not exists production_eligible boolean not null default false,
  add column if not exists name_pt_status text not null default 'automatic',
  add column if not exists context_scores jsonb not null default '{}'::jsonb,
  add column if not exists taxonomy_version text not null default '2026-07-17.v1';

alter table public.canetta_exercises
  drop constraint if exists canetta_exercises_joint_class_check;
alter table public.canetta_exercises
  add constraint canetta_exercises_joint_class_check check (joint_class is null or joint_class in ('multi_joint','single_joint','isometric','locomotion','hybrid'));
alter table public.canetta_exercises
  drop constraint if exists canetta_exercises_session_role_check;
alter table public.canetta_exercises
  add constraint canetta_exercises_session_role_check check (session_role is null or session_role in ('primary','secondary','accessory','trunk','conditioning','mobility'));
alter table public.canetta_exercises
  drop constraint if exists canetta_exercises_exercise_tier_check;
alter table public.canetta_exercises
  add constraint canetta_exercises_exercise_tier_check check (exercise_tier is null or exercise_tier in ('base','variation','specialized'));
alter table public.canetta_exercises
  drop constraint if exists canetta_exercises_name_pt_status_check;
alter table public.canetta_exercises
  add constraint canetta_exercises_name_pt_status_check check (name_pt_status in ('reviewed','automatic','blocked'));

create index if not exists canetta_exercises_production_idx
  on public.canetta_exercises (production_eligible, exercise_tier, primary_pattern);
create index if not exists canetta_exercises_family_idx
  on public.canetta_exercises (movement_family);

create table if not exists public.canetta_essential_exercises (
  exercise_id uuid primary key references public.canetta_exercises(id) on delete cascade,
  slot text not null,
  priority smallint not null default 100 check (priority between 0 and 1000),
  allowed_experience text[] not null default '{nunca_treinei,retomando,treino_regular}',
  allowed_locations text[] not null default '{academia,casa_com_equipamento,casa_sem_equipamento}',
  rationale text not null default 'Item curado para o catálogo operacional do Canetta.',
  reviewed_by text,
  reviewed_at timestamptz,
  enabled boolean not null default true,
  unique (exercise_id, slot)
);

create index if not exists canetta_essential_slot_idx
  on public.canetta_essential_exercises (slot, enabled, priority);

alter table public.canetta_essential_exercises enable row level security;
drop policy if exists "canetta essential exercises are readable" on public.canetta_essential_exercises;
create policy "canetta essential exercises are readable" on public.canetta_essential_exercises
for select using (true);

comment on table public.canetta_essential_exercises is 'Catálogo curado de produção; exercícios fora dele permanecem disponíveis para biblioteca, mas não para geração automática.';
comment on column public.canetta_exercises.production_eligible is 'Opt-in operacional; false até taxonomia, nome e mídia serem revisados.';
comment on column public.canetta_exercises.context_scores is 'Scores operacionais por contexto; não são evidência científica nem recomendação clínica.';
