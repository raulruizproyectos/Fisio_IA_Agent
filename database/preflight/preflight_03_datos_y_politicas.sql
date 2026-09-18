-- Preflight R-1 · Paso 3/3: datos que pueden bloquear indices unicos/constraints,
-- perfiles de acceso y politicas que la migracion NO toca. Solo lectura.

select item, valor from (
  select 1 as ord, 'crm_recomendaciones_total' as item, (select count(*)::text from public.crm_recomendaciones) as valor
  union all select 2, 'crm_recomendaciones_estado_generada', (select count(*)::text from public.crm_recomendaciones where estado = 'generada')
  union all select 3, 'crm_citas_total', (select count(*)::text from public.crm_citas)
  union all select 4, 'crm_citas_request_id_duplicados', (select count(*)::text from (select request_id from public.crm_citas where request_id is not null group by 1 having count(*) > 1) d)
  union all select 5, 'crm_citas_solapadas_activas', (select count(*)::text
      from public.crm_citas a
      join public.crm_citas b
        on a.id < b.id
       and a.fisioterapeuta_id = b.fisioterapeuta_id
       and a.estado in ('pendiente', 'confirmada', 'reprogramada')
       and b.estado in ('pendiente', 'confirmada', 'reprogramada')
       and tstzrange(a.inicio_en, a.fin_en, '[)') && tstzrange(b.inicio_en, b.fin_en, '[)'))
  union all select 6, 'crm_citas_fin_menor_igual_inicio', (select count(*)::text from public.crm_citas where fin_en <= inicio_en)
  union all select 7, 'crm_perfiles_total', (select count(*)::text from public.crm_perfiles)
  union all select 8, 'crm_perfiles_activos', (select count(*)::text from public.crm_perfiles where activo)
  union all select 9, 'crm_perfiles_activos_con_auth_user_valido', (select count(*)::text from public.crm_perfiles p join auth.users u on u.id = p.auth_user_id where p.activo)
  union all select 10, 'auth_usuarios_total', (select count(*)::text from auth.users)
  union all select 11, 'crm_pacientes_total', (select count(*)::text from public.crm_pacientes)
  union all select 12, 'crm_pacientes_sin_creador', (select count(*)::text from public.crm_pacientes where created_by_profile_id is null)
  union all select 13, 'crm_asignaciones_fisio_paciente_total', (select count(*)::text from public.crm_asignaciones_fisio_paciente)
  union all select 14, 'schema_extensions_existe', (select (count(*) > 0)::text from information_schema.schemata where schema_name = 'extensions')
) s
order by ord;

-- Politicas que quedan FUERA del alcance de la migracion (no se eliminan ni se sustituyen).
select tablename, roles, cmd, count(*) as politicas
from pg_policies
where schemaname = 'public'
  and tablename not in (
    'crm_perfiles','crm_pacientes','crm_asignaciones_fisio_paciente','crm_sesiones','crm_notas_seguimiento',
    'crm_citas','crm_ejercicios_catalogo','crm_ejercicio_media','crm_recomendaciones','crm_recomendacion_items',
    'crm_async_jobs','crm_comunicaciones','crm_pagos','crm_notas_clinicas','crm_facturas','crm_documentos',
    'crm_bonos','crm_recordatorio_envios','crm_audit_log','telegram_onboarding_pending','telegram_chat_sessions',
    'vinculos_telegram_pacientes','mensajes_ingesta_paciente','notas_seguimiento_paciente',
    'trabajos_video_ejercicio','eventos_visualizacion_video','profesionales','pacientes','planes','items_plan','sesiones'
  )
group by 1, 2, 3
order by 1;