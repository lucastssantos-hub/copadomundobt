-- ============================================================================
-- Canetta Profissionais — Sprint 6: Relatórios e auditoria
-- ----------------------------------------------------------------------------
-- care_reports: relatório com dados CONGELADOS no snapshot (reprodutível) e
-- rodapé legal versionado. Geração e cada download gravam care_audit_log
-- (report_generate / download). Ref.: docs/02 §C13, docs/06 (Sprint 6).
-- ============================================================================

create table public.care_reports (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.care_organizations(id) on delete cascade,
  patient_user_id     uuid not null references auth.users(id) on delete cascade,
  author_user_id      uuid not null references auth.users(id),
  type                text not null check (type in ('medico', 'nutricional', 'atividade')),
  period              text not null check (period in ('7d', '30d', '90d', 'custom')),
  range_start         date not null,
  range_end           date not null,
  snapshot            jsonb not null,
  storage_path        text,
  legal_footer_version text not null,
  status              text not null default 'generated' check (status in ('generated')),
  created_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
alter table public.care_reports enable row level security;

create policy care_report_select on public.care_reports
  for select using (
    author_user_id = auth.uid()
    or public.care_can_access_any(auth.uid(), patient_user_id)
  );
create policy care_report_insert on public.care_reports
  for insert with check (
    author_user_id = auth.uid()
    and public.care_is_org_member(organization_id, auth.uid())
    and public.care_can_access_any(auth.uid(), patient_user_id)
  );
create policy care_report_update on public.care_reports
  for update using (author_user_id = auth.uid()) with check (author_user_id = auth.uid());
