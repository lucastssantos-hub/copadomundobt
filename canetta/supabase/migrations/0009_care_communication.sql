-- ============================================================================
-- Canetta Profissionais — Sprint 5: Comunicação e notas
-- ----------------------------------------------------------------------------
-- care_professional_notes (3 visibilidades: privada|equipe|compartilhada_paciente)
-- care_guidance (orientação ao paciente com ciência: sent|read|acknowledged|archived)
-- care_message_threads + care_messages (assíncrono; SEM realtime no MVP)
-- Notas e orientações espelham em care_timeline_events (triggers).
-- Paciente NUNCA vê nota privada/equipe. Ref.: docs/02 §C8–C10, docs/06 (S5).
-- ============================================================================

alter type public.care_audit_action add value if not exists 'message_send';

-- ---------------------------------------------------------------------------
-- Notas profissionais
-- ---------------------------------------------------------------------------
create table public.care_professional_notes (
  id              uuid primary key default gen_random_uuid(),
  author_user_id  uuid not null references auth.users(id),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.care_organizations(id) on delete cascade,
  profession      public.care_profession not null,
  category        public.care_data_category,
  body            text not null,
  visibility      text not null default 'privada'
                    check (visibility in ('privada', 'equipe', 'compartilhada_paciente')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create trigger care_note_touch before update on public.care_professional_notes
  for each row execute function public.care_touch_updated_at();
alter table public.care_professional_notes enable row level security;

-- Paciente só enxerga 'compartilhada_paciente'. 'privada' = só o autor.
create policy care_note_select on public.care_professional_notes
  for select using (
    author_user_id = auth.uid()
    or (visibility = 'equipe' and public.care_can_access_any(auth.uid(), patient_user_id))
    or (visibility = 'compartilhada_paciente'
        and (patient_user_id = auth.uid() or public.care_can_access_any(auth.uid(), patient_user_id)))
  );
create policy care_note_insert on public.care_professional_notes
  for insert with check (
    author_user_id = auth.uid()
    and public.care_is_org_member(organization_id, auth.uid())
    and public.care_can_access_any(auth.uid(), patient_user_id)
  );
create policy care_note_update on public.care_professional_notes
  for update using (author_user_id = auth.uid()) with check (author_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Orientações (com ciência do paciente)
-- ---------------------------------------------------------------------------
create table public.care_guidance (
  id              uuid primary key default gen_random_uuid(),
  author_user_id  uuid not null references auth.users(id),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.care_organizations(id) on delete cascade,
  profession      public.care_profession not null,
  title           text,
  body            text not null,
  status          text not null default 'sent'
                    check (status in ('sent', 'read', 'acknowledged', 'archived')),
  read_at         timestamptz,
  acknowledged_at timestamptz,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
alter table public.care_guidance enable row level security;

create policy care_guidance_select on public.care_guidance
  for select using (
    author_user_id = auth.uid()
    or patient_user_id = auth.uid()
    or public.care_can_access_any(auth.uid(), patient_user_id)
  );
create policy care_guidance_insert on public.care_guidance
  for insert with check (
    author_user_id = auth.uid()
    and public.care_is_org_member(organization_id, auth.uid())
    and public.care_can_access_any(auth.uid(), patient_user_id)
  );
-- Autor arquiva; paciente marca lido/ciente.
create policy care_guidance_update on public.care_guidance
  for update using (author_user_id = auth.uid() or patient_user_id = auth.uid())
             with check (author_user_id = auth.uid() or patient_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Mensagens assíncronas (thread por paciente)
-- ---------------------------------------------------------------------------
create table public.care_message_threads (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.care_organizations(id) on delete cascade,
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  subject         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create trigger care_thread_touch before update on public.care_message_threads
  for each row execute function public.care_touch_updated_at();

create table public.care_messages (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references public.care_message_threads(id) on delete cascade,
  organization_id uuid not null references public.care_organizations(id) on delete cascade,
  sender_user_id  uuid not null references auth.users(id),
  sender_kind     text not null check (sender_kind in ('professional', 'patient')),
  body            text not null,
  attachments     jsonb not null default '[]'::jsonb,
  read_at         timestamptz,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

alter table public.care_message_threads enable row level security;
alter table public.care_messages        enable row level security;

create policy care_thread_select on public.care_message_threads
  for select using (patient_user_id = auth.uid() or public.care_can_access_any(auth.uid(), patient_user_id));
create policy care_thread_insert on public.care_message_threads
  for insert with check (
    patient_user_id = auth.uid()
    or (public.care_is_org_member(organization_id, auth.uid()) and public.care_can_access_any(auth.uid(), patient_user_id))
  );

create policy care_message_select on public.care_messages
  for select using (exists (
    select 1 from public.care_message_threads t
    where t.id = thread_id
      and (t.patient_user_id = auth.uid() or public.care_can_access_any(auth.uid(), t.patient_user_id))
  ));
create policy care_message_insert on public.care_messages
  for insert with check (
    sender_user_id = auth.uid()
    and exists (
      select 1 from public.care_message_threads t
      where t.id = thread_id
        and (t.patient_user_id = auth.uid() or public.care_can_access_any(auth.uid(), t.patient_user_id))
    )
  );

-- ---------------------------------------------------------------------------
-- Espelhar nota/orientação na linha do tempo (care_timeline_events).
-- ---------------------------------------------------------------------------
create or replace function public.care_tl_from_note()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.care_timeline_events
    (organization_id, patient_user_id, actor_user_id, actor_profession, kind, category, ref_type, ref_id, visibility)
  values (new.organization_id, new.patient_user_id, new.author_user_id, new.profession, 'note', new.category,
          'care_professional_notes', new.id, new.visibility);
  return new;
end;
$$;
create trigger care_note_timeline after insert on public.care_professional_notes
  for each row execute function public.care_tl_from_note();

-- Mantém a visibilidade do evento em sincronia quando a nota muda de visibilidade.
create or replace function public.care_tl_sync_note()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.visibility is distinct from old.visibility or new.category is distinct from old.category then
    update public.care_timeline_events
      set visibility = new.visibility, category = new.category
      where ref_type = 'care_professional_notes' and ref_id = new.id;
  end if;
  return new;
end;
$$;
create trigger care_note_timeline_sync after update on public.care_professional_notes
  for each row execute function public.care_tl_sync_note();

create or replace function public.care_tl_from_guidance()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.care_timeline_events
    (organization_id, patient_user_id, actor_user_id, actor_profession, kind, category, ref_type, ref_id, visibility)
  values (new.organization_id, new.patient_user_id, new.author_user_id, new.profession, 'guidance', null,
          'care_guidance', new.id, 'compartilhada_paciente');
  return new;
end;
$$;
create trigger care_guidance_timeline after insert on public.care_guidance
  for each row execute function public.care_tl_from_guidance();
