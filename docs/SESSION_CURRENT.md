# Sesion actual - 2026-05-06

## Estado
- Rama: `main`.
- HEAD funcional: `f627a31`.
- GitHub: sincronizado.
- Pendiente manual: redeploy de `fisio-frontend` en EasyPanel.

## Que se cerro
- Navegacion de sidebar endurecida.
- `Finanzas` abre `pagos` y mantiene sidebar activo en `Finanzas`.
- `Documentos` abre su vista global.
- Agenda no debe quedar visible cuando no esta activa.
- Router temprano de emergencia antes del script principal.
- Limpieza de estilos muertos de agenda.
- Documentacion compactada para evitar duplicados largos.

## Validacion local
- `npm.cmd run check`: OK.
- `npm.cmd run build`: OK.

## Proximo arranque
1. Raul redeploya `fisio-frontend`.
2. Verificar asset nuevo en produccion.
3. Smoke test: `Finanzas`, `Documentos`, `Agenda`, tabs financieras.
4. Si esta OK, continuar Fase 1 premium o modularizar shell/router.

## Nota
Si produccion sigue mostrando Agenda al pulsar Finanzas/Documentos, primero confirmar que EasyPanel sirve el HTML con `__fisioShellNavigate`. Si no aparece, es deploy/cache, no codigo local.
