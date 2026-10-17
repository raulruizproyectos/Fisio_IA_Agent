-- Clinical record integrity at the database, not only in the API:
-- a signed consent is never deleted or rewritten (it may only be annulled), and a clinical note
-- keeps its author; only that author or a clinic admin may change or delete it.
begin;
create function private.guard_signed_document() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if old.estado <> 'firmado' then
    return case when tg_op='DELETE' then old else new end;
  end if;
  if tg_op='DELETE' then
    raise exception using errcode='PT409',message='Un documento firmado no se puede eliminar';
  end if;
  if new.estado='anulado' and (to_jsonb(new)-array['estado','updated_at']) = (to_jsonb(old)-array['estado','updated_at']) then
    return new;
  end if;
  raise exception using errcode='PT409',message='Un documento firmado no se puede modificar; solo anular';
end $$;
revoke all on function private.guard_signed_document() from public,anon,authenticated,service_role;
create trigger guard_signed_document before update or delete on public.crm_documentos
  for each row execute function private.guard_signed_document();

create function private.guard_clinical_note_author() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and new.profesional_id is distinct from old.profesional_id then
    raise exception using errcode='42501',message='El autor de una nota clínica no se puede cambiar';
  end if;
  -- Server maintenance (service role) keeps working; professionals act on their own notes unless admin.
  if current_user='authenticated' and old.profesional_id is not null
    and old.profesional_id is distinct from private.get_my_profile_id() and not private.is_crm_admin() then
    raise exception using errcode='42501',message='Solo quien escribió la nota o un administrador puede modificarla';
  end if;
  return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function private.guard_clinical_note_author() from public,anon,authenticated,service_role;
create trigger guard_clinical_note_author before update or delete on public.crm_notas_clinicas
  for each row execute function private.guard_clinical_note_author();
commit;
