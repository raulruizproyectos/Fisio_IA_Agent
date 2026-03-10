-- Migracion: crear tabla crm_async_jobs para polling persistente de W2
-- Fecha: 2026-03-09

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.crm_async_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL CHECK (job_type IN ('exercise_recommendation')),
  tracking_request_id uuid NOT NULL DEFAULT gen_random_uuid(),
  final_request_id uuid,
  paciente_id uuid REFERENCES public.crm_pacientes(id),
  fisioterapeuta_id uuid REFERENCES public.crm_perfiles(id),
  channel text NOT NULL DEFAULT 'crm_web' CHECK (channel IN ('telegram', 'crm_web', 'backend', 'n8n', 'google_calendar')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'error')),
  progress_message text,
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_payload jsonb,
  error_message text,
  error_code text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_async_jobs_status ON public.crm_async_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_async_jobs_patient ON public.crm_async_jobs(paciente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_async_jobs_tracking ON public.crm_async_jobs(tracking_request_id);
CREATE INDEX IF NOT EXISTS idx_crm_async_jobs_final_request ON public.crm_async_jobs(final_request_id);

DROP TRIGGER IF EXISTS trg_crm_async_jobs_updated_at ON public.crm_async_jobs;
CREATE TRIGGER trg_crm_async_jobs_updated_at
BEFORE UPDATE ON public.crm_async_jobs
FOR EACH ROW
EXECUTE FUNCTION public.crm_set_updated_at();

COMMIT;
