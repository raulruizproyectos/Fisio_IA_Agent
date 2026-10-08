-- Durable claim: never infer completion of an in-flight writer from elapsed time.
alter table public.crm_citas
  add column if not exists calendar_sync_in_flight boolean not null default false,
  add column if not exists calendar_sync_operation_id uuid,
  add column if not exists calendar_sync_calendar_id text;

comment on column public.crm_citas.calendar_sync_in_flight is
  'Writer claimed before sending; only its conditioned completion clears this flag. No lease expiry.';
comment on column public.crm_citas.calendar_sync_operation_id is
  'Reference included in Calendar to distinguish this operation from an older matching event.';
comment on column public.crm_citas.calendar_sync_calendar_id is
  'Original Calendar target for the pending operation; recovery must read this same target.';
