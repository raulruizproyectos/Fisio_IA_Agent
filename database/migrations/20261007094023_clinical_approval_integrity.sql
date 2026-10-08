-- Requires clinic_isolation. Apply to staging first, together with backend/frontend.
begin;

alter table public.crm_recomendaciones
  add column report_snapshot jsonb,
  add column report_version integer not null default 0;

-- Existing communication snapshots are drafts, never evidence of prior approval.
update public.crm_recomendaciones r set report_snapshot = (
  select c.payload->'report' from public.crm_comunicaciones c
  where c.recomendacion_id = r.id and c.payload->>'event' = 'exercise_report_snapshot'
    and jsonb_typeof(c.payload->'report') = 'object'
  order by c.occurred_at desc, c.created_at desc, c.id desc limit 1
);
insert into public.crm_audit_log (entity_type, entity_id, action, actor_type, before_state, metadata)
select 'recommendation', id, 'legacy_approval_requires_review', 'system',
  jsonb_build_object('estado', estado, 'reviewed_at', reviewed_at, 'reviewed_by_profile_id', reviewed_by_profile_id, 'approval_note', approval_note),
  '{"reason":"approved_content_not_previously_locked"}'::jsonb
from public.crm_recomendaciones where estado in ('aprobada', 'enviada');
update public.crm_recomendaciones set estado = 'requiere_revision', reviewed_at = null,
  reviewed_by_profile_id = null, approval_note = null
where estado in ('aprobada', 'enviada');

create function private.guard_exercise_recommendation()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare content_changed boolean;
begin
  if tg_op = 'DELETE' then
    if old.estado in ('aprobada','enviada') then
      raise exception using errcode = 'PT409', message = 'Un plan aprobado se conserva en el historial clínico';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if new.estado not in ('requiere_revision', 'error') or new.reviewed_at is not null
      or new.reviewed_by_profile_id is not null or new.approval_note is not null then
      raise exception using errcode = '42501', message = 'Un plan nuevo requiere revisión profesional';
    end if;
    new.report_version := 0;
    return new;
  end if;

  content_changed := (to_jsonb(new) - array['estado','reviewed_at','reviewed_by_profile_id','approval_note','updated_at','report_version'])
    is distinct from (to_jsonb(old) - array['estado','reviewed_at','reviewed_by_profile_id','approval_note','updated_at','report_version']);
  if old.estado in ('aprobada', 'enviada') and (content_changed or new.estado not in ('aprobada', 'enviada')) then
    raise exception using errcode = 'PT409', message = 'El contenido aprobado es inmutable; genera un plan nuevo';
  end if;
  if current_user in ('authenticated','anon','service_role') then
    if row(new.reviewed_at, new.reviewed_by_profile_id, new.approval_note)
      is distinct from row(old.reviewed_at, old.reviewed_by_profile_id, old.approval_note)
      or (new.estado is distinct from old.estado and not (
        (old.estado = 'rechazada' and new.estado = 'requiere_revision' and content_changed)
        or (current_user = 'service_role' and old.estado = 'aprobada' and new.estado = 'enviada')
      )) then
      raise exception using errcode = '42501', message = 'La aprobación debe pasar por la revisión profesional';
    end if;
    if row(new.red_flags_present, new.red_flags_items, new.escalation_recommend_medical_attention, new.escalation_reason)
      is distinct from row(old.red_flags_present, old.red_flags_items, old.escalation_recommend_medical_attention, old.escalation_reason) then
      raise exception using errcode = '42501', message = 'Las alertas originales no pueden eliminarse; documenta su revisión';
    end if;
  end if;
  new.report_version := old.report_version + case when content_changed then 1 else 0 end;
  return new;
end $$;
revoke all on function private.guard_exercise_recommendation() from public, anon, authenticated, service_role;
create trigger guard_exercise_recommendation before insert or update or delete on public.crm_recomendaciones
  for each row execute function private.guard_exercise_recommendation();

create function private.guard_exercise_items()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare parent_id uuid; parent_state text;
begin
  -- Lock both parents when an item is moved; serialize item changes with approval.
  for parent_id in select distinct id from unnest(array[
    case when tg_op <> 'INSERT' then old.recomendacion_id end,
    case when tg_op <> 'DELETE' then new.recomendacion_id end
  ]) id where id is not null order by id loop
    select estado into parent_state from public.crm_recomendaciones where id = parent_id for update;
    if parent_state in ('aprobada','enviada') then
      raise exception using errcode = 'PT409', message = 'Los ejercicios aprobados no admiten cambios';
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke all on function private.guard_exercise_items() from public, anon, authenticated, service_role;
create trigger guard_exercise_items before insert or update or delete on public.crm_recomendacion_items
  for each row execute function private.guard_exercise_items();

create function private.review_exercise_recommendation(target_id uuid, decision text, note text, expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.crm_recomendaciones%rowtype;
  reviewer uuid := private.get_my_profile_id();
  reviewer_role text;
  exercise_count integer;
  valid_count integer;
  result jsonb;
begin
  if auth.uid() is null or reviewer is null then
    raise exception using errcode = '42501', message = 'Se requiere una sesión profesional activa';
  end if;
  select rol into reviewer_role from public.crm_perfiles where id = reviewer;
  if reviewer_role not in ('admin','fisioterapeuta') then
    raise exception using errcode = '42501', message = 'Perfil profesional no autorizado';
  end if;
  select * into r from public.crm_recomendaciones where id = target_id for update;
  if not found or not private.can_access_crm_patient(r.paciente_id) then
    raise exception using errcode = 'PT404', message = 'Recomendación no encontrada';
  end if;
  if decision is null or decision not in ('approve','reject') then
    raise exception using errcode = 'PT400', message = 'decision debe ser approve o reject';
  end if;
  if r.estado not in ('requiere_revision','rechazada') or expected_version is distinct from r.report_version then
    raise exception using errcode = 'PT409', message = 'El informe ha cambiado o ya está revisado; recarga antes de aprobar';
  end if;
  if decision = 'approve' then
    if r.red_flags_present and length(trim(coalesce(note,''))) < 12 then
      raise exception using errcode = 'PT400', message = 'Las alertas requieren una justificación clínica de al menos 12 caracteres';
    end if;
    if jsonb_typeof(r.report_snapshot->'exercises') is distinct from 'array' then
      raise exception using errcode = 'PT409', message = 'Falta el contenido del plan que debe revisarse';
    end if;
    exercise_count := jsonb_array_length(r.report_snapshot->'exercises');
    select count(distinct e->>'exercise_id') into valid_count
    from jsonb_array_elements(r.report_snapshot->'exercises') e
    join public.crm_recomendacion_items i on i.recomendacion_id = r.id and i.ejercicio_id::text = e->>'exercise_id';
    if exercise_count = 0 or exercise_count > 12 or valid_count <> exercise_count then
      raise exception using errcode = 'PT409', message = 'El plan debe contener ejercicios válidos sin duplicados';
    end if;
  end if;
  update public.crm_recomendaciones set
    estado = case when decision = 'approve' then 'aprobada' else 'rechazada' end,
    reviewed_by_profile_id = reviewer, reviewed_at = clock_timestamp(),
    approval_note = nullif(trim(coalesce(note,'')),''), updated_at = clock_timestamp()
  where id = r.id returning jsonb_build_object('id', id, 'estado', estado, 'report_version', report_version,
    'reviewed_by_profile_id', reviewed_by_profile_id, 'reviewed_at', reviewed_at, 'approval_note', approval_note) into result;
  insert into public.crm_audit_log (entity_type, entity_id, action, actor_type, actor_id, before_state, after_state, metadata)
  values ('recommendation', r.id, case when decision = 'approve' then 'approve_recommendation' else 'reject_recommendation' end,
    reviewer_role, reviewer, jsonb_build_object('estado', r.estado, 'report_version', r.report_version),
    result || jsonb_build_object('report_snapshot', r.report_snapshot, 'paciente_id', r.paciente_id),
    jsonb_build_object('decision', decision, 'note', note));
  return result;
end $$;
revoke all on function private.review_exercise_recommendation(uuid,text,text,integer) from public, anon, service_role;
grant execute on function private.review_exercise_recommendation(uuid,text,text,integer) to authenticated;

-- Invoker wrapper exposes only the checked operation, not a privileged public function.
create function public.review_exercise_recommendation(target_id uuid, decision text, note text, expected_version integer)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.review_exercise_recommendation(target_id, decision, note, expected_version)
$$;
revoke all on function public.review_exercise_recommendation(uuid,text,text,integer) from public, anon, service_role;
grant execute on function public.review_exercise_recommendation(uuid,text,text,integer) to authenticated;
commit;
