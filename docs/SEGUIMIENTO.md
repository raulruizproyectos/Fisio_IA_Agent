# Documento de Seguimiento y Operación — Fisio Clinical

## Seguimiento vigente — 16-oct, 18:18 — traspaso reactivado

Raúl solicita nueva segunda opinión de Calcode/Claude Code después de las correcciones de esta sesión y los primeros fallos comunicados en su prueba real. Queda sustituida la cancelación anterior. Primero: actualizar contexto, recomendar modelos/razonamiento y estrategia de agentes eficiente en tokens y esperar confirmación. Después: revisión local independiente con hallazgos nuevos diferenciados de los conocidos. Estado canónico: [PUNTO_SITUACION_2026-10-16.md](PUNTO_SITUACION_2026-10-16.md); [prompt](PROMPT_AUDITORIA_CLOUDCODE.txt).

Frontend ea7f998 y backend 3d4cce7 desplegados, CI de producto verde. Calendar healthy/W5 con intervalo correcto leídos a las 18:18. Se publica solo seguimiento con autorización de actualizar GitHub, preservando .claude/ y privados fuera de Git. No repetir diseño, auditorías ya cerradas, migraciones o deploy por leer historia; no activar booking. Los bloques siguientes mantienen las evidencias anteriores con su fecha y no amplían permisos.

> Publicación autorizada el 16-oct: Raúl autoriza expresamente el commit de esta tanda y, por separado, su push a main en raulruizproyectos/Fisio_IA_Agent. La entrega que contiene esta entrada reúne las correcciones y la evidencia; comprobar el CI de su HEAD en GitHub. No autoriza despliegues ni activar el bot. Las referencias a «local/sin publicar» describen el cierre previo a esta autorización.

## Seguimiento vigente — 16-oct-2026

Terminada la pasada local propia de código, funcionalidad y diseño, con correcciones y verificación en [AUDITORIA_FINAL_2026-10-16.md](AUDITORIA_FINAL_2026-10-16.md). El traspaso a Claude está cancelado. Se conserva el contexto funcional del agente y los recursos aportados.

La tanda sigue sin publicar/desplegar; base main 1b2a954. Próximo paso: autorizaciones específicas, CI y actualización de backend/frontend para prueba con datos ficticios. El bot de citas sigue pausado por los riesgos identificados, no está validado por esta revisión. Entradas siguientes: historia.

## Seguimiento histórico — 2026-10-13

Repositorio: `C:\Visual Code\FISIO_IA_AGENT\Fisio_IA_Agent`, GitHub `raulruizproyectos/Fisio_IA_Agent`, rama `main` publicada en `ee3449c`. Frontend desplegado `c062967`, backend `ee3449c`; CI de ambos completo verde. Readiness 13/13, seis integraciones configuradas/cero ausentes; Supabase sano, una clínica y 35 tablas públicas con RLS. Doce workflows activos/coincidentes, Calendar healthy tras reiniciar y recordatorios horarios activos para vinculados. No requiere otro despliegue manual.

Backend lint/108 pruebas, frontend check 40 archivos sin diagnósticos/build cuatro páginas; SQL/handlers con fixtures y Chromium 375/768/1280 pasan. La alerta automática real del 13 surgió por notificar rechazos 4xx como críticos; corregido y desplegado. No se acredita IA con gasto, entrega clínica real ni primer tick de entrega de recordatorios. [Detalle actual](design-exploration/reviews/2026-10-13/production.md).

Próximo trabajo solicitado: segunda auditoría independiente, centrada en eficiencia/funcionalidad/UX/diseño/arquitectura/seguridad y agentes IA/n8n/reserva, y completar localmente el agente de citas Telegram. Nuevos/existentes con contacto verificado, reservas/consulta/cambios/cancelaciones/recordatorios; cambios/cancelaciones con al menos 24 horas y después derivación a clínica, WhatsApp futuro. [Requisitos](PILOTO_MENSAJERIA.md), [prompt completo para CloudCode](DESIGN_RESOURCES.md) y [contrato conversacional](PROMPT_AGENTE_CITAS.txt); la primera prueba manual sigue sin resultados. Documentos de este traspaso actualizados en local, no publicados por esta petición. Las siguientes secciones conservan el checkpoint histórico de septiembre; sus estados, IDs de ensayo, recuentos y guías no son órdenes ni evidencias actuales. Secretos únicamente en `.env.local` raíz, nunca en el antiguo `backend/.env` citado en la historia.

## Historia — recuperación funcional de septiembre

**Fecha:** 2026-09-19  
**Estado:** Recuperación Funcional P0 Completada y Verificada  
**Checkpoint Vigente:** `dc6b7fc` (*supersedes `a96c502`*)  
**Ramas Sincronizadas:** `mejoras/auditoria-20260915` / `main`  
**Repositorio Remoto:** `https://github.com/raulruizproyectos/Fisio_IA_Agent.git`  

---

## 1. Resumen Ejecutivo de la Recuperación Funcional

Tras detectar que el commit `a96c502` fue publicado con fallos de persistencia real en PostgreSQL y dependiente de fallbacks silenciosos a datos demo en frontend, se ejecutó un protocolo de **P0 Functional Recovery**:

1. **Cero Suposiciones:** Toda validación se realizó contra la base de datos real en Supabase Cloud y endpoints vivos de la API.
2. **Sanitización de Fallbacks:** Se eliminó la inyección automática de datos demo en `localhost` (`index.astro`), garantizando que la aplicación trabaje exclusivamente con datos reales y reporte fallos de conexión o estados vacíos legítimos.
3. **Restauración de Esquema y Conectividad:**
   - Restaurada `SUPABASE_ANON_KEY` en `backend/.env`, resolviendo el readiness check (`missing_core: 0`).
   - Creadas tablas `crm_asignaciones_fisio_paciente`, `crm_audit_log` y `crm_recordatorio_envios` en Supabase.
   - Añadidas columnas de auditoría/idempotencia a `crm_recomendaciones` (`idempotency_key`, `reviewed_by_profile_id`, `reviewed_at`, `approval_note`, `prompt_version`, `model_name`).
   - Alineado `DEFAULT_PROFESSIONAL_ID` al perfil real de `crm_perfiles` (`6dae4ef6-b6b3-4cb0-91d9-0320d10db255`).
   - Corregidas consultas de backend: `/ficha` (`inicio_en, fin_en` en vez de `fecha_hora`) y `/program-library` (eliminado `nombre_completo` inexistente de `crm_pacientes`).
4. **Verificación E2E en Navegador:** Automatización completa con Playwright en `http://localhost:4321` sin `?demo=true`, comprobando visualmente y en red la carga de Pacientes, Agenda, Ficha clínica, Prescripción Clínica y Cobros.

---

## 2. Matriz de Estado Funcional por Dominio

| Dominio | Estado | Evidencia Concreta |
| :--- | :--- | :--- |
| **Infraestructura** | **VERIFIED** | Backend (3001) y Frontend (4321) activos; `/api/health` OK; `/api/health/readiness` con `missing_core: 0`. |
| **Pacientes (P0)** | **VERIFIED** | Alta y recuperación de `QA Test Patient` (`c8d8afb5-04e3-42ed-bb33-bf926cd42ed5`) en `crm_pacientes`; Ficha clínica renderiza datos reales. |
| **Agenda (P1)** | **VERIFIED** | Cita creada en `crm_citas` (`795a75f4-3b1a-4247-8341-1d36f07b5379`); sincronizada y renderizada en la vista de calendario. |
| **Planes Terapéuticos (P1)** | **VERIFIED** | Generación de recomendación con motor clínico directo y persistencia real en `crm_recomendaciones` (`78612ae5-0645-4771-a295-39b561135eef`); visible en biblioteca. |
| **Copiloto Clínico (P1)** | **VERIFIED** | `/api/agente/message` responde consultas clínicas con contexto del paciente. |
| **Finanzas (P2)** | **VERIFIED** | Cobro de 50.00 EUR registrado en `crm_pagos` (`f5148f18-0a99-4526-acb0-5582c50c82cb`), reflejado en resumen mensual y ficha. |
| **Documentos (P2)** | **VERIFIED** | Creación en `crm_documentos` (`fb741faf-649b-4a34-b0e0-2b79c5aa4d31`), firma digital en base64 y generación de PDF con `pdfkit` (3,706 bytes). |
| **Mensajes (P2)** | **VERIFIED** | Integración con tabla `crm_comunicaciones` operativa y consultable en historial. |
| **Historial (P3)** | **VERIFIED** | `/api/profesional/patients/:id/history` recupera notas y eventos clínicos asociados al paciente. |
| **Ajustes (P3)** | **VERIFIED** | Configuración de clínica y reserva online recuperada y expuesta en `/public-booking/config`. |
| **Reserva Online** | **VERIFIED** | Cálculo de slots disponibles (8 slots) y reserva pública completada con auto-vinculación de paciente (`c952f5a0-d802-4f87-adb7-2df1b55881bc`). |

---

## 3. Puertas de Ingeniería (Engineering Gates)

- **Backend Tests:** 18/18 pruebas pasando (`node --test`).
- **Frontend Typecheck:** 0 errores, 0 advertencias (`npx astro check`).
- **Frontend Build:** Compilación estática limpia de 4 rutas (`npm run build`).

---

## 4. Guía de Despliegue en EasyPanel

EasyPanel gestiona la aplicación como dos servicios independientes dentro del mismo proyecto:

### Servicio 1: Backend (`fisio-backend`)
- **Tipo de Build:** Nixpacks (Node.js 20) o Dockerfile
- **Build Path:** `backend` (sin barra al inicio)
- **Comando de inicio:** `node src/index.js`
- **Puerto expuesto:** `3001`
- **Healthcheck Path:** `/api/health` o `/health`
- **Variables de Entorno requeridas en EasyPanel:**
  ```env
  PORT=3001
  NODE_ENV=production
  SUPABASE_URL=https://<tu-proyecto>.supabase.co
  SUPABASE_ANON_KEY=<anon-key>
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
  FRONTEND_URL=https://<dominio-frontend>
  INTERNAL_API_KEY=<secreto-min-32-chars>
  TELEGRAM_BOT_TOKEN=<opcional-telegram-token>
  TELEGRAM_WEBHOOK_SECRET=<opcional-webhook-secret>
  N8N_BASE_URL=<opcional-n8n-url>
  N8N_API_KEY=<opcional-n8n-key>
  N8N_WEBHOOK_SECRET=<opcional-n8n-secret>
  OPENAI_API_KEY=<tu-openai-key>
  GOOGLE_CALENDAR_CLIENT_EMAIL=<service-account-email>
  GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
  GOOGLE_CALENDAR_ID=<calendar-id>
  DEFAULT_PROFESSIONAL_ID=6dae4ef6-b6b3-4cb0-91d9-0320d10db255
  ```

### Servicio 2: Frontend (`fisio-frontend`)
- **Tipo de Build:** Dockerfile
- **Build Path:** `frontend` (sin barra al inicio)
- **Puerto expuesto:** `80`
- **Healthcheck Path:** `/health`
- **Variables de Entorno requeridas en EasyPanel:**
  ```env
  PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
  PUBLIC_SUPABASE_ANON_KEY=<anon-key>
  PUBLIC_BACKEND_URL=https://<dominio-backend>
  ```
  *(Nota: `runtime-config.template.js` inyecta automáticamente estas variables en `/runtime-config.js` al iniciar el contenedor Nginx).*

---

## 5. Procedimiento de Verificación Post-Despliegue

Una vez completado el despliegue en EasyPanel:

1. **Probe de Salud Backend:**
   ```bash
   curl -I https://<dominio-backend>/api/health
   # Respuesta esperada: HTTP 200 OK, {"status":"ok"}
   ```
2. **Probe de Readiness Backend:**
   ```bash
   curl -H "x-internal-api-key: <INTERNAL_API_KEY>" https://<dominio-backend>/api/health/readiness
   # Respuesta esperada: HTTP 200 OK con missing_core: 0
   ```
3. **Probe de Frontend:**
   - Abrir `https://<dominio-frontend>/health` -> Debe responder `ok`.
   - Abrir `https://<dominio-frontend>/login` -> Verificar carga visual limpia de la pantalla de acceso.
   - Iniciar sesión con un usuario profesional registrado en Supabase Auth.
   - Navegar a **Pacientes**, **Agenda**, **Ficha** y **Finanzas** comprobando que no hay alertas de consola ni bloqueos de red.

---

## 6. Política Permanente de Release

A partir de este checkpoint, queda terminantemente prohibido publicar código sin validación funcional completa previa:

```
CÓDIGO
  ↓
EJECUCIÓN REAL (Local/Staging)
  ↓
PRUEBAS FUNCIONALES EN BD
  ↓
VERIFICACIÓN DE PERSISTENCIA
  ↓
PRUEBAS E2E (Browser / API)
  ↓
REGRESIÓN DE DOMINIOS
  ↓
GATES (Lint / Typecheck / Tests / Build)
  ↓
DOCUMENTACIÓN ACTUALIZADA
  ↓
REVISIÓN DE DIFF Y SECRETOS
  ↓
CHECKPOINT GIT & PUSH
  ↓
DEPLOYMENT EASYPANEL
  ↓
VERIFICACIÓN POST-DEPLOYMENT
```
