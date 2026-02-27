-- Migracion: renombrar tablas/columnas a espanol y limpiar tablas no usadas
-- Fecha: 2026-02-27

BEGIN;

-- Tablas principales
ALTER TABLE IF EXISTS professionals RENAME TO profesionales;
ALTER TABLE IF EXISTS patients RENAME TO pacientes;
ALTER TABLE IF EXISTS conditions RENAME TO dolencias;
ALTER TABLE IF EXISTS exercises RENAME TO ejercicios;
ALTER TABLE IF EXISTS plans RENAME TO planes;
ALTER TABLE IF EXISTS plan_items RENAME TO items_plan;
ALTER TABLE IF EXISTS workouts RENAME TO sesiones;
ALTER TABLE IF EXISTS telegram_patient_links RENAME TO vinculos_telegram_pacientes;
ALTER TABLE IF EXISTS patient_intake_messages RENAME TO mensajes_ingesta_paciente;
ALTER TABLE IF EXISTS patient_followup_notes RENAME TO notas_seguimiento_paciente;
ALTER TABLE IF EXISTS exercise_video_jobs RENAME TO trabajos_video_ejercicio;
ALTER TABLE IF EXISTS video_view_events RENAME TO eventos_visualizacion_video;

-- profesionales
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profesionales' AND column_name='auth_user_id') THEN
    ALTER TABLE profesionales RENAME COLUMN auth_user_id TO id_usuario_auth;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profesionales' AND column_name='full_name') THEN
    ALTER TABLE profesionales RENAME COLUMN full_name TO nombre_completo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profesionales' AND column_name='license_number') THEN
    ALTER TABLE profesionales RENAME COLUMN license_number TO numero_colegiado;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profesionales' AND column_name='specialty') THEN
    ALTER TABLE profesionales RENAME COLUMN specialty TO especialidad;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profesionales' AND column_name='created_at') THEN
    ALTER TABLE profesionales RENAME COLUMN created_at TO creado_en;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profesionales' AND column_name='updated_at') THEN
    ALTER TABLE profesionales RENAME COLUMN updated_at TO actualizado_en;
  END IF;
END $$;

-- pacientes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pacientes' AND column_name='professional_id') THEN
    ALTER TABLE pacientes RENAME COLUMN professional_id TO profesional_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pacientes' AND column_name='full_name') THEN
    ALTER TABLE pacientes RENAME COLUMN full_name TO nombre_completo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pacientes' AND column_name='birth_date') THEN
    ALTER TABLE pacientes RENAME COLUMN birth_date TO fecha_nacimiento;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pacientes' AND column_name='medical_notes') THEN
    ALTER TABLE pacientes RENAME COLUMN medical_notes TO notas_medicas;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pacientes' AND column_name='created_at') THEN
    ALTER TABLE pacientes RENAME COLUMN created_at TO creado_en;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pacientes' AND column_name='updated_at') THEN
    ALTER TABLE pacientes RENAME COLUMN updated_at TO actualizado_en;
  END IF;
END $$;

-- dolencias
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dolencias' AND column_name='name') THEN
    ALTER TABLE dolencias RENAME COLUMN name TO nombre;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dolencias' AND column_name='body_area') THEN
    ALTER TABLE dolencias RENAME COLUMN body_area TO zona_corporal;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dolencias' AND column_name='description') THEN
    ALTER TABLE dolencias RENAME COLUMN description TO descripcion;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dolencias' AND column_name='severity_levels') THEN
    ALTER TABLE dolencias RENAME COLUMN severity_levels TO niveles_severidad;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dolencias' AND column_name='active') THEN
    ALTER TABLE dolencias RENAME COLUMN active TO activo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dolencias' AND column_name='created_at') THEN
    ALTER TABLE dolencias RENAME COLUMN created_at TO creado_en;
  END IF;
END $$;

-- ejercicios
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ejercicios' AND column_name='condition_id') THEN
    ALTER TABLE ejercicios RENAME COLUMN condition_id TO dolencia_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ejercicios' AND column_name='name') THEN
    ALTER TABLE ejercicios RENAME COLUMN name TO nombre;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ejercicios' AND column_name='description') THEN
    ALTER TABLE ejercicios RENAME COLUMN description TO descripcion;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ejercicios' AND column_name='phase') THEN
    ALTER TABLE ejercicios RENAME COLUMN phase TO fase;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ejercicios' AND column_name='difficulty') THEN
    ALTER TABLE ejercicios RENAME COLUMN difficulty TO dificultad;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ejercicios' AND column_name='default_sets') THEN
    ALTER TABLE ejercicios RENAME COLUMN default_sets TO series_defecto;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ejercicios' AND column_name='default_reps') THEN
    ALTER TABLE ejercicios RENAME COLUMN default_reps TO repeticiones_defecto;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ejercicios' AND column_name='default_duration_secs') THEN
    ALTER TABLE ejercicios RENAME COLUMN default_duration_secs TO duracion_segundos_defecto;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ejercicios' AND column_name='contraindications') THEN
    ALTER TABLE ejercicios RENAME COLUMN contraindications TO contraindicaciones;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ejercicios' AND column_name='active') THEN
    ALTER TABLE ejercicios RENAME COLUMN active TO activo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ejercicios' AND column_name='created_at') THEN
    ALTER TABLE ejercicios RENAME COLUMN created_at TO creado_en;
  END IF;
END $$;

-- planes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planes' AND column_name='professional_id') THEN
    ALTER TABLE planes RENAME COLUMN professional_id TO profesional_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planes' AND column_name='patient_id') THEN
    ALTER TABLE planes RENAME COLUMN patient_id TO paciente_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planes' AND column_name='title') THEN
    ALTER TABLE planes RENAME COLUMN title TO titulo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planes' AND column_name='status') THEN
    ALTER TABLE planes RENAME COLUMN status TO estado;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planes' AND column_name='start_date') THEN
    ALTER TABLE planes RENAME COLUMN start_date TO fecha_inicio;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planes' AND column_name='end_date') THEN
    ALTER TABLE planes RENAME COLUMN end_date TO fecha_fin;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planes' AND column_name='notes') THEN
    ALTER TABLE planes RENAME COLUMN notes TO notas;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planes' AND column_name='created_at') THEN
    ALTER TABLE planes RENAME COLUMN created_at TO creado_en;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planes' AND column_name='updated_at') THEN
    ALTER TABLE planes RENAME COLUMN updated_at TO actualizado_en;
  END IF;
END $$;

UPDATE planes
SET estado = CASE estado
  WHEN 'draft' THEN 'borrador'
  WHEN 'active' THEN 'activo'
  WHEN 'completed' THEN 'completado'
  WHEN 'archived' THEN 'archivado'
  ELSE estado END;

ALTER TABLE planes DROP CONSTRAINT IF EXISTS plans_status_check;
ALTER TABLE planes ADD CONSTRAINT planes_estado_check CHECK (estado IN ('borrador', 'activo', 'completado', 'archivado'));

-- items_plan
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items_plan' AND column_name='exercise_id') THEN
    ALTER TABLE items_plan RENAME COLUMN exercise_id TO ejercicio_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items_plan' AND column_name='order_index') THEN
    ALTER TABLE items_plan RENAME COLUMN order_index TO indice_orden;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items_plan' AND column_name='sets') THEN
    ALTER TABLE items_plan RENAME COLUMN sets TO series;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items_plan' AND column_name='reps') THEN
    ALTER TABLE items_plan RENAME COLUMN reps TO repeticiones;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items_plan' AND column_name='duration_secs') THEN
    ALTER TABLE items_plan RENAME COLUMN duration_secs TO duracion_segundos;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items_plan' AND column_name='custom_instructions') THEN
    ALTER TABLE items_plan RENAME COLUMN custom_instructions TO instrucciones_personalizadas;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items_plan' AND column_name='video_url') THEN
    ALTER TABLE items_plan RENAME COLUMN video_url TO url_video;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items_plan' AND column_name='created_at') THEN
    ALTER TABLE items_plan RENAME COLUMN created_at TO creado_en;
  END IF;
END $$;

-- sesiones
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sesiones' AND column_name='patient_id') THEN
    ALTER TABLE sesiones RENAME COLUMN patient_id TO paciente_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sesiones' AND column_name='session_date') THEN
    ALTER TABLE sesiones RENAME COLUMN session_date TO fecha_sesion;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sesiones' AND column_name='pain_level') THEN
    ALTER TABLE sesiones RENAME COLUMN pain_level TO nivel_dolor;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sesiones' AND column_name='notes') THEN
    ALTER TABLE sesiones RENAME COLUMN notes TO notas;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sesiones' AND column_name='completion_status') THEN
    ALTER TABLE sesiones RENAME COLUMN completion_status TO estado_completado;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sesiones' AND column_name='created_at') THEN
    ALTER TABLE sesiones RENAME COLUMN created_at TO creado_en;
  END IF;
END $$;

UPDATE sesiones
SET estado_completado = CASE estado_completado
  WHEN 'completed' THEN 'completado'
  WHEN 'partial' THEN 'parcial'
  WHEN 'skipped' THEN 'omitido'
  ELSE estado_completado END;

ALTER TABLE sesiones DROP CONSTRAINT IF EXISTS workouts_completion_status_check;
ALTER TABLE sesiones ADD CONSTRAINT sesiones_estado_completado_check CHECK (estado_completado IN ('completado', 'parcial', 'omitido'));

-- vinculos telegram
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vinculos_telegram_pacientes' AND column_name='patient_id') THEN
    ALTER TABLE vinculos_telegram_pacientes RENAME COLUMN patient_id TO paciente_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vinculos_telegram_pacientes' AND column_name='professional_id') THEN
    ALTER TABLE vinculos_telegram_pacientes RENAME COLUMN professional_id TO profesional_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vinculos_telegram_pacientes' AND column_name='link_code') THEN
    ALTER TABLE vinculos_telegram_pacientes RENAME COLUMN link_code TO codigo_vinculacion;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vinculos_telegram_pacientes' AND column_name='linked_at') THEN
    ALTER TABLE vinculos_telegram_pacientes RENAME COLUMN linked_at TO vinculado_en;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vinculos_telegram_pacientes' AND column_name='created_at') THEN
    ALTER TABLE vinculos_telegram_pacientes RENAME COLUMN created_at TO creado_en;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vinculos_telegram_pacientes' AND column_name='updated_at') THEN
    ALTER TABLE vinculos_telegram_pacientes RENAME COLUMN updated_at TO actualizado_en;
  END IF;
END $$;

-- mensajes ingesta
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mensajes_ingesta_paciente' AND column_name='patient_id') THEN
    ALTER TABLE mensajes_ingesta_paciente RENAME COLUMN patient_id TO paciente_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mensajes_ingesta_paciente' AND column_name='professional_id') THEN
    ALTER TABLE mensajes_ingesta_paciente RENAME COLUMN professional_id TO profesional_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mensajes_ingesta_paciente' AND column_name='source') THEN
    ALTER TABLE mensajes_ingesta_paciente RENAME COLUMN source TO fuente;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mensajes_ingesta_paciente' AND column_name='message_text') THEN
    ALTER TABLE mensajes_ingesta_paciente RENAME COLUMN message_text TO texto_mensaje;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mensajes_ingesta_paciente' AND column_name='has_red_flags') THEN
    ALTER TABLE mensajes_ingesta_paciente RENAME COLUMN has_red_flags TO tiene_alertas_rojas;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mensajes_ingesta_paciente' AND column_name='red_flags') THEN
    ALTER TABLE mensajes_ingesta_paciente RENAME COLUMN red_flags TO alertas_rojas;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mensajes_ingesta_paciente' AND column_name='history_snapshot') THEN
    ALTER TABLE mensajes_ingesta_paciente RENAME COLUMN history_snapshot TO resumen_historial;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mensajes_ingesta_paciente' AND column_name='status') THEN
    ALTER TABLE mensajes_ingesta_paciente RENAME COLUMN status TO estado;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mensajes_ingesta_paciente' AND column_name='created_at') THEN
    ALTER TABLE mensajes_ingesta_paciente RENAME COLUMN created_at TO creado_en;
  END IF;
END $$;

UPDATE mensajes_ingesta_paciente
SET estado = CASE estado
  WHEN 'pending_review' THEN 'pendiente_revision'
  WHEN 'reviewed' THEN 'revisado'
  WHEN 'closed' THEN 'cerrado'
  ELSE estado END;

ALTER TABLE mensajes_ingesta_paciente DROP CONSTRAINT IF EXISTS patient_intake_messages_status_check;
ALTER TABLE mensajes_ingesta_paciente ADD CONSTRAINT mensajes_ingesta_paciente_estado_check CHECK (estado IN ('pendiente_revision', 'revisado', 'cerrado'));

-- notas seguimiento
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas_seguimiento_paciente' AND column_name='patient_id') THEN
    ALTER TABLE notas_seguimiento_paciente RENAME COLUMN patient_id TO paciente_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas_seguimiento_paciente' AND column_name='professional_id') THEN
    ALTER TABLE notas_seguimiento_paciente RENAME COLUMN professional_id TO profesional_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas_seguimiento_paciente' AND column_name='linked_intake_id') THEN
    ALTER TABLE notas_seguimiento_paciente RENAME COLUMN linked_intake_id TO ingesta_vinculada_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas_seguimiento_paciente' AND column_name='source') THEN
    ALTER TABLE notas_seguimiento_paciente RENAME COLUMN source TO fuente;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas_seguimiento_paciente' AND column_name='note_text') THEN
    ALTER TABLE notas_seguimiento_paciente RENAME COLUMN note_text TO texto_nota;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas_seguimiento_paciente' AND column_name='created_at') THEN
    ALTER TABLE notas_seguimiento_paciente RENAME COLUMN created_at TO creado_en;
  END IF;
END $$;

UPDATE notas_seguimiento_paciente
SET fuente = CASE fuente
  WHEN 'text' THEN 'texto'
  WHEN 'voice_transcript' THEN 'transcripcion_voz'
  ELSE fuente END;

ALTER TABLE notas_seguimiento_paciente DROP CONSTRAINT IF EXISTS patient_followup_notes_source_check;
ALTER TABLE notas_seguimiento_paciente ADD CONSTRAINT notas_seguimiento_paciente_fuente_check CHECK (fuente IN ('texto', 'transcripcion_voz'));

-- trabajos video
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trabajos_video_ejercicio' AND column_name='patient_id') THEN
    ALTER TABLE trabajos_video_ejercicio RENAME COLUMN patient_id TO paciente_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trabajos_video_ejercicio' AND column_name='professional_id') THEN
    ALTER TABLE trabajos_video_ejercicio RENAME COLUMN professional_id TO profesional_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trabajos_video_ejercicio' AND column_name='exercise_id') THEN
    ALTER TABLE trabajos_video_ejercicio RENAME COLUMN exercise_id TO ejercicio_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trabajos_video_ejercicio' AND column_name='parent_job_id') THEN
    ALTER TABLE trabajos_video_ejercicio RENAME COLUMN parent_job_id TO trabajo_padre_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trabajos_video_ejercicio' AND column_name='revision_number') THEN
    ALTER TABLE trabajos_video_ejercicio RENAME COLUMN revision_number TO numero_revision;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trabajos_video_ejercicio' AND column_name='status') THEN
    ALTER TABLE trabajos_video_ejercicio RENAME COLUMN status TO estado;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trabajos_video_ejercicio' AND column_name='prescription') THEN
    ALTER TABLE trabajos_video_ejercicio RENAME COLUMN prescription TO prescripcion;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trabajos_video_ejercicio' AND column_name='generation_prompt') THEN
    ALTER TABLE trabajos_video_ejercicio RENAME COLUMN generation_prompt TO prompt_generacion;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trabajos_video_ejercicio' AND column_name='review_notes') THEN
    ALTER TABLE trabajos_video_ejercicio RENAME COLUMN review_notes TO notas_revision;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trabajos_video_ejercicio' AND column_name='output_url') THEN
    ALTER TABLE trabajos_video_ejercicio RENAME COLUMN output_url TO url_salida;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trabajos_video_ejercicio' AND column_name='created_at') THEN
    ALTER TABLE trabajos_video_ejercicio RENAME COLUMN created_at TO creado_en;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trabajos_video_ejercicio' AND column_name='updated_at') THEN
    ALTER TABLE trabajos_video_ejercicio RENAME COLUMN updated_at TO actualizado_en;
  END IF;
END $$;

UPDATE trabajos_video_ejercicio
SET estado = CASE estado
  WHEN 'review_pending' THEN 'pendiente_revision'
  WHEN 'rendering' THEN 'renderizando'
  WHEN 'approved' THEN 'aprobado'
  WHEN 'rejected' THEN 'rechazado'
  WHEN 'sent' THEN 'enviado'
  WHEN 'failed' THEN 'fallido'
  ELSE estado END;

ALTER TABLE trabajos_video_ejercicio DROP CONSTRAINT IF EXISTS exercise_video_jobs_status_check;
ALTER TABLE trabajos_video_ejercicio ADD CONSTRAINT trabajos_video_ejercicio_estado_check CHECK (estado IN ('pendiente_revision', 'renderizando', 'aprobado', 'rechazado', 'enviado', 'fallido'));

-- eventos de visualizacion
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eventos_visualizacion_video' AND column_name='patient_id') THEN
    ALTER TABLE eventos_visualizacion_video RENAME COLUMN patient_id TO paciente_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eventos_visualizacion_video' AND column_name='professional_id') THEN
    ALTER TABLE eventos_visualizacion_video RENAME COLUMN professional_id TO profesional_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eventos_visualizacion_video' AND column_name='video_job_id') THEN
    ALTER TABLE eventos_visualizacion_video RENAME COLUMN video_job_id TO trabajo_video_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eventos_visualizacion_video' AND column_name='exercise_id') THEN
    ALTER TABLE eventos_visualizacion_video RENAME COLUMN exercise_id TO ejercicio_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eventos_visualizacion_video' AND column_name='event_type') THEN
    ALTER TABLE eventos_visualizacion_video RENAME COLUMN event_type TO tipo_evento;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eventos_visualizacion_video' AND column_name='watched_seconds') THEN
    ALTER TABLE eventos_visualizacion_video RENAME COLUMN watched_seconds TO segundos_vistos;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eventos_visualizacion_video' AND column_name='sequence') THEN
    ALTER TABLE eventos_visualizacion_video RENAME COLUMN sequence TO secuencia;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eventos_visualizacion_video' AND column_name='event_at') THEN
    ALTER TABLE eventos_visualizacion_video RENAME COLUMN event_at TO evento_en;
  END IF;
END $$;

UPDATE eventos_visualizacion_video
SET tipo_evento = CASE tipo_evento
  WHEN 'opened' THEN 'abierto'
  WHEN 'play' THEN 'reproduccion'
  WHEN 'pause' THEN 'pausa'
  WHEN 'completed' THEN 'completado'
  ELSE tipo_evento END;

ALTER TABLE eventos_visualizacion_video DROP CONSTRAINT IF EXISTS video_view_events_event_type_check;
ALTER TABLE eventos_visualizacion_video ADD CONSTRAINT eventos_visualizacion_video_tipo_evento_check CHECK (tipo_evento IN ('abierto', 'reproduccion', 'pausa', 'completado'));

-- Eliminar tablas no usadas en el flujo actual
DROP TABLE IF EXISTS exercise_templates CASCADE;
DROP TABLE IF EXISTS workout_items CASCADE;
DROP TABLE IF EXISTS render_jobs CASCADE;
DROP TABLE IF EXISTS plantillas_ejercicio CASCADE;
DROP TABLE IF EXISTS items_sesion CASCADE;
DROP TABLE IF EXISTS trabajos_render CASCADE;

COMMIT;
