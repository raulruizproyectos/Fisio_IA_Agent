-- V2 foundation. Requires 20260901_production_security_hardening.sql.
-- Existing records stay unassigned and inaccessible until explicitly mapped.
-- This does not configure tenant-specific Calendar/Telegram/n8n integrations.
begin;

create table public.crm_clinicas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  direccion text,
  telefono text,
  email text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.crm_clinicas enable row level security;
alter table public.crm_clinicas force row level security;
revoke all on public.crm_clinicas from public, anon, authenticated;
grant select on public.crm_clinicas to authenticated;
grant all on public.crm_clinicas to service_role;
grant usage on schema private to authenticated, service_role;

alter table public.crm_perfiles
  add column clinica_id uuid references public.crm_clinicas(id),
  add constraint crm_profiles_clinic_key unique (id, clinica_id),
  add constraint crm_profiles_clinic_required check (clinica_id is not null) not valid;
alter table public.profesionales
  add column clinica_id uuid references public.crm_clinicas(id);
alter table public.crm_pacientes
  add column clinica_id uuid references public.crm_clinicas(id),
  add constraint crm_patients_clinic_key unique (id, clinica_id),
  add constraint crm_patients_owner_clinic foreign key (created_by_profile_id, clinica_id)
    references public.crm_perfiles (id, clinica_id),
  add constraint crm_patients_clinic_required check (clinica_id is not null) not valid;
alter table public.crm_asignaciones_fisio_paciente
  add column clinica_id uuid references public.crm_clinicas(id),
  add constraint crm_assignments_profile_clinic foreign key (fisioterapeuta_id, clinica_id)
    references public.crm_perfiles (id, clinica_id),
  add constraint crm_assignments_patient_clinic foreign key (paciente_id, clinica_id)
    references public.crm_pacientes (id, clinica_id),
  add constraint crm_assignments_clinic_required check (clinica_id is not null) not valid;

create index idx_crm_profiles_clinic on public.crm_perfiles(clinica_id);
create index idx_crm_patients_clinic on public.crm_pacientes(clinica_id);
create index idx_crm_assignments_clinic on public.crm_asignaciones_fisio_paciente(clinica_id);

-- Private lookups bypass their own table policies to avoid recursive RLS.
-- Clinic membership comes from stored profiles, never user-editable JWT metadata.
create or replace function private.get_my_clinic_id()
returns uuid language sql stable security definer
set search_path = pg_catalog, public as $$
  select profile.clinica_id
  from public.crm_perfiles profile
  join public.crm_clinicas clinic on clinic.id = profile.clinica_id and clinic.activo
  where profile.auth_user_id = (select auth.uid()) and profile.activo
  limit 1
$$;

create or replace function private.get_my_profile_id()
returns uuid language sql stable security definer
set search_path = pg_catalog, public as $$
  select id from public.crm_perfiles
  where auth_user_id = (select auth.uid()) and activo
    and clinica_id = private.get_my_clinic_id()
  limit 1
$$;

create or replace function private.is_crm_admin()
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.crm_perfiles
    where auth_user_id = (select auth.uid()) and rol = 'admin' and activo
      and clinica_id = private.get_my_clinic_id()
  )
$$;

create or replace function private.can_access_crm_patient(target_patient_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.crm_pacientes patient
    where patient.id = target_patient_id
      and patient.clinica_id = private.get_my_clinic_id()
      and (
        private.is_crm_admin()
        or patient.created_by_profile_id = private.get_my_profile_id()
        or exists (
          select 1 from public.crm_asignaciones_fisio_paciente assignment
          where assignment.paciente_id = patient.id
            and assignment.clinica_id = patient.clinica_id
            and assignment.fisioterapeuta_id = private.get_my_profile_id()
            and assignment.estado = 'activa'
        )
      )
  )
$$;

create or replace function private.get_my_profesional_id()
returns uuid language sql stable security definer
set search_path = pg_catalog, public as $$
  select id from public.profesionales
  where id_usuario_auth = (select auth.uid())
    and clinica_id = private.get_my_clinic_id()
  limit 1
$$;

revoke all on function private.get_my_clinic_id() from public, anon;
grant execute on function private.get_my_clinic_id() to authenticated, service_role;
alter table public.crm_pacientes alter column clinica_id set default private.get_my_clinic_id();
alter table public.crm_asignaciones_fisio_paciente alter column clinica_id set default private.get_my_clinic_id();

-- Replace all policies on these roots: permissive policies otherwise combine with OR.
do $$
declare policy_row record;
begin
  for policy_row in select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('crm_perfiles', 'crm_pacientes', 'crm_asignaciones_fisio_paciente')
  loop
    execute format('drop policy %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end $$;

create policy crm_clinics_select on public.crm_clinicas for select to authenticated
  using (id = (select private.get_my_clinic_id()));
create policy crm_profiles_select on public.crm_perfiles for select to authenticated
  using (
    auth_user_id = (select auth.uid())
    or (clinica_id = (select private.get_my_clinic_id()) and private.is_crm_admin())
  );
create policy crm_profiles_update on public.crm_perfiles for update to authenticated
  using (
    clinica_id = (select private.get_my_clinic_id())
    and (auth_user_id = (select auth.uid()) or private.is_crm_admin())
  )
  with check (
    clinica_id = (select private.get_my_clinic_id())
    and (auth_user_id = (select auth.uid()) or private.is_crm_admin())
  );
revoke all on public.crm_perfiles from anon;
revoke insert, update, delete on public.crm_perfiles from authenticated;
grant select on public.crm_perfiles to authenticated;
grant update (nombre_completo, email, telegram_username) on public.crm_perfiles to authenticated;
revoke update on public.profesionales from authenticated;
grant update (nombre_completo, email, numero_colegiado, especialidad) on public.profesionales to authenticated;

create policy crm_patients_all on public.crm_pacientes for all to authenticated
  using (private.can_access_crm_patient(id))
  with check (
    clinica_id = (select private.get_my_clinic_id())
    and (
      private.is_crm_admin()
      or created_by_profile_id = private.get_my_profile_id()
      or private.can_access_crm_patient(id)
    )
  );
revoke all on public.crm_pacientes from anon;
grant select, insert, update, delete on public.crm_pacientes to authenticated;

create policy crm_assignments_all on public.crm_asignaciones_fisio_paciente for all to authenticated
  using (
    clinica_id = (select private.get_my_clinic_id())
    and private.can_access_crm_patient(paciente_id)
    and (private.is_crm_admin() or fisioterapeuta_id = private.get_my_profile_id())
  )
  with check (
    clinica_id = (select private.get_my_clinic_id())
    and private.can_access_crm_patient(paciente_id)
    and (private.is_crm_admin() or fisioterapeuta_id = private.get_my_profile_id())
  );
revoke all on public.crm_asignaciones_fisio_paciente from anon;

-- Patient-scoped policies installed by the prerequisite now inherit clinic isolation
-- through can_access_crm_patient; legacy policies use get_my_profesional_id.
commit;
