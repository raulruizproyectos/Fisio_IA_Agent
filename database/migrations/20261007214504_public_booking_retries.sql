begin;
-- request_id already has a unique index. Bind public retries to their original payload.
alter table public.crm_citas add column public_booking_hash text
  check (public_booking_hash is null or public_booking_hash ~ '^[a-f0-9]{64}$');
comment on column public.crm_citas.public_booking_hash is
  'Server SHA-256 of the original public booking payload; never return through the booking endpoint.';
commit;
