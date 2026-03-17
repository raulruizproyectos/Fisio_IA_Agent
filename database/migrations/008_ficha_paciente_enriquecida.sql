-- 008: Ficha de paciente enriquecida + notas clínicas
-- Ejecutar en Supabase SQL Editor

-- 1. Añadir campos extra a crm_pacientes
ALTER TABLE public.crm_pacientes
  ADD COLUMN IF NOT EXISTS dni TEXT,
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS profesion TEXT,
  ADD COLUMN IF NOT EXISTS medico_derivador TEXT,
  ADD COLUMN IF NOT EXISTS aseguradora TEXT,
  ADD COLUMN IF NOT EXISTS alergias TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes TEXT;

-- 2. Tabla de notas clínicas (una por sesión)
CREATE TABLE IF NOT EXISTS public.crm_notas_clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.crm_pacientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  zona_corporal TEXT,
  dolor_eva SMALLINT CHECK (dolor_eva >= 0 AND dolor_eva <= 10),
  nota TEXT NOT NULL,
  pruebas_realizadas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notas_clinicas_paciente ON public.crm_notas_clinicas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_notas_clinicas_fecha ON public.crm_notas_clinicas(fecha);
