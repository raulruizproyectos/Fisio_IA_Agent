# Skill: supabase-storage

Objetivo: estandarizar uso de Supabase Storage para imagenes de movimientos/ejercicios.

## Reglas fijas

1. Bucket de trabajo: `ejercicios` (imagenes de movimientos).
2. Bucket debe ser **private**.
3. En DB se guarda `object_key`, no signed URL.
4. Signed URLs se generan JIT en n8n con service role key.
5. No exponer service role key en frontend.

## Convencion recomendada de object_key

`ejercicios/{exercise_id}/{filename}`

## TTL recomendado

- Default: 20 minutos (1200 segundos).
- Ajustar por canal solo si hay justificacion operativa.

## Checklist operativo

- [ ] Bucket existe y es privado.
- [ ] Tabla media guarda object_key.
- [ ] Workflow n8n firma URL al momento de envio.
- [ ] Logs guardan request_id, patient_id y estado de envio.
