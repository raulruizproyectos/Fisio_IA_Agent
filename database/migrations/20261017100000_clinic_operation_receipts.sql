-- One receipt per finance write (payment, bono, bono use, invoice), keyed by the form's Idempotency-Key.
-- claim → write → finish/release: a retry after success replays the stored result; a retry after an
-- unknown outcome is refused instead of writing twice. Requires clinic isolation (private helpers).
begin;
create table private.clinic_operation_receipts (
  profile_id uuid not null references public.crm_perfiles(id),
  operation_id uuid not null,
  clinic_id uuid not null references public.crm_clinicas(id),
  kind text not null check (kind in ('payment','bono','bono_use','invoice')),
  payload_hash bytea not null,
  status text not null default 'pending' check (status in ('pending','done')),
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, operation_id)
);
alter table private.clinic_operation_receipts enable row level security;
revoke all on private.clinic_operation_receipts from public,anon,authenticated,service_role;

create function private.claim_clinic_operation(operation_id uuid, kind text, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=private.get_my_profile_id(); clinic uuid:=private.get_my_clinic_id();
  receipt private.clinic_operation_receipts%rowtype; digest bytea;
begin
  if auth.uid() is null or actor is null or clinic is null then
    raise exception using errcode='42501',message='Perfil profesional autorizado requerido';
  end if;
  if operation_id is null or kind is null or kind not in ('payment','bono','bono_use','invoice') or jsonb_typeof(payload) is distinct from 'object' then
    raise exception using errcode='PT400',message='Operación inválida';
  end if;
  digest:=sha256(convert_to(payload::text,'UTF8'));
  perform pg_advisory_xact_lock(hashtextextended(actor::text||operation_id::text,1));
  select * into receipt from private.clinic_operation_receipts r
    where r.profile_id=actor and r.operation_id=claim_clinic_operation.operation_id;
  if found then
    if receipt.clinic_id<>clinic or receipt.kind<>kind then
      raise exception using errcode='PT409',message='El identificador pertenece a otra operación';
    end if;
    if receipt.status='done' then
      return jsonb_build_object('state','replay','result',receipt.result,'conflict',receipt.payload_hash is distinct from digest);
    end if;
    return jsonb_build_object('state','pending');
  end if;
  insert into private.clinic_operation_receipts(profile_id,operation_id,clinic_id,kind,payload_hash)
    values(actor,operation_id,clinic,kind,digest);
  return jsonb_build_object('state','claimed');
end $$;

create function private.finish_clinic_operation(operation_id uuid, result jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  update private.clinic_operation_receipts r set status='done', result=finish_clinic_operation.result, updated_at=now()
    where r.profile_id=private.get_my_profile_id() and r.operation_id=finish_clinic_operation.operation_id and r.status='pending';
end $$;

-- Only for a definite failure (nothing was written): lets the same form be submitted again.
create function private.release_clinic_operation(operation_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  delete from private.clinic_operation_receipts r
    where r.profile_id=private.get_my_profile_id() and r.operation_id=release_clinic_operation.operation_id and r.status='pending';
end $$;

revoke all on function private.claim_clinic_operation(uuid,text,jsonb) from public,anon,service_role;
revoke all on function private.finish_clinic_operation(uuid,jsonb) from public,anon,service_role;
revoke all on function private.release_clinic_operation(uuid) from public,anon,service_role;
grant execute on function private.claim_clinic_operation(uuid,text,jsonb) to authenticated;
grant execute on function private.finish_clinic_operation(uuid,jsonb) to authenticated;
grant execute on function private.release_clinic_operation(uuid) to authenticated;

create function public.claim_clinic_operation(operation_id uuid, kind text, payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select private.claim_clinic_operation(operation_id,kind,payload) $$;
create function public.finish_clinic_operation(operation_id uuid, result jsonb)
returns void language sql security invoker set search_path='' as $$ select private.finish_clinic_operation(operation_id,result) $$;
create function public.release_clinic_operation(operation_id uuid)
returns void language sql security invoker set search_path='' as $$ select private.release_clinic_operation(operation_id) $$;
revoke all on function public.claim_clinic_operation(uuid,text,jsonb) from public,anon,service_role;
revoke all on function public.finish_clinic_operation(uuid,jsonb) from public,anon,service_role;
revoke all on function public.release_clinic_operation(uuid) from public,anon,service_role;
grant execute on function public.claim_clinic_operation(uuid,text,jsonb) to authenticated;
grant execute on function public.finish_clinic_operation(uuid,jsonb) to authenticated;
grant execute on function public.release_clinic_operation(uuid) to authenticated;
commit;
