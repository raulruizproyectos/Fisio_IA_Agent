# Project Status

Updated: 2026-09-19 (P0 Product Recovery & Release Baseline — Supersedes `0188ec4` and `1b570b0`)

> **AVISO DE RECUPERACIÓN Y HARDENING COMPLETO**: El checkpoint `0188ec4` contenía bloqueos en llamadas locales por autenticación 401 (`dev-token` no reconocido al estar `NODE_ENV` indefinido), desconexión del `patient_id` en el Copiloto Clínico, desalineación del `DEFAULT_PROFESSIONAL_ID` en `.env.local`, y choques de diseño visual en la Ficha del Paciente. El presente checkpoint SUPERSEDE formalmente a los anteriores tras una resolución de causas raíz, verificación visual con capturas y ejecución E2E real en navegador.

## Functional Recovery & Core Domains (Verified E2E)
- **P0 Autenticación & Runtime Real**:
  - `backend/src/middleware/security.js`: Condición de `dev-token` ampliada para entornos de desarrollo donde `NODE_ENV` no esté explícitamente definido (`!process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'`).
  - `.env.local`: Alineado `DEFAULT_PROFESSIONAL_ID` al perfil real de `crm_perfiles` (`6dae4ef6-b6b3-4cb0-91d9-0320d10db255`).
  - Eliminados los estados de carga infinita ("Cargando agenda...", "Leyendo próxima sesión...", "Cargando citas...", "Leyendo mensajes...").
- **P0 Dashboard & KPIs Clínicos**:
  - Pacientes activos cargan cifra real (9 pacientes) desde Supabase.
  - Sesiones hoy reflejan valor real (0 citas para la jornada de hoy sábado).
  - Informes/planes clínicos generados cargan cifra real (1 plan) mediante consulta a `/api/profesional/program-library`.
  - Ingresos del mes cargan valor real verificado (50 EUR).
  - Tarjeta de foco muestra el estado real del día ("Libre", "Sin próxima sesión cargada", botón "Abrir agenda").
- **P0 Copiloto Clínico**:
  - Conectado el contexto del paciente: `handleAssistantChat` en `index.astro` envía ahora `patient_id` y `profesional_id` a `/api/agent/message`.
  - Backend extrae historial clínico longitudinal (Capa 2) y notas recientes (Capa 1).
  - Proveedor OpenAI (`gpt-4o-mini`) verificado en ejecución real (confianza 0.95, ruta `clinical_assistant`).
- **P1 Notas de Sesión por Voz & Síntesis Clínica**:
  - Corregido fallo de tipo `s.tratamientos?.join` en `backend/src/lib/clinical-voice.js`.
  - Verificado endpoint de síntesis clínica estructurada (`/api/notas-clinicas/voice/synthesize`).
- **P1 Accesibilidad (WCAG AA & Astro Audit)**:
  - Resueltos findings de labels sin control asociado en `FichaPacienteView.astro`, `PatientsView.astro` y `PagosView.astro`.
  - `npx astro check` pasa con 0 errores y 0 warnings.
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
