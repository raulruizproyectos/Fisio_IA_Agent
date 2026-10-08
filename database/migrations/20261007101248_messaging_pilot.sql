-- Single-clinic messaging pilot. Links and processing state are server-owned.
begin;

alter table public.crm_citas drop constraint crm_citas_canal_origen_check;
alter table public.crm_citas add constraint crm_citas_canal_origen_check
  check (canal_origen in ('telegram', 'whatsapp', 'crm_web', 'manual', 'n8n'));

create table public.crm_mensajeria_vinculos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.crm_clinicas(id),
  paciente_id uuid not null,
  canal text not null check (canal in ('telegram', 'whatsapp')),
  chat_id text,
  telefono text,
  codigo_hash text unique,
  codigo_expira_en timestamptz,
  consentimiento_en timestamptz,
  baja_en timestamptz,
  reserva jsonb not null default '{}'::jsonb,
  version integer not null default 0,
  unique (paciente_id, canal),
  unique (clinica_id, canal, chat_id),
  foreign key (paciente_id, clinica_id) references public.crm_pacientes(id, clinica_id)
);

create table public.crm_mensajeria_eventos (
  id text primary key,
  clinica_id uuid not null references public.crm_clinicas(id),
  canal text not null check (canal in ('telegram', 'whatsapp')),
  session_id text not null,
  evento text not null,
  message_id text not null,
  delivery_status text,
  chat_id text,
  estado text not null default 'procesando' check (estado in ('procesando', 'procesado', 'revision_manual')),
  created_at timestamptz not null default now()
);
create index crm_messaging_receipts on public.crm_mensajeria_eventos(clinica_id, session_id, message_id);

alter table public.crm_recomendaciones add constraint crm_recommendation_patient_key unique (id, paciente_id);
create table public.crm_whatsapp_envios (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.crm_clinicas(id),
  paciente_id uuid not null,
  recomendacion_id uuid not null,
  report_version integer not null,
  session_id text not null,
  chat_id text not null,
  message_id text,
  estado text not null default 'procesando' check (estado in ('procesando', 'aceptado', 'entregado', 'leido', 'fallido', 'desconocido')),
  created_at timestamptz not null default now(),
  unique (recomendacion_id, report_version),
  unique (session_id, message_id),
  foreign key (paciente_id, clinica_id) references public.crm_pacientes(id, clinica_id),
  foreign key (recomendacion_id, paciente_id) references public.crm_recomendaciones(id, paciente_id)
);

alter table public.crm_mensajeria_vinculos enable row level security;
alter table public.crm_mensajeria_eventos enable row level security;
alter table public.crm_whatsapp_envios enable row level security;
revoke all on public.crm_mensajeria_vinculos, public.crm_mensajeria_eventos, public.crm_whatsapp_envios from public, anon, authenticated;
grant all on public.crm_mensajeria_vinculos, public.crm_mensajeria_eventos, public.crm_whatsapp_envios to service_role;
grant select on public.crm_mensajeria_vinculos, public.crm_whatsapp_envios to authenticated;
create policy messaging_links_read on public.crm_mensajeria_vinculos for select to authenticated
  using (clinica_id = private.get_my_clinic_id() and private.can_access_crm_patient(paciente_id));
create policy whatsapp_sends_read on public.crm_whatsapp_envios for select to authenticated
  using (clinica_id = private.get_my_clinic_id() and private.can_access_crm_patient(paciente_id));

commit;
