alter table if exists public.crm_perfiles
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_username text,
  add column if not exists telegram_linked_at timestamptz;

create unique index if not exists idx_crm_perfiles_telegram_chat_id
  on public.crm_perfiles(telegram_chat_id)
  where telegram_chat_id is not null;
