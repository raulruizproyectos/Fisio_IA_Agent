-- One-time data operation after all four V2 SQL files, not an automatic migration.
-- Caller must BEGIN, set app.clinic_setup to the reviewed JSON (transaction-local),
-- execute this file, then COMMIT. Any exception must ROLLBACK the whole operation.
-- Auth account must already exist; never create users by inserting into auth.users.
-- ponytail: one reviewed inventory; regenerate/retest the plan if records or clinicians change.
do $$
declare
  cfg jsonb := nullif(current_setting('app.clinic_setup',true),'')::jsonb;
  clinic uuid := (cfg->>'clinic_id')::uuid;
  profile uuid := (cfg->>'profile_id')::uuid;
  account uuid := (cfg->>'auth_user_id')::uuid;
  legacy uuid := (cfg->>'legacy_professional_id')::uuid;
  patient_ids uuid[];
  assignment_ids uuid[];
  unowned_ids uuid[];
  actual_ids uuid[];
  before_profile jsonb;
  before_legacy jsonb;
begin
  if current_user not in ('postgres','supabase_admin') then
    raise exception using errcode='42501', message='La asignación requiere administración de la base';
  end if;
  if cfg is null or clinic is null or profile is null or account is null or legacy is null
    or nullif(trim(cfg->>'clinic_name'),'') is null or nullif(trim(cfg->>'owner_name'),'') is null
    or nullif(trim(cfg->>'email'),'') is null then
    raise exception 'Falta configuración revisada de clínica y cuenta';
  end if;
  select array_agg(value::uuid order by value::uuid) into patient_ids from jsonb_array_elements_text(cfg->'patient_ids');
  select coalesce(array_agg(value::uuid order by value::uuid),'{}'::uuid[]) into assignment_ids from jsonb_array_elements_text(cfg->'assignment_ids');
  select coalesce(array_agg(value::uuid order by value::uuid),'{}'::uuid[]) into unowned_ids from jsonb_array_elements_text(cfg->'unowned_patient_ids');
  if cardinality(patient_ids) is distinct from 7 or cardinality(unowned_ids) is distinct from 5 then
    raise exception 'Esta operación solo cubre los siete pacientes y cinco propietarios pendientes revisados';
  end if;

  lock table public.crm_clinicas,public.crm_perfiles,public.profesionales,public.crm_pacientes,
    public.crm_asignaciones_fisio_paciente,public.crm_citas,public.crm_recomendaciones in share row exclusive mode;
  if (select count(*) from public.crm_clinicas)<>0 or (select count(*) from public.crm_perfiles)<>1
    or (select count(*) from public.profesionales)<>1 then
    raise exception 'El inventario de clínicas/profesionales ha cambiado; no se asignan registros automáticamente';
  end if;
  if not exists(select 1 from auth.users where id=account and lower(email)=lower(trim(cfg->>'email')))
    or exists(select 1 from public.crm_perfiles where auth_user_id=account) then
    raise exception 'La cuenta Auth indicada no existe con ese correo o ya está vinculada';
  end if;
  select to_jsonb(p) into before_profile from public.crm_perfiles p where id=profile and activo
    and clinica_id is null and rol='fisioterapeuta'
    and auth_user_id is not distinct from (cfg->>'previous_auth_user_id')::uuid;
  select to_jsonb(p) into before_legacy from public.profesionales p where id=legacy and clinica_id is null
    and id_usuario_auth is not distinct from (cfg->>'previous_legacy_auth_user_id')::uuid;
  if before_profile is null or before_legacy is null then raise exception 'El perfil de origen ha cambiado'; end if;
  select array_agg(id order by id) into actual_ids from public.crm_pacientes;
  if actual_ids is distinct from patient_ids or exists(select 1 from public.crm_pacientes
    where clinica_id is not null or (created_by_profile_id is not null and created_by_profile_id<>profile)) then
    raise exception 'El inventario o propietarios de pacientes ha cambiado';
  end if;
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into actual_ids from public.crm_pacientes where created_by_profile_id is null;
  if actual_ids is distinct from unowned_ids then raise exception 'Los pacientes sin propietario han cambiado'; end if;
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into actual_ids from public.crm_asignaciones_fisio_paciente;
  if actual_ids is distinct from assignment_ids or exists(select 1 from public.crm_asignaciones_fisio_paciente
    where clinica_id is not null or fisioterapeuta_id<>profile or not coalesce(paciente_id=any(patient_ids),false)) then
    raise exception 'Las asignaciones de origen han cambiado';
  end if;
  if (select count(*) from public.crm_citas)<>18 or (select count(*) from public.crm_recomendaciones)<>35
    or exists(select 1 from public.crm_citas where fisioterapeuta_id is distinct from profile or not coalesce(paciente_id=any(patient_ids),false))
    or exists(select 1 from public.crm_recomendaciones where fisioterapeuta_id is distinct from profile or not coalesce(paciente_id=any(patient_ids),false)) then
    raise exception 'La agenda o planes de origen han cambiado';
  end if;

  insert into public.crm_clinicas(id,nombre,email) values(clinic,trim(cfg->>'clinic_name'),lower(trim(cfg->>'email')));
  update public.crm_perfiles set clinica_id=clinic,auth_user_id=account,rol='admin',
    email=lower(trim(cfg->>'email')),nombre_completo=trim(cfg->>'owner_name') where id=profile;
  insert into public.crm_audit_log(entity_type,entity_id,action,actor_type,actor_id,before_state,after_state)
    select 'profile',profile,'single_clinic_profile_binding','admin',profile,before_profile,to_jsonb(p)
    from public.crm_perfiles p where id=profile;
  update public.profesionales set clinica_id=clinic,id_usuario_auth=account,
    email=lower(trim(cfg->>'email')),nombre_completo=trim(cfg->>'owner_name') where id=legacy;
  insert into public.crm_audit_log(entity_type,entity_id,action,actor_type,actor_id,before_state,after_state)
    select 'legacy_professional',legacy,'single_clinic_profile_binding','admin',profile,before_legacy,to_jsonb(p)
    from public.profesionales p where id=legacy;
  insert into public.crm_audit_log(entity_type,entity_id,action,actor_type,actor_id,before_state,after_state)
    select 'patient',id,'single_clinic_patient_mapping','admin',profile,
      jsonb_build_object('clinica_id',clinica_id,'created_by_profile_id',created_by_profile_id),
      jsonb_build_object('clinica_id',clinic,'created_by_profile_id',coalesce(created_by_profile_id,profile))
    from public.crm_pacientes where id=any(patient_ids);
  update public.crm_pacientes set clinica_id=clinic,created_by_profile_id=coalesce(created_by_profile_id,profile)
    where id=any(patient_ids);
  insert into public.crm_audit_log(entity_type,entity_id,action,actor_type,actor_id,before_state,after_state)
    select 'assignment',id,'single_clinic_patient_mapping','admin',profile,
      jsonb_build_object('clinica_id',clinica_id),jsonb_build_object('clinica_id',clinic)
    from public.crm_asignaciones_fisio_paciente where id=any(assignment_ids);
  update public.crm_asignaciones_fisio_paciente set clinica_id=clinic where id=any(assignment_ids);
end $$;
alter table public.crm_perfiles validate constraint crm_profiles_clinic_required;
alter table public.crm_pacientes validate constraint crm_patients_clinic_required;
alter table public.crm_asignaciones_fisio_paciente validate constraint crm_assignments_clinic_required;
