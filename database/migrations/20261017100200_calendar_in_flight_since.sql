-- When a Calendar write is claimed. A claim older than a few minutes means the process died mid-request:
-- the API may then release it and verify Calendar read-only, instead of blocking the appointment forever.
begin;
alter table public.crm_citas add column calendar_sync_in_flight_since timestamptz;
-- Existing claims have no start time: count them from now, so they become recoverable after the timeout.
update public.crm_citas set calendar_sync_in_flight_since=now() where calendar_sync_in_flight;
commit;
