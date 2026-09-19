# Project Status

Updated: 2026-09-19

## Stable
- **Backend Quality & Security**:
  - Supabase Auth obligatorio con validación de JWT y extracción de perfil en `/api/me`.
  - Row Level Security (RLS) activo en PostgreSQL con cliente por petición de usuario.
  - Trazabilidad y auditoría clínica (R-2) implementada en `backend/src/lib/audit.js` (`crm_audit_log`).
  - Procedimiento de supresión y anonimización RGPD (R-3) en `backend/src/routes/patients.js`.
  - Seguridad clínica en prescripción de ejercicios (R-4): los ejercicios de apoyo visual adoptan sus propias precauciones y dosificación sin heredar contraindicaciones ajenas.
  - Gating clínico (R-5): bloqueo estricto de generación de PDF o remisión si el informe no está aprobado; validación obligatoria de justificación ante *red flags*.
  - Rate limiting (R-6) en generación de ejercicios IA (60 req/h por IP).
  - Batería de 18/18 tests unitarios e integrados pasando (`npm test` en backend).
- **Frontend & Visual System**:
  - Reconstrucción visual v4.0 completada bajo el estándar de diseño editorial clínico *Turn.io* (Refero).
  - Tipografía DM Sans unificada con `font-feature-settings: "ss03" 1`.
  - Design Tokens centralizados en `frontend/src/styles/design-tokens.css`: Canopy Green (`#0a3922`), Coral Pulse (`#ff643b`) reservado a acciones primarias, paleta de lienzos pastel por contexto.
  - Vistas adaptadas y verificadas visualmente: Inicio, Agenda, Pacientes, Ficha Paciente, Finanzas (eliminado duplicado en desktop), Mensajes (resuelto contraste blanco/blanco), Ajustes (estructurado en 6 bloques temáticos) y Copiloto IA (panel de 400px con compositor sticky y aire inferior).
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
