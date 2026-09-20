# Project Status

Updated: 2026-09-20 (Definitive Product Recovery, Stitch Redesign & Hardening — Baseline `64934d7`)

> **ESTADO DE VERIFICACIÓN EMPÍRICA (CERO FALSOS POSITIVOS)**: Este checkpoint (`64934d7`) SUPERSEDE formalmente a `b8f7980`, `23aeb40`, `c59556a` y anteriores. Se eliminó la falsa confianza y se verificó empíricamente con navegador real Playwright, backend real Node.js, PostgreSQL/Supabase real y OpenAI `gpt-4o-mini`.

## Functional Recovery & Core Domains (Empirically Verified)
- **Seguridad & Autenticación Failsafe**:
  - `backend/src/middleware/security.js`: `dev-token` estrictamente restringido a `process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'`. En producción o con `NODE_ENV` ausente, falla de forma cerrada (401).
  - `frontend/src/lib/auth.ts`: Diagnóstico explícito en consola cuando `PUBLIC_BACKEND_URL` falta en entornos de producción, eliminando fallbacks silenciosos no documentados.
- **Dependencias Deterministas (Causa Raíz Resuelta)**:
  - `frontend/package-lock.json`: Resuelta discrepancia de `@emnapi/wasi-threads@1.2.3`.
  - `frontend/Dockerfile` y `.github/workflows/ci.yml`: Eliminado el bypass `|| npm install`. Ambas pipelines ejecutan ahora exclusivamente `npm ci` determinista.
- **Rediseño Visual Google Stitch & Fin del Tema Oscuro Legacy**:
  - Eliminadas las hojas de estilo obsidian legacy (`premium-clinic-ui.css` y `production-ui.css`) que forzaban fondos negros `#0b131c` / `#111a26`.
  - Adoptado el sistema canónico de diseño en `DESIGN.md` (Stitch Project `15793182036642898909`): Canopy Green (`#0A3922`), Kinetic Coral (`#FF643B`), Lienzo Cálido (`#F7F5F1`), Mint (`#D2F2E3`), Cream (`#FAF7E8`), DM Sans.
  - Agenda: Rediseñada completamente a planificador clínico sobre lienzo cálido con tarjetas blancas y etiquetas claras (eliminada la cuadrícula negra tipo hoja de cálculo).
  - Copiloto IA: Reflow contextual de espacio de trabajo (~58% consulta / ~42% copiloto), eliminando el cajón oscuro desarticulado.
- **Memoria Clínica Longitudinal & Síntesis de Voz**:
  - `backend/src/routes/clinical-notes.js`: `updatePatientLongitudinalSummary` utiliza `serviceSupabase` para persistir la Capa 2 en segundo plano de forma fiable sin perder el contexto de base de datos.
  - `backend/src/lib/clinical-voice.js`: Resolución segura de dolor EVA y zona corporal desde columnas de la tabla y `structured_data`.
  - Verificada síntesis clínica estructurada (`/api/notas-clinicas/voice/synthesize`) y lectura longitudinal en Ficha de Paciente.
- **Copiloto Clínico Grounded**:
  - Contexto clínico real del paciente (resumen Capa 2 + notas recientes Capa 1) inyectado en `/api/agent/message`.
  - OpenAI `gpt-4o-mini` responde con precisión clínica basada exclusivamente en el historial registrado (0 alucinaciones). Human-in-the-loop: botón `Revisar y aprobar`.
- **Dashboard & KPIs Clínicos**:
  - Carga cifras reales desde PostgreSQL: 9 pacientes activos, sesiones hoy, planes clínicos generados, ingresos mensuales.
  - Tarjeta de foco "Ahora" en estado Libre/Próxima sesión con acción directa.
- **Directorio de Pacientes**:
  - Alta de paciente QA verificada con persistencia real en `crm_pacientes` y filtrado instantáneo en búsqueda.
- **P1 Accesibilidad (WCAG AA & Astro Audit)**:
  - Resueltos findings de labels sin control asociado en `FichaPacienteView.astro`, `PatientsView.astro` y `PagosView.astro`.
  - `npx astro check` pasa con 0 errores y 0 warnings.
  - Backend `npm test`: 21/21 tests pasando (100% verde).
- **P2 Coherencia Visual & Reducción de Brillo**:
  - Reconstruida `FichaPacienteView.astro` con superficies tonales clínicas cálidas (`#f8f7f4`, `#faf7e8`, `#ffffff` con sutil borde `rgba(0,0,0,0.06)`), eliminando el choque visual de fondo oscuro rígido (`#090e17`).
  - Verificación visual completada con capturas de pantalla de Dashboard, Copiloto, Directorio de Pacientes y Ficha Clínica.
- **P0 Pacientes**:
  - Alta, listado y consulta individual verificados con persistencia real en PostgreSQL (`crm_pacientes`).
  - `/ficha` corregido en `backend/src/routes/patients.js`: sustituida columna inexistente `fecha_hora` por `inicio_en, fin_en` con mapeo de compatibilidad.
- **P1 Agenda & Citas**:
  - Creación y listado de citas verificado contra `crm_citas`.
  - Reserva pública (`/api/profesional/public-booking/slots` y `/appointments`) verificada end-to-end con asignación automática de paciente.
- **P1 Planes Terapéuticos & Copiloto Clínico**:
  - Generación de recomendaciones con motor clínico directo y persistencia confirmada en `crm_recomendaciones` y `crm_recomendacion_items`.
  - `GET /api/profesional/program-library` corregido eliminando `nombre_completo` de `crm_pacientes`.
- **P2 Finanzas & Pagos**:
  - Registro de cobros verificado en `crm_pagos` (50.00 EUR), reflejado en `/pagos/resumen` y en la ficha del paciente.
- **P2 Documentos & Firma Digital**:
  - Creación de documento en `crm_documentos`, firma digital en base64 y generación de PDF con `pdfkit` verificado (3.7 KB).
- **Frontend Fallback Sanitization**:
  - Sanitizado `isDevMode` en `frontend/src/pages/index.astro` para requerir explícitamente `?demo=true` o `localStorage.getItem('fisio_dev_mode') === 'true'`. En modo estándar (`localhost`), la UI opera 100% contra backend y PostgreSQL real sin inyectar datos ficticios ni ocultar errores de red/API.
  - Verificado mediante automatización de navegador con Playwright en `http://localhost:4321` (App boot, Catálogo, Agenda, Ficha Paciente y Cobros validados sin errores).

## Stable
- **Backend Quality & Security**:
  - Supabase Auth obligatorio con validación de JWT y extracción de perfil en `/api/me`.
  - Row Level Security (RLS) activo en PostgreSQL con cliente por petición de usuario.
  - Trazabilidad y auditoría clínica (R-2) implementada en `backend/src/lib/audit.js` (`crm_audit_log`).
  - Procedimiento de supresión y anonimización RGPD (R-3) en `backend/src/routes/patients.js`.
  - Seguridad clínica en prescripción de ejercicios (R-4): los ejercicios de apoyo visual adoptan sus propias precauciones y dosificación sin heredar contraindicaciones ajenas.
  - Gating clínico (R-5): bloqueo estricto de generación de PDF o remisión si el informe no está aprobado; validación obligatoria de justificación ante *red flags*.
  - Rate limiting (R-6) en generación de ejercicios clínicos (60 req/h por IP).
  - Batería de 18/18 tests unitarios e integrados pasando (`npm test` en backend).
- **Frontend & Visual System**:
  - Reconstrucción visual v4.0 completada bajo el estándar de diseño editorial clínico *Turn.io* (Refero).
  - Tipografía DM Sans unificada con `font-feature-settings: "ss03" 1`.
  - Design Tokens centralizados en `frontend/src/styles/design-tokens.css`: Canopy Green (`#0a3922`), Coral Pulse (`#ff643b`) reservado a acciones primarias, paleta de lienzos pastel por contexto.
  - Vistas adaptadas y verificadas visualmente: Inicio, Agenda, Pacientes, Ficha Paciente, Finanzas (eliminado duplicado en desktop), Mensajes (resuelto contraste blanco/blanco), Ajustes (estructurado en 6 bloques temáticos) y Copiloto Clínico (panel de 400px con compositor sticky y aire inferior).
  - Verificación estática de Astro limpia (`npx astro check`: 0 errores, 0 warnings).

## Working / needs validation
- **Despliegue Productivo en Supabase Cloud**:
  - La migración `database/migrations/20260901_production_security_hardening.sql` y sus scripts de validación previa (`database/preflight/`) están listos pero pendientes de ejecución en el proyecto de producción de Supabase.
- **Despliegue de Aplicación**:
  - Configuración de EasyPanel / VPS para frontend y backend.
- **Workflows n8n**:
  - Workflows en `n8n/Fisio_IA_Agent` validados estructuralmente en CI; pendientes de activación gradual y comprobación de credenciales reales en producción.

## Known issues
- `frontend/src/pages/index.astro`: Monolito de orquestación de vistas e hidratación de eventos (~8k líneas). Funcional y estable, pero candidato a extracción gradual de controladores por dominio sin alterar IDs ni atributos `data-*`.
- `backend/src/routes/professional.js` y `telegram.js`: Rutas extensas pendientes de división en capas de servicio modulares.

## Next priorities
1. Ejecutar scripts de preflight y aplicar la migración SQL `20260901_production_security_hardening.sql` en Supabase Cloud.
2. Desplegar backend y frontend en la plataforma de hosting (EasyPanel / VPS).
3. Activar y verificar flujos de n8n vinculando las credenciales de producción.

## Do not break
- **Norma de Robustez**: Todo flujo crítico debe tener fallback funcional y registrar trazabilidad de errores (`request_id`). Ningún fallo externo debe romper el flujo principal.
- **Gating Clínico**: No permitir la descarga de PDFs ni el envío de recomendaciones si `estado != 'aprobada'`.
- **Disciplina de Color**: Coral Pulse (`#ff643b`) reservado estrictamente para la acción primaria contextual; nunca como adorno general.
- **Contratos de Frontend**: No modificar ni eliminar IDs ni atributos `data-*` en `frontend/src/pages/index.astro` ni en los componentes de vistas, ya que gobiernan la hidratación del CRM.
- **Secretos**: No versionar claves ni credenciales en el repositorio; la única fuente local autorizada es `.env.local`.

## Decisions
- **Abandono del Dark Dashboard**: Se sustituyó el tema oscuro genérico (`#0d1522`) por lienzos cálidos/pasteles (*Lavender Mist*, *Mint Wash*, *Peach Wash*, *Sky Wash*, *Sand Canvas*) con tarjetas blancas puras y *Canopy Green* como ancla de marca.
- **Tipografía DM Sans**: Uso exclusivo de DM Sans con variante estilística `ss03` y números tabulares para datos clínicos y financieros.
- **Multi-tenancy por RLS**: La seguridad y aislamiento entre profesionales recae en políticas de PostgreSQL mediante el JWT del usuario en Supabase Auth, evitando la dependencia de filtros manuales en backend.
