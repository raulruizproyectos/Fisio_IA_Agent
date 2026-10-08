-- Preserve the CRM write while an external Calendar mutation is unconfirmed.
alter table public.crm_citas
  add column if not exists calendar_sync_pending boolean not null default false;

comment on column public.crm_citas.calendar_sync_pending is
  'CRM write saved before Calendar; true blocks further Calendar writes and reconciliation until verified.';
