-- Booking agent: a Telegram account with a contact verified by Telegram may start
-- registration before a CRM patient exists. Such a row has no consent and gives
-- access to nothing until the server creates the patient and records consent.
begin;

alter table public.crm_mensajeria_vinculos alter column paciente_id drop not null;
alter table public.crm_mensajeria_vinculos add constraint crm_mensajeria_vinculos_onboarding_check
  check (paciente_id is not null or (chat_id is not null and telefono is not null and consentimiento_en is null));

commit;
