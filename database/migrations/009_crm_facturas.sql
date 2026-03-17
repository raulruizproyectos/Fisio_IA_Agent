-- 009: Tabla de facturas
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.crm_facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  paciente_id UUID NOT NULL REFERENCES public.crm_pacientes(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  lineas JSONB NOT NULL DEFAULT '[]',
  importe_bruto NUMERIC(10,2) NOT NULL DEFAULT 0,
  iva_pct NUMERIC(5,2) NOT NULL DEFAULT 21,
  importe_iva NUMERIC(10,2) NOT NULL DEFAULT 0,
  importe_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida', 'pagada', 'anulada')),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_facturas_paciente ON public.crm_facturas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_crm_facturas_fecha ON public.crm_facturas(fecha);
CREATE INDEX IF NOT EXISTS idx_crm_facturas_numero ON public.crm_facturas(numero);
