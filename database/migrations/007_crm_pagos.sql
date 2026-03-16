-- Migration 007: Tabla crm_pagos para gestion de cobros de sesiones
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.crm_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.crm_pacientes(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  importe NUMERIC(8,2) NOT NULL CHECK (importe > 0),
  metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta')),
  concepto TEXT NOT NULL DEFAULT 'Sesion de fisioterapia',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_pagos_paciente ON public.crm_pagos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_crm_pagos_fecha ON public.crm_pagos(fecha);
CREATE INDEX IF NOT EXISTS idx_crm_pagos_metodo ON public.crm_pagos(metodo_pago);
