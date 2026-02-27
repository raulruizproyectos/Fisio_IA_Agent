-- ============================================================
-- Fisio IA Agent - Esquema en espanol (Supabase / PostgreSQL)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) PROFESIONALES
CREATE TABLE IF NOT EXISTS profesionales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_usuario_auth UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nombre_completo TEXT NOT NULL,
  numero_colegiado TEXT,
  especialidad TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) PACIENTES
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  fecha_nacimiento DATE,
  email TEXT,
  phone TEXT,
  notas_medicas JSONB DEFAULT '{}',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pacientes_profesional ON pacientes(profesional_id);

-- 3) DOLENCIAS
CREATE TABLE IF NOT EXISTS dolencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  zona_corporal TEXT NOT NULL,
  descripcion TEXT,
  niveles_severidad TEXT[] DEFAULT ARRAY['leve', 'moderada', 'severa'],
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) EJERCICIOS
CREATE TABLE IF NOT EXISTS ejercicios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dolencia_id UUID REFERENCES dolencias(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fase TEXT NOT NULL CHECK (fase IN ('aguda', 'subaguda', 'cronica', 'mantenimiento')),
  dificultad TEXT NOT NULL CHECK (dificultad IN ('basico', 'intermedio', 'avanzado')),
  series_defecto INTEGER DEFAULT 3,
  repeticiones_defecto INTEGER DEFAULT 10,
  duracion_segundos_defecto INTEGER,
  contraindicaciones TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ejercicios_dolencia ON ejercicios(dolencia_id);
CREATE INDEX IF NOT EXISTS idx_ejercicios_fase ON ejercicios(fase);

-- 5) PLANES
CREATE TABLE IF NOT EXISTS planes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'activo', 'completado', 'archivado')),
  fecha_inicio DATE,
  fecha_fin DATE,
  notas TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planes_paciente ON planes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_planes_profesional ON planes(profesional_id);
CREATE INDEX IF NOT EXISTS idx_planes_estado ON planes(estado);

-- 6) ITEMS DE PLAN
CREATE TABLE IF NOT EXISTS items_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES planes(id) ON DELETE CASCADE,
  ejercicio_id UUID NOT NULL REFERENCES ejercicios(id) ON DELETE RESTRICT,
  indice_orden INTEGER NOT NULL DEFAULT 0,
  series INTEGER NOT NULL DEFAULT 3,
  repeticiones INTEGER NOT NULL DEFAULT 10,
  duracion_segundos INTEGER,
  instrucciones_personalizadas TEXT,
  url_video TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_plan_plan ON items_plan(plan_id);

-- 7) SESIONES
CREATE TABLE IF NOT EXISTS sesiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES planes(id) ON DELETE CASCADE,
  fecha_sesion DATE NOT NULL DEFAULT CURRENT_DATE,
  nivel_dolor INTEGER CHECK (nivel_dolor >= 0 AND nivel_dolor <= 10),
  notas TEXT,
  estado_completado TEXT NOT NULL DEFAULT 'completado' CHECK (estado_completado IN ('completado', 'parcial', 'omitido')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sesiones_paciente ON sesiones(paciente_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_plan ON sesiones(plan_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha ON sesiones(fecha_sesion);

-- 8) VINCULOS TELEGRAM
CREATE TABLE IF NOT EXISTS vinculos_telegram_pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL UNIQUE REFERENCES pacientes(id) ON DELETE CASCADE,
  profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  telegram_chat_id TEXT UNIQUE,
  telegram_username TEXT,
  codigo_vinculacion TEXT NOT NULL UNIQUE,
  vinculado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vinculos_telegram_profesional ON vinculos_telegram_pacientes(profesional_id);

-- 9) MENSAJES DE INGESTA
CREATE TABLE IF NOT EXISTS mensajes_ingesta_paciente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  fuente TEXT NOT NULL DEFAULT 'telegram' CHECK (fuente IN ('telegram', 'web', 'manual')),
  texto_mensaje TEXT NOT NULL,
  tiene_alertas_rojas BOOLEAN NOT NULL DEFAULT false,
  alertas_rojas JSONB NOT NULL DEFAULT '[]',
  resumen_historial JSONB NOT NULL DEFAULT '{}',
  estado TEXT NOT NULL DEFAULT 'pendiente_revision' CHECK (estado IN ('pendiente_revision', 'revisado', 'cerrado')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingesta_profesional_estado ON mensajes_ingesta_paciente(profesional_id, estado, creado_en);
CREATE INDEX IF NOT EXISTS idx_ingesta_paciente_fecha ON mensajes_ingesta_paciente(paciente_id, creado_en);

-- 10) NOTAS DE SEGUIMIENTO
CREATE TABLE IF NOT EXISTS notas_seguimiento_paciente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  ingesta_vinculada_id UUID REFERENCES mensajes_ingesta_paciente(id) ON DELETE SET NULL,
  fuente TEXT NOT NULL DEFAULT 'texto' CHECK (fuente IN ('texto', 'transcripcion_voz')),
  texto_nota TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notas_seguimiento_paciente_fecha ON notas_seguimiento_paciente(paciente_id, creado_en);

-- 11) TRABAJOS DE VIDEO
CREATE TABLE IF NOT EXISTS trabajos_video_ejercicio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  ejercicio_id UUID REFERENCES ejercicios(id) ON DELETE SET NULL,
  trabajo_padre_id UUID REFERENCES trabajos_video_ejercicio(id) ON DELETE SET NULL,
  numero_revision INTEGER NOT NULL DEFAULT 1,
  estado TEXT NOT NULL DEFAULT 'pendiente_revision' CHECK (estado IN ('pendiente_revision', 'renderizando', 'aprobado', 'rechazado', 'enviado', 'fallido')),
  prescripcion JSONB NOT NULL DEFAULT '{}',
  prompt_generacion TEXT,
  notas_revision TEXT,
  url_salida TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trabajos_video_paciente_fecha ON trabajos_video_ejercicio(paciente_id, creado_en);
CREATE INDEX IF NOT EXISTS idx_trabajos_video_estado ON trabajos_video_ejercicio(estado);

-- 12) EVENTOS DE VISUALIZACION
CREATE TABLE IF NOT EXISTS eventos_visualizacion_video (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profesional_id UUID REFERENCES profesionales(id) ON DELETE SET NULL,
  trabajo_video_id UUID REFERENCES trabajos_video_ejercicio(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES planes(id) ON DELETE SET NULL,
  ejercicio_id UUID REFERENCES ejercicios(id) ON DELETE SET NULL,
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('abierto', 'reproduccion', 'pausa', 'completado')),
  segundos_vistos INTEGER,
  secuencia BIGINT GENERATED ALWAYS AS IDENTITY,
  evento_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_video_paciente_fecha ON eventos_visualizacion_video(paciente_id, evento_en, secuencia);

-- Trigger reutilizable para actualizado_en
CREATE OR REPLACE FUNCTION actualizar_columna_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profesionales_actualizado_en ON profesionales;
CREATE TRIGGER trg_profesionales_actualizado_en
  BEFORE UPDATE ON profesionales
  FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizado_en();

DROP TRIGGER IF EXISTS trg_pacientes_actualizado_en ON pacientes;
CREATE TRIGGER trg_pacientes_actualizado_en
  BEFORE UPDATE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizado_en();

DROP TRIGGER IF EXISTS trg_planes_actualizado_en ON planes;
CREATE TRIGGER trg_planes_actualizado_en
  BEFORE UPDATE ON planes
  FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizado_en();

DROP TRIGGER IF EXISTS trg_vinculos_telegram_actualizado_en ON vinculos_telegram_pacientes;
CREATE TRIGGER trg_vinculos_telegram_actualizado_en
  BEFORE UPDATE ON vinculos_telegram_pacientes
  FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizado_en();

DROP TRIGGER IF EXISTS trg_trabajos_video_actualizado_en ON trabajos_video_ejercicio;
CREATE TRIGGER trg_trabajos_video_actualizado_en
  BEFORE UPDATE ON trabajos_video_ejercicio
  FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizado_en();

-- RLS
ALTER TABLE profesionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dolencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE vinculos_telegram_pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_ingesta_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_seguimiento_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajos_video_ejercicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_visualizacion_video ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profesional puede ver su perfil"
  ON profesionales FOR SELECT
  USING (id_usuario_auth = auth.uid());

CREATE POLICY "Profesional puede actualizar su perfil"
  ON profesionales FOR UPDATE
  USING (id_usuario_auth = auth.uid());

CREATE POLICY "Profesional gestiona sus pacientes"
  ON pacientes FOR ALL
  USING (profesional_id IN (
    SELECT id FROM profesionales WHERE id_usuario_auth = auth.uid()
  ))
  WITH CHECK (profesional_id IN (
    SELECT id FROM profesionales WHERE id_usuario_auth = auth.uid()
  ));

CREATE POLICY "Lectura publica de dolencias"
  ON dolencias FOR SELECT
  USING (true);

CREATE POLICY "Lectura publica de ejercicios"
  ON ejercicios FOR SELECT
  USING (true);

CREATE POLICY "Profesional gestiona sus planes"
  ON planes FOR ALL
  USING (profesional_id IN (
    SELECT id FROM profesionales WHERE id_usuario_auth = auth.uid()
  ))
  WITH CHECK (profesional_id IN (
    SELECT id FROM profesionales WHERE id_usuario_auth = auth.uid()
  ));

CREATE POLICY "Acceso items_plan via plan"
  ON items_plan FOR ALL
  USING (plan_id IN (
    SELECT id FROM planes WHERE profesional_id IN (
      SELECT id FROM profesionales WHERE id_usuario_auth = auth.uid()
    )
  ));

CREATE POLICY "Acceso sesiones via paciente"
  ON sesiones FOR ALL
  USING (
    paciente_id IN (
      SELECT id FROM pacientes WHERE profesional_id IN (
        SELECT id FROM profesionales WHERE id_usuario_auth = auth.uid()
      )
    )
  );

CREATE POLICY "Profesional gestiona vinculos telegram"
  ON vinculos_telegram_pacientes FOR ALL
  USING (profesional_id IN (
    SELECT id FROM profesionales WHERE id_usuario_auth = auth.uid()
  ))
  WITH CHECK (profesional_id IN (
    SELECT id FROM profesionales WHERE id_usuario_auth = auth.uid()
  ));
