# Checkpoint 2026-03-10 - orquestacion hibrida y panel de revision profesional

## Estado cerrado
- La arquitectura recomendada queda fijada como orquestacion hibrida: backend autoritativo + n8n orquestado.
- El backend queda consolidado como capa de robustez y entrega:
  - validacion,
  - persistencia,
  - polling async,
  - PDF profesional compartido,
  - entrega a CRM y Telegram.
- El rail del CRM ya funciona como espacio de revision profesional real:
  - el informe sale del flujo de chat largo,
  - se presenta en un panel fijo y scrollable,
  - se puede guardar revision interna sobre la recomendacion,
  - el panel refleja exportacion PDF y envio a Telegram profesional.

## Cambios implementados
- Frontend CRM:
  - `frontend/src/pages/index.astro` introduce un panel fijo de revision dentro del rail,
  - el resumen clinico, la decision terapeutica, los ejercicios y el mensaje al paciente quedan separados con mejor jerarquia,
  - el rail gana ancho util en desktop y mejor comportamiento visual,
  - se anade guardado rapido de revision reutilizando `POST /api/exercises/recommendations/:recommendationId/follow-up`,
  - PDF y Telegram actualizan el estado visible del informe en el propio rail.
- Backend:
  - se mantiene el reparto recomendado: n8n genera razonamiento clinico y backend entrega/persiste/PDF,
  - no se mueve la generacion del PDF a n8n para evitar duplicar logica y degradar robustez.
- Documentacion:
  - `README.md` se actualiza con el checkpoint real y el flujo de revision profesional,
  - este checkpoint sustituye wording obsoleto que aun mencionaba `n8n-first` en visible.

## Validacion realizada
- `powershell -ExecutionPolicy Bypass -File scripts/frontend-local-build.ps1` -> OK.
- El build valida el nuevo rail, el panel de revision, el formulario de seguimiento y el layout ajustado.

## Hallazgo operativo importante
- `scripts/doctor-windows-workspace.ps1` ya detecta correctamente cuando el workspace local sigue compartiendo `.git` con Google Drive.
- Conclusión:
  - el modo `worktree` sigue siendo valido para avanzar,
  - el aislamiento maximo para futuras sesiones sigue siendo `bootstrap-local-workspace.ps1 -Mode standalone -ForceRefresh`.

## Siguiente paso recomendado
1. Redeploy de frontend para publicar el nuevo panel de revision profesional.
2. Prueba real en produccion:
   - generar plan desde CRM,
   - revisar el informe en el rail,
   - guardar revision,
   - descargar PDF,
   - enviar a Telegram profesional.
3. Si el flujo queda estable en produccion, continuar con el siguiente bloque funcional del CRM.