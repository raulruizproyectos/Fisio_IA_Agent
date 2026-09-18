-- Preflight R-1 · Paso 1/3: tablas y columnas que exige la migracion de seguridad.
-- Solo lectura. Uso:
--   cd <copia con .env.local>
--   node scripts/supabase-sql.mjs --file=<ruta absoluta de este fichero> --readOnly=true

-- 1) Tablas esperadas que NO existen (deberia devolver 0 filas).
select 'FALTA_TABLA_' || name as hallazgo
from unnest(string_to_array(
  'crm_perfiles,crm_pacientes,crm_asignaciones_fisio_paciente,crm_sesiones,crm_notas_seguimiento,'
  || 'crm_citas,crm_ejercicios_catalogo,crm_ejercicio_media,crm_recomendaciones,crm_recomendacion_items,'
  || 'crm_async_jobs,crm_comunicaciones,crm_pagos,crm_notas_clinicas,crm_facturas,crm_documentos,crm_bonos,'
  || 'crm_recordatorio_envios,crm_audit_log,telegram_onboarding_pending,telegram_chat_sessions,'
  || 'vinculos_telegram_pacientes,mensajes_ingesta_paciente,notas_seguimiento_paciente,'
  || 'trabajos_video_ejercicio,eventos_visualizacion_video,profesionales,pacientes,planes,items_plan,sesiones'
  , ',')) as name
where to_regclass('public.' || name) is null
order by 1;

-- 2) Columnas que la migracion altera o indexa y que NO existen (deberia devolver 0 filas).
select 'FALTA_COLUMNA_' || pair as hallazgo
from unnest(string_to_array(
  'crm_citas.request_id,crm_citas.fin_en,crm_citas.inicio_en,crm_citas.estado,crm_citas.fisioterapeuta_id,'
  || 'crm_recomendaciones.estado,crm_recomendaciones.paciente_id,crm_recomendaciones.fisioterapeuta_id,'
  || 'crm_recomendacion_items.recomendacion_id,crm_pacientes.created_by_profile_id,crm_perfiles.auth_user_id,'
  || 'items_plan.ejercicio_id,items_plan.plan_id,planes.profesional_id,planes.id,sesiones.paciente_id,'
  || 'notas_seguimiento_paciente.ingesta_vinculada_id,notas_seguimiento_paciente.profesional_id,'
  || 'trabajos_video_ejercicio.ejercicio_id,trabajos_video_ejercicio.profesional_id,trabajos_video_ejercicio.trabajo_padre_id,'
  || 'eventos_visualizacion_video.profesional_id,eventos_visualizacion_video.trabajo_video_id,'
  || 'eventos_visualizacion_video.plan_id,eventos_visualizacion_video.ejercicio_id,'
  || 'vinculos_telegram_pacientes.profesional_id,mensajes_ingesta_paciente.profesional_id,'
  || 'pacientes.profesional_id,profesionales.id_usuario_auth'
  , ',')) as pair
where not exists (
  select 1 from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = split_part(pair, '.', 1)
    and c.column_name = split_part(pair, '.', 2)
)
order by 1;