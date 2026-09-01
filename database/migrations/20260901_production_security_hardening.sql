-- Production hardening: least privilege, tenant isolation and clinical audit.
-- Apply first in staging. This migration is additive except for policy/privilege hardening.

begin;

create extension if not exists btree_gist with schema extensions;

create table if not exists public.crm_asignaciones_fisio_paciente (
  id uuid primary key default gen_random_uuid(),
  fisioterapeuta_id uuid not null references public.crm_perfiles(id) on delete cascade,
  paciente_id uuid not null references public.crm_pacientes(id) on delete cascade,
  estado text not null default 'activa' check (estado in ('activa', 'inactiva')),
  asignado_en timestamptz not null default now(),
  desasignado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fisioterapeuta_id, paciente_id)
);

create index if not exists idx_crm_asignaciones_paciente_estado
  on public.crm_asignaciones_fisio_paciente (paciente_id, estado);
create index if not exists idx_crm_asignaciones_fisio_estado
  on public.crm_asignaciones_fisio_paciente (fisioterapeuta_id, estado);

alter table public.crm_recomendaciones
  add column if not exists reviewed_by_profile_id uuid references public.crm_perfiles(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists approval_note text,
  add column if not exists prompt_version text,
  add column if not exists model_name text,
  add column if not exists idempotency_key uuid;

alter table public.crm_recomendaciones drop constraint if exists crm_recomendaciones_estado_check;
update public.crm_recomendaciones
set estado = 'requiere_revision'
where estado = 'generada';
alter table public.crm_recomendaciones
  add constraint crm_recomendaciones_estado_check
  check (estado in ('requiere_revision', 'aprobada', 'rechazada', 'enviada', 'error'));
alter table public.crm_recomendaciones alter column estado set default 'requiere_revision';

create unique index if not exists uq_crm_recomendaciones_idempotency
  on public.crm_recomendaciones(idempotency_key)
  where idempotency_key is not null;

create unique index if not exists uq_crm_citas_request_id
  on public.crm_citas(request_id)
  where request_id is not null;

create table if not exists public.crm_recordatorio_envios (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references public.crm_citas(id) on delete cascade,
  tipo text not null check (tipo in ('24h', '1h')),
  canal text not null default 'telegram' check (canal in ('telegram', 'email', 'sms')),
  estado text not null check (estado in ('processing', 'sent', 'failed')),
  intento_en timestamptz not null default now(),
  enviado_en timestamptz,
  error_code text,
  unique (cita_id, tipo, canal)
);

create table if not exists public.crm_audit_log (
  id bigserial primary key,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  actor_type text not null check (actor_type in ('system', 'admin', 'fisioterapeuta', 'paciente', 'n8n', 'telegram')),
  actor_id uuid,
  request_id uuid,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_crm_audit_entity on public.crm_audit_log(entity_type, entity_id);
create index if not exists idx_crm_audit_created on public.crm_audit_log(created_at desc);

create or replace function public.get_my_profile_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select id
  from public.crm_perfiles
  where auth_user_id = (select auth.uid()) and activo = true
  limit 1
$$;

create or replace function public.get_my_profesional_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select id
  from public.profesionales
  where id_usuario_auth = (select auth.uid())
  limit 1
$$;

create or replace function public.is_crm_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.crm_perfiles
    where auth_user_id = (select auth.uid()) and rol = 'admin' and activo = true
  )
$$;

create or replace function public.can_access_crm_patient(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_crm_admin() or exists (
    select 1
    from public.crm_pacientes patient
    where patient.id = target_patient_id
      and (
        patient.created_by_profile_id = public.get_my_profile_id()
        or exists (
          select 1 from public.crm_asignaciones_fisio_paciente assignment
          where assignment.paciente_id = patient.id
            and assignment.fisioterapeuta_id = public.get_my_profile_id()
            and assignment.estado = 'activa'
        )
      )
  )
$$;

revoke all on function public.get_my_profile_id() from public, anon;
revoke all on function public.get_my_profesional_id() from public, anon;
revoke all on function public.is_crm_admin() from public, anon;
revoke all on function public.can_access_crm_patient(uuid) from public, anon;
grant execute on function public.get_my_profile_id() to authenticated;
grant execute on function public.get_my_profesional_id() to authenticated;
grant execute on function public.is_crm_admin() to authenticated;
grant execute on function public.can_access_crm_patient(uuid) to authenticated;

-- Vault access is server-only. It must never be callable through the public Data API.
revoke all on function public.vault_read_secret(text) from public, anon, authenticated;
grant execute on function public.vault_read_secret(text) to service_role;

alter function public.crm_set_updated_at() set search_path = pg_catalog, public;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'crm_perfiles','crm_pacientes','crm_asignaciones_fisio_paciente','crm_citas',
    'crm_ejercicios_catalogo','crm_ejercicio_media','crm_recomendaciones',
    'crm_recomendacion_items','crm_async_jobs','crm_comunicaciones','crm_pagos',
    'crm_notas_clinicas','crm_facturas','crm_documentos','crm_bonos',
    'crm_recordatorio_envios','crm_audit_log','telegram_onboarding_pending',
    'telegram_chat_sessions'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('alter table public.%I force row level security', table_name);
    end if;
  end loop;
end $$;

-- Remove previous permissive CRM policies before installing the canonical set.
-- Otherwise PostgreSQL combines permissive policies with OR and can widen access.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename::text = any (array[
        'crm_perfiles','crm_pacientes','crm_asignaciones_fisio_paciente','crm_citas',
        'crm_ejercicios_catalogo','crm_ejercicio_media','crm_recomendaciones',
        'crm_recomendacion_items','crm_async_jobs','crm_comunicaciones','crm_pagos',
        'crm_notas_clinicas','crm_facturas','crm_documentos','crm_bonos',
        'crm_recordatorio_envios','crm_audit_log','telegram_onboarding_pending',
        'telegram_chat_sessions'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end $$;

-- Canonical CRM policies; explicit drops keep the migration re-runnable.
drop policy if exists crm_profiles_select on public.crm_perfiles;
drop policy if exists crm_profiles_update on public.crm_perfiles;
create policy crm_profiles_select on public.crm_perfiles for select to authenticated
  using (auth_user_id = (select auth.uid()) or public.is_crm_admin());
create policy crm_profiles_update on public.crm_perfiles for update to authenticated
  using (auth_user_id = (select auth.uid()) or public.is_crm_admin())
  with check (auth_user_id = (select auth.uid()) or public.is_crm_admin());
revoke update on public.crm_perfiles from authenticated;
grant update (nombre_completo, email, telegram_username) on public.crm_perfiles to authenticated;

drop policy if exists crm_patients_all on public.crm_pacientes;
create policy crm_patients_all on public.crm_pacientes for all to authenticated
  using (public.can_access_crm_patient(id))
  with check (
    public.is_crm_admin()
    or created_by_profile_id = public.get_my_profile_id()
    or public.can_access_crm_patient(id)
  );

drop policy if exists crm_assignments_all on public.crm_asignaciones_fisio_paciente;
create policy crm_assignments_all on public.crm_asignaciones_fisio_paciente for all to authenticated
  using (public.is_crm_admin() or fisioterapeuta_id = public.get_my_profile_id())
  with check (public.is_crm_admin() or fisioterapeuta_id = public.get_my_profile_id());

drop policy if exists crm_catalog_select on public.crm_ejercicios_catalogo;
create policy crm_catalog_select on public.crm_ejercicios_catalogo for select to authenticated using (true);
drop policy if exists crm_media_select on public.crm_ejercicio_media;
create policy crm_media_select on public.crm_ejercicio_media for select to authenticated using (true);

drop policy if exists crm_appointments_all on public.crm_citas;
create policy crm_appointments_all on public.crm_citas for all to authenticated
  using (public.can_access_crm_patient(paciente_id))
  with check (
    public.can_access_crm_patient(paciente_id)
    and (fisioterapeuta_id = public.get_my_profile_id() or public.is_crm_admin())
  );

drop policy if exists crm_recommendations_all on public.crm_recomendaciones;
create policy crm_recommendations_all on public.crm_recomendaciones for all to authenticated
  using (public.can_access_crm_patient(paciente_id))
  with check (
    public.can_access_crm_patient(paciente_id)
    and (fisioterapeuta_id = public.get_my_profile_id() or public.is_crm_admin())
  );

drop policy if exists crm_recommendation_items_all on public.crm_recomendacion_items;
create policy crm_recommendation_items_all on public.crm_recomendacion_items for all to authenticated
  using (exists (
    select 1 from public.crm_recomendaciones recommendation
    where recommendation.id = recomendacion_id
      and public.can_access_crm_patient(recommendation.paciente_id)
  ))
  with check (exists (
    select 1 from public.crm_recomendaciones recommendation
    where recommendation.id = recomendacion_id
      and public.can_access_crm_patient(recommendation.paciente_id)
  ));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'crm_async_jobs','crm_comunicaciones','crm_pagos','crm_notas_clinicas',
    'crm_facturas','crm_documentos','crm_bonos'
  ] loop
    execute format('drop policy if exists crm_patient_scope on public.%I', table_name);
    execute format(
      'create policy crm_patient_scope on public.%I for all to authenticated using (public.can_access_crm_patient(paciente_id)) with check (public.can_access_crm_patient(paciente_id))',
      table_name
    );
  end loop;
end $$;

-- Internal-only tables: no anon/authenticated policies. service_role bypasses RLS.
revoke all on public.telegram_onboarding_pending from anon, authenticated;
revoke all on public.telegram_chat_sessions from anon, authenticated;
revoke all on public.crm_recordatorio_envios from anon, authenticated;
revoke all on public.crm_audit_log from anon, authenticated;
grant select, insert, update, delete on public.crm_asignaciones_fisio_paciente to authenticated;
grant all on public.crm_recordatorio_envios to service_role;
grant all on public.crm_audit_log to service_role;
grant usage, select on sequence public.crm_audit_log_id_seq to service_role;

-- Prevent overlapping active appointments for the same professional.
alter table public.crm_citas drop constraint if exists crm_citas_no_overlap;
alter table public.crm_citas add constraint crm_citas_no_overlap
  exclude using gist (
    fisioterapeuta_id with =,
    tstzrange(inicio_en, fin_en, '[)') with &&
  ) where (estado in ('pendiente', 'confirmada', 'reprogramada'));

create index if not exists idx_crm_async_jobs_fisio on public.crm_async_jobs(fisioterapeuta_id);
create index if not exists idx_crm_comunicaciones_fisio on public.crm_comunicaciones(fisioterapeuta_id);
create index if not exists idx_crm_comunicaciones_reco on public.crm_comunicaciones(recomendacion_id);
create index if not exists idx_crm_comunicaciones_cita on public.crm_comunicaciones(cita_id);
create index if not exists idx_crm_pacientes_creator on public.crm_pacientes(created_by_profile_id);

commit;
