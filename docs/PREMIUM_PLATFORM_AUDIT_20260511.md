# Premium Platform Audit

## Estado
La direccion visual actual es SaaS clinico premium: blanco, slate, teal/verde clinico, densidad calmada y responsive real.

## Decisiones
- Reducir cajas anidadas y contenedores decorativos.
- Mantener `Manrope` como voz tipografica.
- Evitar nuevos parches visuales fuera de `premium-clinic-ui.css`, salvo Copiloto en `assistant-rail.css`.
- Preservar IDs/data hooks de vistas.

## Hecho
- Sidebar/topbar/dashboard/pacientes pulidos.
- Mensajes responsive sin cortes.
- Agenda semanal visual con Google Calendar.
- Copiloto IA responsive.

## Pendiente
- Smoke visual post-deploy.
- Reducir deuda CSS `!important`.
- Extraer controladores de `index.astro`.
