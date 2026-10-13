-- Booking agent, plan B and notices.
-- 1. Patients created by the assistant stay "new" until the clinic reviews the record.
-- 2. crm_solicitudes_contacto: every request the assistant cannot complete is stored before
--    the patient is told it was registered; one open request per subject and reason.
-- 3. crm_avisos_paciente: outbox of messages to the patient when the clinic confirms, changes
--    or cancels an appointment. One row per appointment, kind and start time: never sent twice.
begin;

alter table public.crm_pacientes add column if not exists origen_alta text not null default 'crm';
alter table public.crm_pacientes add constraint crm_pacientes_origen_alta_check
  check (origen_alta in ('crm', 'reserva_web', 'asistente_telegram'));
alter table public.crm_pacientes add column if not exists revisada_en timestamptz;

create table public.crm_solicitudes_contacto (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.crm_clinicas(id),
  paciente_id uuid,
  vinculo_id uuid references public.crm_mensajeria_vinculos(id) on delete set null,
  canal text not null check (canal in ('telegram', 'whatsapp')),
  chat_id text,
  telefono text not null check (telefono ~ '^\+?[0-9]{8,15}$'),
  tipo text not null check (tipo in ('reservar', 'cambiar', 'anular', 'otro')),
  motivo text not null check (motivo in ('sin_hueco', 'lectura_fallida', 'incierto', 'conflicto', 'otro_profesional',
    'telefono_existente', 'no_entendido', 'menos_24h', 'revisar_paciente_nuevo', 'peticion_paciente')),
  fecha_deseada date,
  hora_deseada text check (hora_deseada ~ '^[0-2][0-9]:[0-5][0-9]$'),
  cita_id uuid references public.crm_citas(id) on delete set null,
  clave_abierta text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_gestion', 'resuelta')),
  aviso_estado text not null default 'pendiente' check (aviso_estado in ('pendiente', 'enviando', 'enviado', 'fallido', 'incierto')),
  aviso_intentos integer not null default 0,
  request_id text not null unique,
  gestionada_por uuid,
  gestionada_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.crm_pacientes(id, clinica_id),
  foreign key (gestionada_por, clinica_id) references public.crm_perfiles(id, clinica_id)
);
create unique index crm_solicitudes_contacto_abierta_key on public.crm_solicitudes_contacto (clinica_id, clave_abierta)
  where estado <> 'resuelta';
create index crm_solicitudes_contacto_estado_idx on public.crm_solicitudes_contacto (clinica_id, estado, created_at);
create trigger crm_solicitudes_contacto_updated_at before update on public.crm_solicitudes_contacto
  for each row execute function public.crm_set_updated_at();

create table public.crm_avisos_paciente (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.crm_clinicas(id),
  paciente_id uuid not null,
  cita_id uuid not null references public.crm_citas(id) on delete cascade,
  canal text not null check (canal in ('telegram', 'whatsapp')),
  chat_id text not null,
  tipo text not null check (tipo in ('nueva', 'confirmada', 'cambiada', 'anulada')),
  inicio_en timestamptz not null,
  clave text not null unique,
  texto text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviando', 'enviado', 'fallido', 'incierto')),
  intentos integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.crm_pacientes(id, clinica_id)
);
create index crm_avisos_paciente_estado_idx on public.crm_avisos_paciente (estado, created_at);
create trigger crm_avisos_paciente_updated_at before update on public.crm_avisos_paciente
  for each row execute function public.crm_set_updated_at();

-- Written only by the server; staff of the clinic can read them (the CRM marks requests via the API).
alter table public.crm_solicitudes_contacto enable row level security;
alter table public.crm_avisos_paciente enable row level security;
revoke all on public.crm_solicitudes_contacto, public.crm_avisos_paciente from public, anon, authenticated;
grant all on public.crm_solicitudes_contacto, public.crm_avisos_paciente to service_role;
grant select on public.crm_solicitudes_contacto, public.crm_avisos_paciente to authenticated;
create policy contact_requests_read on public.crm_solicitudes_contacto for select to authenticated
  using (clinica_id = private.get_my_clinic_id() and (paciente_id is null or private.can_access_crm_patient(paciente_id)));
create policy patient_notices_read on public.crm_avisos_paciente for select to authenticated
  using (clinica_id = private.get_my_clinic_id() and private.can_access_crm_patient(paciente_id));

commit;
