-- ============================================================================
-- Canetta Profissionais — Sprint 4: Painel médico (metas manuais + regime)
-- ----------------------------------------------------------------------------
-- care_goals: metas SEMPRE definidas manualmente pelo profissional (o sistema
--   nunca sugere). Infra pronta aqui; nutri/EF usam quando seus painéis acenderem.
-- canetta_regimen_log: histórico de mudança do regime informado (medicação/dose/
--   frequência) para o "resumo do tratamento" do médico (hoje canetta_profiles
--   é sobrescrito). Pequena adição do lado do paciente.
-- Ref.: docs/02 §C7/§D7, docs/06 (Sprint 4).
-- ============================================================================

create type public.care_goal_category as enum
  ('hidratacao', 'proteina', 'calorias', 'fibras', 'refeicoes', 'atividade', 'habito', 'outro');
create type public.care_goal_period as enum ('diario', 'semanal');

create table public.care_goals (
  id              uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.care_organizations(id) on delete cascade,
  author_user_id  uuid not null references auth.users(id),
  profession      public.care_profession not null,
  category        public.care_goal_category not null,
  target_value    numeric,
  unit            text,
  label           text not null,
  period          public.care_goal_period not null default 'diario',
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create trigger care_goal_touch before update on public.care_goals
  for each row execute function public.care_touch_updated_at();

alter table public.care_goals enable row level security;

-- Autor gerencia; paciente lê (é orientação); equipe vinculada lê.
create policy care_goal_select on public.care_goals
  for select using (
    author_user_id = auth.uid()
    or patient_user_id = auth.uid()
    or public.care_can_access_any(auth.uid(), patient_user_id)
  );
create policy care_goal_insert on public.care_goals
  for insert with check (
    author_user_id = auth.uid()
    and public.care_is_org_member(organization_id, auth.uid())
    and public.care_can_access_any(auth.uid(), patient_user_id)
  );
create policy care_goal_update on public.care_goals
  for update using (author_user_id = auth.uid()) with check (author_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Histórico de regime informado (lado do paciente). Owner escreve; profissional lê.
-- ---------------------------------------------------------------------------
create table public.canetta_regimen_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  medication text,
  dose       text,
  frequency  text,
  changed_at timestamptz not null default now()
);
alter table public.canetta_regimen_log enable row level security;

create policy canetta_regimen_owner on public.canetta_regimen_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy canetta_regimen_prof_read on public.canetta_regimen_log
  for select using (public.care_can_access(auth.uid(), user_id, 'aplicacoes'));
