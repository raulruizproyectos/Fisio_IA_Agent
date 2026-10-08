-- Local rehearsal first. Requires clinic isolation and enriched clinical notes. No Cloud changes implied.
begin;
create table private.clinic_creation_receipts (
  profile_id uuid not null references public.crm_perfiles(id),
  operation_id uuid not null,
  clinic_id uuid not null references public.crm_clinicas(id),
  kind text not null check(kind in ('patient','note')),
  payload_hash bytea not null,
  record_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(profile_id,operation_id)
);
alter table private.clinic_creation_receipts enable row level security;
revoke all on private.clinic_creation_receipts from public,anon,authenticated,service_role;
-- Receipts intentionally survive record deletion: a delayed retry must never resurrect a deleted note.
create function private.create_clinic_record_once(operation_id uuid, kind text, fields jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=private.get_my_profile_id(); clinic uuid:=private.get_my_clinic_id(); actor_role text;
  receipt private.clinic_creation_receipts%rowtype; result jsonb; field_key text; allowed text[];
  patient public.crm_pacientes%rowtype; note public.crm_notas_clinicas%rowtype;
begin
  select rol into actor_role from public.crm_perfiles where id=actor;
  if auth.uid() is null or actor is null or clinic is null or actor_role not in ('admin','fisioterapeuta') then
    raise exception using errcode='42501',message='Perfil profesional autorizado requerido';
  end if;
  if operation_id is null or kind is null or kind not in ('patient','note') or jsonb_typeof(fields) is distinct from 'object' then
    raise exception using errcode='PT400',message='Guardado inválido';
  end if;
  allowed:=case when kind='patient' then array['nombre','apellidos','fecha_nacimiento','email','telefono','observaciones']
    else array['paciente_id','cita_id','fecha','session_datetime','zona_corporal','dolor_eva','nota','pruebas_realizadas','structured_data','audio_processed','source'] end;
  for field_key in select jsonb_object_keys(fields) loop
    if not field_key=any(allowed) then raise exception using errcode='PT400',message='Campo de guardado no permitido'; end if;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended(actor::text||operation_id::text,0));
  select * into receipt from private.clinic_creation_receipts r where r.profile_id=actor and r.operation_id=create_clinic_record_once.operation_id;
  if found then
    if receipt.clinic_id<>clinic or receipt.kind<>kind then raise exception using errcode='PT409',message='El identificador pertenece a otro guardado'; end if;
    if kind='patient' then
      select to_jsonb(p) into result from public.crm_pacientes p where p.id=receipt.record_id and private.can_access_crm_patient(p.id);
    else
      select to_jsonb(n) into result from public.crm_notas_clinicas n where n.id=receipt.record_id and private.can_access_crm_patient(n.paciente_id);
    end if;
    if result is null then raise exception using errcode='PT409',message='El guardado anterior ya no está disponible. No se ha recreado ningún registro'; end if;
    return jsonb_build_object('data',result,'replayed',true,'conflict',receipt.payload_hash is distinct from sha256(convert_to(fields::text,'UTF8')));
  end if;
  if kind='patient' then
    for field_key in select jsonb_object_keys(fields) loop
      if jsonb_typeof(fields->field_key) not in ('string','null') or length(fields->>field_key)>10000 then
        raise exception using errcode='PT400',message='Datos del paciente inválidos';
      end if;
    end loop;
    if coalesce(length(btrim(fields->>'nombre')),0)=0 or length(fields->>'nombre')>200
      or (fields->>'email' is not null and fields->>'email' !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') then
      raise exception using errcode='PT400',message='Nombre o correo inválidos';
    end if;
    patient:=jsonb_populate_record(null::public.crm_pacientes,fields);
    if patient.fecha_nacimiento>current_date or (fields->>'fecha_nacimiento' is not null and fields->>'fecha_nacimiento' !~ '^\d{4}-\d{2}-\d{2}$') then
      raise exception using errcode='PT400',message='Fecha de nacimiento inválida';
    end if;
    insert into public.crm_pacientes(nombre,apellidos,fecha_nacimiento,email,telefono,observaciones,created_by_profile_id,clinica_id,activo)
      values(patient.nombre,patient.apellidos,patient.fecha_nacimiento,patient.email,patient.telefono,patient.observaciones,actor,clinic,true) returning * into patient;
    insert into public.crm_asignaciones_fisio_paciente(fisioterapeuta_id,paciente_id,clinica_id,estado) values(actor,patient.id,clinic,'activa');
    result:=to_jsonb(patient);
  else
    if jsonb_typeof(fields->'nota') is distinct from 'string' or coalesce(length(btrim(fields->>'nota')),0)=0 or length(fields->>'nota')>50000
      or (fields->>'dolor_eva' is not null and (jsonb_typeof(fields->'dolor_eva') not in ('number','string') or fields->>'dolor_eva' !~ '^(\d|10)$'))
      or (fields ? 'structured_data' and jsonb_typeof(fields->'structured_data') is distinct from 'object')
      or (fields ? 'audio_processed' and jsonb_typeof(fields->'audio_processed') is distinct from 'boolean')
      or (fields->>'source' is not null and fields->>'source' not in ('manual','text','voice')) then
      raise exception using errcode='PT400',message='Nota clínica inválida';
    end if;
    for field_key in select unnest(array['zona_corporal','pruebas_realizadas','fecha','session_datetime']) loop
      if fields ? field_key and jsonb_typeof(fields->field_key) not in ('string','null') then raise exception using errcode='PT400',message='Campo clínico inválido'; end if;
    end loop;
    if (fields->>'fecha' is not null and fields->>'fecha' !~ '^\d{4}-\d{2}-\d{2}$')
      or (fields->>'session_datetime' is not null and fields->>'session_datetime' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$') then
      raise exception using errcode='PT400',message='Fecha de sesión inválida';
    end if;
    note:=jsonb_populate_record(null::public.crm_notas_clinicas,fields);
    if note.paciente_id is null or not private.can_access_crm_patient(note.paciente_id) then raise exception using errcode='42501',message='Paciente no autorizado'; end if;
    if note.cita_id is not null and not exists(select 1 from public.crm_citas c where c.id=note.cita_id and c.paciente_id=note.paciente_id) then
      raise exception using errcode='PT400',message='La cita no pertenece al paciente';
    end if;
    note.session_datetime:=coalesce(note.session_datetime,(note.fecha::timestamp+interval '12 hours') at time zone 'UTC',clock_timestamp());
    note.fecha:=coalesce(note.fecha,(note.session_datetime at time zone 'UTC')::date);
    insert into public.crm_notas_clinicas(paciente_id,cita_id,profesional_id,fecha,session_datetime,zona_corporal,dolor_eva,nota,pruebas_realizadas,structured_data,audio_processed,source)
      values(note.paciente_id,note.cita_id,actor,note.fecha,note.session_datetime,note.zona_corporal,note.dolor_eva,note.nota,note.pruebas_realizadas,
        coalesce(note.structured_data,'{}'),coalesce(note.audio_processed,false),coalesce(note.source,'text')) returning * into note;
    result:=to_jsonb(note);
  end if;
  insert into private.clinic_creation_receipts(profile_id,operation_id,clinic_id,kind,payload_hash,record_id)
    values(actor,operation_id,clinic,kind,sha256(convert_to(fields::text,'UTF8')),(result->>'id')::uuid);
  insert into public.crm_audit_log(entity_type,entity_id,action,actor_type,actor_id,after_state,metadata)
    values(case when kind='patient' then 'paciente' else 'clinical_note' end,(result->>'id')::uuid,'create',actor_role,actor,result,jsonb_build_object('operation_id',operation_id));
  return jsonb_build_object('data',result,'replayed',false,'conflict',false);
end $$;
revoke all on function private.create_clinic_record_once(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.create_clinic_record_once(uuid,text,jsonb) to authenticated;
create function public.create_clinic_record_once(operation_id uuid, kind text, fields jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select private.create_clinic_record_once(operation_id,kind,fields) $$;
revoke all on function public.create_clinic_record_once(uuid,text,jsonb) from public,anon,service_role;
grant execute on function public.create_clinic_record_once(uuid,text,jsonb) to authenticated;
commit;
