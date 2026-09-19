# Changelog

Registro consolidado de checkpoints técnicos y funcionales del proyecto Fisio IA Agent.

## [checkpoint-2026-09-19] — Reconstrucción Visual & Quality Gate (v4.0)

### Added
- Sistema de tokens y primitivas editoriales clínicas (*Turn.io style*): `frontend/src/styles/design-tokens.css`, `editorial-primitives.css`, `editorial-shell.css` y `editorial-views.css`.
- Tipografía unificada `@fontsource-variable/dm-sans` con `font-feature-settings: "ss03" 1`.
- Habitaciones clínicas cromáticas: Lavender Mist (Inicio), Mint Wash (Pacientes), Cream (Agenda), Peach Wash (Finanzas), Sky Wash (Mensajes), Sand Canvas (Ajustes) y Canopy Green (Copiloto IA y Sidebar).
- Estado de carga clínico (*light clinical shimmer*) y estados empty con bordes punteados suaves.

### Changed
- Abandonado por completo el esquema de dark dashboard genérico (`#0d1522`) en favor de lienzos claros y tarjetas blancas puras sin sombras pesadas.
- Reconstruido el Topbar como barra de comandos editorial con buscador `⌘K`, contexto temporal y acceso rápido a Agenda y Copiloto.
- Reorganizada la sección Ajustes (`ConfigView`) en 6 bloques estructurados temáticos con diagnóstico técnico colapsable en `<details>`.
- Reorganizado el Copiloto IA (`AssistantRail`) a una altura de `calc(100dvh - 64px)` con compositor sticky y margen seguro inferior.

### Fixed
- Finanzas: Eliminado el renderizado doble de cobros en escritorio ocultando `#pagosMobileList` en `>= 768px`.
- Mensajes: Corregido el error crítico de texto blanco sobre fondo claro mediante tokens semánticos de contraste alto (`--color-charcoal`, `--color-ink-black`).
- Agenda: Sustituidos los gradientes oscuros en estados de carga por shimmer claro.

### Security & Quality
- Batería de 18/18 tests unitarios e integrados pasando en backend (`npm test`).
- Verificación estática limpia de Astro (`npx astro check`: 0 errores, 0 warnings).

---

## [checkpoint-2026-09-15] — Auditoría Técnica, Seguridad y Gating Clínico

### Added
- Módulo de auditoría y trazabilidad médica `backend/src/lib/audit.js` registrando en `crm_audit_log` (R-2).
- Procedimiento de supresión y anonimización de pacientes conforme a RGPD (R-3) en `backend/src/routes/patients.js`.
- Batería de pruebas para gating clínico en `backend/test/clinical_gating.test.js` (R-5).
- Rate limit de generación de ejercicios IA (60 req/h) en `backend/src/index.js` (R-6).
- Scripts SQL de verificación previa no destructiva en `database/preflight/`.

### Fixed
- Seguridad clínica en prescripción (R-4): los ejercicios de apoyo visual adoptan sus propias precauciones y dosificación sin heredar contraindicaciones ajenas.
- Compatibilidad de entorno en Windows (R-11): migración a compilador WASM en Astro 5 para prevenir bloqueos de binarios nativos.

---

## [checkpoint-2026-09-01] — Hardening de Producción

### Added
- Supabase Auth obligatorio con validación de JWT y extracción de perfil en `/api/me`.
- Row Level Security (RLS) habilitado en tablas `crm_*` con cliente Supabase por petición.
- Aprobación humana obligatoria antes de generar PDF o remitir recomendaciones IA.
- Control de solapamiento de citas en PostgreSQL.
- CI en GitHub Actions con validación de backend, frontend y workflows n8n.

---

## [checkpoint-2026-05-27] — Estabilización Inicial de Plataforma

### Added
- Despliegue en EasyPanel mediante Deploy Key SSH.
- Soporte de healthchecks en `/`, `/health` y `/api/health`.
- Workflows iniciales W0 a W6 de n8n.
