-- 20260919_voice_session_notes_evolution.sql
-- Ampliación de crm_notas_clinicas y crm_pacientes para soportar notas de sesión por voz,
-- extracción clínica estructurada, evolución temporal y memoria longitudinal.

ALTER TABLE public.crm_notas_clinicas
  ADD COLUMN IF NOT EXISTS cita_id UUID REFERENCES public.crm_citas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS profesional_id UUID REFERENCES public.crm_perfiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_datetime TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS structured_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS audio_processed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_notas_clinicas_paciente_datetime ON public.crm_notas_clinicas(paciente_id, session_datetime DESC);

ALTER TABLE public.crm_pacientes
  ADD COLUMN IF NOT EXISTS resumen_clinico_longitudinal TEXT,
  ADD COLUMN IF NOT EXISTS resumen_actualizado_en TIMESTAMPTZ;
