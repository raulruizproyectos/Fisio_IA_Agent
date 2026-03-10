-- schema_vnext.sql
-- Propuesta aditiva (no destructiva) para el pivot CRM + Agents.
-- Regla: no drop, no alter de estructuras legacy desconocidas.
-- Convencion: tablas prefijadas con crm_ en schema public para minimizar colisiones.
--
-- Storage note:
-- - Bucket: ejercicios (private)
-- - Persistir object_key en BD
-- - Generar signed URLs JIT en n8n con service role key
-- - No guardar signed URLs en BD

create extension if not exists pgcrypto;

-- =========================
-- Roles / perfiles
-- =========================
create table if not exists public.crm_perfiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  rol text not null check (rol in ('admin', 'fisioterapeuta')),
  nombre_completo text,
  email text,
  telegram_chat_id text,
  telegram_username text,
  telegram_linked_at timestamptz,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_perfiles_rol on public.crm_perfiles(rol);
create index if not exists idx_crm_perfiles_activo on public.crm_perfiles(activo);
create unique index if not exists idx_crm_perfiles_telegram_chat_id on public.crm_perfiles(telegram_chat_id) where telegram_chat_id is not null;

-- =========================
-- Pacientes y asignaciones
-- =========================
create table if not exists public.crm_pacientes (
  id uuid primary key default gen_random_uuid(),
  codigo_paciente text unique,
  nombre text not null,
  apellidos text,
  telefono text,
  email text,
  fecha_nacimiento date,
  observaciones text,
  activo boolean not null default true,
  created_by_profile_id uuid references public.crm_perfiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_pacientes_nombre on public.crm_pacientes(nombre);
create index if not exists idx_crm_pacientes_activo on public.crm_pacientes(activo);
create index if not exists idx_crm_pacientes_created_at on public.crm_pacientes(created_at desc);

create table if not exists public.crm_asignaciones_fisio_paciente (
  id uuid primary key default gen_random_uuid(),
  fisioterapeuta_id uuid not null references public.crm_perfiles(id),
  paciente_id uuid not null references public.crm_pacientes(id),
  estado text not null default 'activa' check (estado in ('activa', 'inactiva')),
  asignado_en timestamptz not null default now(),
  desasignado_en timestamptz,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fisioterapeuta_id, paciente_id)
);

create index if not exists idx_crm_asig_fisio on public.crm_asignaciones_fisio_paciente(fisioterapeuta_id);
create index if not exists idx_crm_asig_paciente on public.crm_asignaciones_fisio_paciente(paciente_id);
create index if not exists idx_crm_asig_estado on public.crm_asignaciones_fisio_paciente(estado);

-- =========================
-- Sesiones y notas
-- =========================
create table if not exists public.crm_sesiones (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.crm_pacientes(id),
  fisioterapeuta_id uuid references public.crm_perfiles(id),
  fecha_sesion timestamptz not null,
  estado text not null default 'completada' check (estado in ('programada', 'completada', 'cancelada')),
  resumen text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_sesiones_paciente_fecha on public.crm_sesiones(paciente_id, fecha_sesion desc);
create index if not exists idx_crm_sesiones_fisio_fecha on public.crm_sesiones(fisioterapeuta_id, fecha_sesion desc);
create index if not exists idx_crm_sesiones_created_at on public.crm_sesiones(created_at desc);

create table if not exists public.crm_notas_seguimiento (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.crm_pacientes(id),
  fisioterapeuta_id uuid references public.crm_perfiles(id),
  sesion_id uuid references public.crm_sesiones(id),
  nota_texto text not null,
  escala_dolor smallint check (escala_dolor between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_notas_paciente_created on public.crm_notas_seguimiento(paciente_id, created_at desc);
create index if not exists idx_crm_notas_fisio_created on public.crm_notas_seguimiento(fisioterapeuta_id, created_at desc);

-- =========================
-- Citas (agenda)
-- =========================
create table if not exists public.crm_citas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.crm_pacientes(id),
  fisioterapeuta_id uuid references public.crm_perfiles(id),
  inicio_en timestamptz not null,
  fin_en timestamptz not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_show', 'reprogramada')),
  canal_origen text not null default 'telegram' check (canal_origen in ('telegram', 'crm_web', 'manual', 'n8n')),
  motivo text,
  google_calendar_event_id text,
  request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fin_en > inicio_en)
);

create unique index if not exists uq_crm_citas_gcal_event
  on public.crm_citas(google_calendar_event_id)
  where google_calendar_event_id is not null;

create index if not exists idx_crm_citas_paciente_inicio on public.crm_citas(paciente_id, inicio_en desc);
create index if not exists idx_crm_citas_fisio_inicio on public.crm_citas(fisioterapeuta_id, inicio_en desc);
create index if not exists idx_crm_citas_estado on public.crm_citas(estado);
create index if not exists idx_crm_citas_request on public.crm_citas(request_id);

-- =========================
-- Catalogo ejercicios + media
-- =========================
create table if not exists public.crm_ejercicios_catalogo (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  nombre text not null,
  descripcion text,
  zona_corporal text,
  nivel text check (nivel in ('bajo', 'medio', 'alto')),
  contraindicaciones text,
  activo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_ejercicios_nombre on public.crm_ejercicios_catalogo(nombre);
create index if not exists idx_crm_ejercicios_zona on public.crm_ejercicios_catalogo(zona_corporal);
create index if not exists idx_crm_ejercicios_activo on public.crm_ejercicios_catalogo(activo);

create table if not exists public.crm_ejercicio_media (
  id uuid primary key default gen_random_uuid(),
  ejercicio_id uuid not null references public.crm_ejercicios_catalogo(id),
  tipo_media text not null default 'imagen' check (tipo_media in ('imagen', 'gif', 'video')),
  object_key text not null unique,
  mime_type text,
  ancho_px integer,
  alto_px integer,
  duracion_segundos numeric(8,2),
  es_principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_media_ejercicio on public.crm_ejercicio_media(ejercicio_id);
create index if not exists idx_crm_media_principal on public.crm_ejercicio_media(es_principal);

-- =========================
-- Recomendaciones + items
-- =========================
create table if not exists public.crm_recomendaciones (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.crm_pacientes(id),
  fisioterapeuta_id uuid references public.crm_perfiles(id),
  origen text not null default 'telegram' check (origen in ('telegram', 'crm_web', 'manual', 'n8n')),
  symptom_summary text,
  red_flags_present boolean not null default false,
  red_flags_items jsonb not null default '[]'::jsonb,
  selection_rationale text,
  message_to_patient_es text,
  message_to_therapist_es text,
  escalation_recommend_medical_attention boolean not null default false,
  escalation_reason text,
  request_id uuid,
  estado text not null default 'generada' check (estado in ('generada', 'enviada', 'error', 'requiere_revision')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_reco_paciente_created on public.crm_recomendaciones(paciente_id, created_at desc);
create index if not exists idx_crm_reco_fisio_created on public.crm_recomendaciones(fisioterapeuta_id, created_at desc);
create index if not exists idx_crm_reco_estado on public.crm_recomendaciones(estado);
create index if not exists idx_crm_reco_request on public.crm_recomendaciones(request_id);

create table if not exists public.crm_recomendacion_items (
  id uuid primary key default gen_random_uuid(),
  recomendacion_id uuid not null references public.crm_recomendaciones(id) on delete cascade,
  ejercicio_id uuid not null references public.crm_ejercicios_catalogo(id),
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  why text,
  cautions jsonb not null default '[]'::jsonb,
  orden smallint not null default 1,
  created_at timestamptz not null default now(),
  unique (recomendacion_id, ejercicio_id)
);

create index if not exists idx_crm_reco_items_recomendacion on public.crm_recomendacion_items(recomendacion_id);
create index if not exists idx_crm_reco_items_ejercicio on public.crm_recomendacion_items(ejercicio_id);

-- =========================
-- Jobs asincronos (polling)
-- =========================
create table if not exists public.crm_async_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('exercise_recommendation')),
  tracking_request_id uuid not null default gen_random_uuid(),
  final_request_id uuid,
  paciente_id uuid references public.crm_pacientes(id),
  fisioterapeuta_id uuid references public.crm_perfiles(id),
  channel text not null default 'crm_web' check (channel in ('telegram', 'crm_web', 'backend', 'n8n', 'google_calendar')),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'error')),
  progress_message text,
  request_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb,
  error_message text,
  error_code text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_async_jobs_status on public.crm_async_jobs(status, created_at desc);
create index if not exists idx_crm_async_jobs_patient on public.crm_async_jobs(paciente_id, created_at desc);
create index if not exists idx_crm_async_jobs_tracking on public.crm_async_jobs(tracking_request_id);
create index if not exists idx_crm_async_jobs_final_request on public.crm_async_jobs(final_request_id);

-- =========================
-- Comunicaciones y auditoria
-- =========================
create table if not exists public.crm_comunicaciones (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references public.crm_pacientes(id),
  fisioterapeuta_id uuid references public.crm_perfiles(id),
  recomendacion_id uuid references public.crm_recomendaciones(id),
  cita_id uuid references public.crm_citas(id),
  channel text not null check (channel in ('telegram', 'crm_web', 'backend', 'n8n', 'google_calendar')),
  direction text not null check (direction in ('inbound', 'outbound', 'internal')),
  message_type text not null default 'text' check (message_type in ('text', 'voice', 'image', 'event', 'system')),
  message_text text,
  payload jsonb not null default '{}'::jsonb,
  request_id uuid,
  status text not null default 'received' check (status in ('received', 'processed', 'sent', 'error')),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_comms_paciente_occurred on public.crm_comunicaciones(paciente_id, occurred_at desc);
create index if not exists idx_crm_comms_channel_dir on public.crm_comunicaciones(channel, direction, occurred_at desc);
create index if not exists idx_crm_comms_request on public.crm_comunicaciones(request_id);

create table if not exists public.crm_audit_log (
  id bigserial primary key,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  actor_type text not null check (actor_type in ('system', 'admin', 'fisioterapeuta', 'paciente', 'n8n')),
  actor_id uuid,
  request_id uuid,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_audit_entity on public.crm_audit_log(entity_type, entity_id);
create index if not exists idx_crm_audit_request on public.crm_audit_log(request_id);
create index if not exists idx_crm_audit_created on public.crm_audit_log(created_at desc);

-- =========================
-- Trigger helper for updated_at
-- =========================
create or replace function public.crm_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'crm_perfiles',
    'crm_pacientes',
    'crm_asignaciones_fisio_paciente',
    'crm_sesiones',
    'crm_notas_seguimiento',
    'crm_citas',
    'crm_ejercicios_catalogo',
    'crm_ejercicio_media',
    'crm_recomendaciones',
    'crm_async_jobs'
  ];
  trigger_name text;
begin
  foreach t in array tables loop
    trigger_name := 'trg_' || t || '_updated_at';
    if not exists (
      select 1
      from pg_trigger
      where tgname = trigger_name
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.crm_set_updated_at()',
        trigger_name,
        t
      );
    end if;
  end loop;
end $$;

-- =========================
-- RLS templates (TBD, no-op)
-- =========================
-- Nota: estas plantillas son referencia y no se aplican automaticamente.
-- Ajustar segun modelo final de auth/roles en proyecto.
--
-- alter table public.crm_pacientes enable row level security;
-- create policy crm_pacientes_select_asignados
-- on public.crm_pacientes
-- for select
-- using (
--   exists (
--     select 1
--     from public.crm_asignaciones_fisio_paciente a
--     join public.crm_perfiles p on p.id = a.fisioterapeuta_id
--     where a.paciente_id = crm_pacientes.id
--       and a.estado = 'activa'
--       and p.auth_user_id = auth.uid()
--   )
-- );
--
-- alter table public.crm_recomendaciones enable row level security;
-- create policy crm_recomendaciones_select_asignados
-- on public.crm_recomendaciones
-- for select
-- using (
--   exists (
--     select 1
--     from public.crm_asignaciones_fisio_paciente a
--     join public.crm_perfiles p on p.id = a.fisioterapeuta_id
--     where a.paciente_id = crm_recomendaciones.paciente_id
--       and a.estado = 'activa'
--       and p.auth_user_id = auth.uid()
--   )
-- );

