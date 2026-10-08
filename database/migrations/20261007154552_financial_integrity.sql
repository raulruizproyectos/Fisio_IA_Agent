-- Local/staging first. Depends on clinic isolation. Not a compliant SIF by itself.
begin;

-- Historical invoices cannot be linked to payments by guessing their amounts.
do $$ begin
  if exists(select 1 from public.crm_facturas) then
    raise exception 'Revisar y vincular las facturas históricas antes de aplicar esta actualización';
  end if;
end $$;
alter table public.crm_pagos add column factura_id uuid references public.crm_facturas(id) on delete restrict;
create index crm_pagos_factura_idx on public.crm_pagos(factura_id);
alter table public.crm_facturas add column exencion_iva text;
alter table public.crm_bonos add constraint bono_used_nonnegative check(sesiones_usadas >= 0),
  add constraint bono_dates_valid check(fecha_caducidad is null or fecha_caducidad >= fecha_inicio);

create function private.guard_invoiced_payment() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='DELETE' then
    if old.factura_id is not null then raise exception using errcode='PT409', message='El cobro facturado debe conservarse'; end if;
    return old;
  end if;
  if current_user in ('anon','authenticated','service_role') and
    ((tg_op='INSERT' and new.factura_id is not null) or (tg_op='UPDATE' and new.factura_id is distinct from old.factura_id)) then
    raise exception using errcode='42501', message='La vinculación de cobros requiere emitir la factura';
  end if;
  if tg_op='UPDATE' and old.factura_id is not null and
    (to_jsonb(new)-array['notas','updated_at']) is distinct from (to_jsonb(old)-array['notas','updated_at']) then
    raise exception using errcode='PT409', message='No se puede modificar un cobro ya facturado';
  end if;
  return new;
end $$;
revoke all on function private.guard_invoiced_payment() from public,anon,authenticated,service_role;
create trigger guard_invoiced_payment before insert or update or delete on public.crm_pagos
  for each row execute function private.guard_invoiced_payment();
revoke insert,update,delete on public.crm_facturas from authenticated,service_role;

create function public.consume_clinic_bono(target_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; today date := (current_timestamp at time zone 'Europe/Madrid')::date;
begin
  update public.crm_bonos set sesiones_usadas=sesiones_usadas+1,
    estado=case when sesiones_usadas+1=sesiones_total then 'agotado' else 'activo' end,updated_at=clock_timestamp()
  where id=target_id and estado='activo' and sesiones_usadas<sesiones_total and fecha_inicio<=today
    and (fecha_caducidad is null or fecha_caducidad>=today) returning to_jsonb(crm_bonos) into result;
  if result is null then
    if not exists(select 1 from public.crm_bonos where id=target_id) then
      raise exception using errcode='PT404',message='Bono no encontrado';
    end if;
    raise exception using errcode='PT409',message='El bono está agotado, inactivo o fuera de sus fechas de uso';
  end if;
  return result;
end $$;
revoke all on function public.consume_clinic_bono(uuid) from public,anon,service_role;
grant execute on function public.consume_clinic_bono(uuid) to authenticated;

create function private.issue_clinic_invoice(target_patient uuid, payment_ids uuid[], tax_percent numeric, invoice_notes text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=private.get_my_profile_id(); actor_role text; invoice public.crm_facturas%rowtype;
  payment public.crm_pagos%rowtype; ids uuid[]:='{}'; lines jsonb:='[]'; total numeric:=0;
  base numeric; next_number bigint; today date:=(current_timestamp at time zone 'Europe/Madrid')::date;
  invoice_year integer:=extract(year from today);
begin
  if auth.uid() is null or actor is null or not private.can_access_crm_patient(target_patient) then
    raise exception using errcode='42501',message='Paciente no autorizado';
  end if;
  select rol into actor_role from public.crm_perfiles where id=actor;
  if actor_role not in ('admin','fisioterapeuta') then raise exception using errcode='42501',message='Perfil profesional no autorizado'; end if;
  if tax_percent is null or tax_percent::text in ('NaN','Infinity','-Infinity') or tax_percent<0 or tax_percent>100
    or round(tax_percent,2)<>tax_percent then
    raise exception using errcode='PT400',message='Porcentaje de IVA inválido';
  end if;
  if payment_ids is not null and (cardinality(payment_ids)=0 or cardinality(payment_ids)>500
    or array_position(payment_ids,null) is not null
    or cardinality(payment_ids)<>(select count(distinct id) from unnest(payment_ids) id)) then
    raise exception using errcode='PT400',message='Selecciona cobros válidos sin duplicados';
  end if;
  -- ponytail: one clinic; global annual series. Separate fiscal series if additional issuers are introduced.
  perform pg_advisory_xact_lock(714552,invoice_year);
  for payment in select * from public.crm_pagos where paciente_id=target_patient
    and (payment_ids is null or id=any(payment_ids)) order by id for update loop
    if payment.factura_id is not null then
      if payment_ids is not null then raise exception using errcode='PT409',message='Un cobro seleccionado ya está facturado'; end if;
      continue;
    end if;
    if payment.importe::text in ('NaN','Infinity','-Infinity') or payment.importe<=0 then
      raise exception using errcode='PT409',message='Revisa el importe de los cobros seleccionados';
    end if;
    ids:=array_append(ids,payment.id); total:=total+payment.importe;
    lines:=lines||jsonb_build_array(jsonb_build_object('pago_id',payment.id,'concepto',payment.concepto,'fecha',payment.fecha,'importe',payment.importe));
  end loop;
  if payment_ids is not null and cardinality(ids)<>cardinality(payment_ids) then
    raise exception using errcode='PT400',message='Algún cobro no pertenece al paciente o no existe';
  end if;
  if cardinality(ids)=0 then raise exception using errcode='PT409',message='No quedan cobros pendientes de facturar'; end if;
  base:=round(total/(1+tax_percent/100),2);
  select coalesce(max((regexp_match(numero,'^FACT-'||invoice_year||'-([0-9]+)$'))[1]::bigint),0)+1
    into next_number from public.crm_facturas;
  insert into public.crm_facturas(numero,paciente_id,fecha,lineas,importe_bruto,iva_pct,importe_iva,importe_total,estado,notas,exencion_iva)
    values('FACT-'||invoice_year||'-'||lpad(next_number::text,greatest(4,length(next_number::text)),'0'),
      target_patient,today,lines,base,tax_percent,total-base,total,'pagada',invoice_notes,
      case when tax_percent=0 then 'Operación exenta de IVA conforme al artículo 20.Uno.3º de la Ley 37/1992' end)
    returning * into invoice;
  update public.crm_pagos set factura_id=invoice.id,updated_at=clock_timestamp() where id=any(ids);
  insert into public.crm_audit_log(entity_type,entity_id,action,actor_type,actor_id,after_state)
    values('invoice',invoice.id,'issue_invoice',actor_role,actor,to_jsonb(invoice));
  return to_jsonb(invoice);
end $$;
revoke all on function private.issue_clinic_invoice(uuid,uuid[],numeric,text) from public,anon,service_role;
grant execute on function private.issue_clinic_invoice(uuid,uuid[],numeric,text) to authenticated;
create function public.issue_clinic_invoice(target_patient uuid,payment_ids uuid[] default null,tax_percent numeric default 0,invoice_notes text default null)
returns jsonb language sql security invoker set search_path='' as $$
  select private.issue_clinic_invoice(target_patient,payment_ids,tax_percent,invoice_notes)
$$;
revoke all on function public.issue_clinic_invoice(uuid,uuid[],numeric,text) from public,anon,service_role;
grant execute on function public.issue_clinic_invoice(uuid,uuid[],numeric,text) to authenticated;
commit;
