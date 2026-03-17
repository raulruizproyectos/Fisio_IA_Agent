-- 011: Bonos / paquetes de sesiones
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.crm_bonos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.crm_pacientes(id) ON DELETE RESTRICT,
  nombre TEXT NOT NULL DEFAULT 'Bono de sesiones',
  sesiones_total SMALLINT NOT NULL CHECK (sesiones_total > 0),
  sesiones_usadas SMALLINT NOT NULL DEFAULT 0,
  precio NUMERIC(8,2) NOT NULL CHECK (precio >= 0),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'agotado', 'caducado', 'anulado')),
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_caducidad DATE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sesiones_usadas_check CHECK (sesiones_usadas <= sesiones_total)
);

CREATE INDEX IF NOT EXISTS idx_crm_bonos_paciente ON public.crm_bonos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_crm_bonos_estado ON public.crm_bonos(estado);
