-- Minimal containment of the existing Vault RPC; no data or function body changes.
begin;
revoke all on function public.vault_read_secret(text) from public, anon, authenticated;
grant execute on function public.vault_read_secret(text) to service_role;
commit;
