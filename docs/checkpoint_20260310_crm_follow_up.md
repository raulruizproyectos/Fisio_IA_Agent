# Checkpoint 2026-03-10 - Seguimiento CRM de recomendaciones

## Estado confirmado
- Worktree local operativo: `C:\Temp\Fisio_IA_Agent_workspace`.
- Rama de trabajo actual: `codex/session-71-local-runtime`.
- `C:\Temp` se usa solo para desarrollo y validacion; el runtime sigue previsto en VPS/EasyPanel/Hostinger/n8n/Supabase.
- El backend ya disponia de la ruta de follow-up y el CRM web ahora la expone de forma visible.

## Cambios cerrados en esta sesion
- Frontend:
  - nuevo bloque `Seguimiento de recomendaciones` en el historial del paciente,
  - formulario para enviar `recommendation_id`, `adherence_status`, `pain_scale`, `recommendation_state` y `note_text`,
  - vista de seguimientos enriquecida con adherencia, dolor y estado actual,
  - eliminada la duplicidad rota del bloque `Informes y recomendaciones`.
- Base de datos y solidez:
  - `database/schema_vnext.sql` alinea `public.crm_set_updated_at()` con la migracion y fija `search_path = public`.
- Operativa local:
  - la validacion sigue ejecutandose fuera de Google Drive, sin convertir el PC en runtime del sistema.

## Validacion realizada
- `powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1` -> OK.
- Build Astro/Vite completada en `C:\Temp\Fisio_IA_Agent_frontend_local`.
- El cambio queda validado tecnicamente sobre copia limpia local, no sobre la carpeta sincronizada de `G:\Mi unidad\...`.

## Riesgo conocido que sigue abierto
- En esta sesion no se ha hecho redeploy remoto, asi que la funcionalidad aun no esta publicada en el CRM del VPS.
- Falta la prueba manual end-to-end contra el frontend ya desplegado para confirmar que la UX y la trazabilidad clinica quedan correctas en entorno real.

## Siguiente paso exacto recomendado
1. Redeploy del frontend del CRM en VPS/EasyPanel/Hostinger.
2. Abrir un paciente de prueba y registrar:
   - una nota de seguimiento normal,
   - un seguimiento de recomendacion con adherencia, dolor y estado.
3. Recargar el historial y comprobar que ambos datos quedan visibles y coherentes.
4. Solo cuando eso este validado, pasar a la siguiente funcionalidad cerrada.