-- 010: Documentos firmados digitalmente (consentimientos, LOPD, etc.)
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.crm_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.crm_pacientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('consentimiento_informado', 'lopd', 'revocacion', 'otro')),
  titulo TEXT NOT NULL,
  contenido TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'firmado', 'anulado')),
  firma_base64 TEXT,
  fecha_firma TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_documentos_paciente ON public.crm_documentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_crm_documentos_tipo ON public.crm_documentos(tipo);
