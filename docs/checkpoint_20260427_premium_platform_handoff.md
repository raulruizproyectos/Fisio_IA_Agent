# Checkpoint 2026-04-27 - Enfoque premium de plataforma

## Estado de cierre de esta continuidad

- Rama: `main`.
- Working tree al crear este checkpoint: con cambios locales pendientes de commit.
- Archivos tocados:
  - `frontend/src/pages/index.astro`
  - `docs/premium_platform_audit_20260427.md`
  - `docs/checkpoint_20260427_premium_platform_handoff.md`
  - `README.md`
  - `configuracion_pendiente.md`
- Servidor local levantado durante la sesion:
  - `http://127.0.0.1:4321`

## Cambios aplicados

### Ficha de paciente como centro del caso

- La navegacion cotidiana se reorienta para abrir la ficha del paciente como vista primaria.
- Ahora abren ficha:
  - busqueda superior,
  - proxima sesion desde Inicio,
  - boton `Abrir ficha` en pacientes,
  - acciones de ficha desde agenda,
  - acciones principales de intakes,
  - `Abrir ficha` desde Biblioteca.
- `Historial` no se elimina, pero deja de competir con la ficha.

### Historial reposicionado

- `Historial` pasa visualmente a `Seguimiento del caso`.
- Se describe como auditoria longitudinal para Telegram, planes domiciliarios y seguimiento.
- Se anaden acciones internas:
  - `Abrir ficha`,
  - `Documentos del caso`.
- Si no hay paciente seleccionado, el estado vacio indica que se seleccione desde Pacientes, Agenda o busqueda.
- El 2026-04-29 se corrige la experiencia vista en produccion:
  - no se muestran errores HTTP/JSON crudos,
  - las cargas parciales se explican como avisos humanos,
  - Telegram no bloquea el seguimiento si devuelve 404,
  - el formulario de nota clinica queda con layout estable.
- El 2026-04-29 se endurece backend:
  - `/api/pacientes/:id` resuelve CRM y legacy sin `.single()` estricto,
  - `/api/telegram/link-code/:patientId` reconoce pacientes CRM en lectura de estado.
- El 2026-04-29 se endurece tambien ficha:
  - `/api/pacientes/:id/ficha` usa CRM con fallback legacy,
  - los pacientes antiguos abren ficha minima en vez de devolver 404,
  - el aviso de ficha antigua queda como estado parcial, no como error tecnico.
- El 2026-04-29 se corrigen cortes visuales detectados en EasyPanel:
  - rail de ficha baja a bloque completo cuando no hay ancho suficiente,
  - `Seguimiento del caso` deja de mostrar textarea/botones con estilo nativo estrecho,
  - Telegram queda en tarjeta de accion clara.
- Tras nuevo feedback en produccion, se aplica un recorte mas practico:
  - la ficha elimina el rail lateral redundante,
  - `Seguimiento del caso` ya no renderiza planes completos ni formularios de follow-up,
  - los planes quedan como resumen con acceso a ficha y biblioteca.

### Documentos reposicionado

- La pagina global `Documentos y Consentimientos` queda definida como vista global de firmas y consentimientos.
- Para documentos de un paciente concreto, el camino recomendado es ficha de paciente -> pestana `Documentos`.

### Limpieza de avisos vivos

- `mobileDock` ahora se usa para marcar `data-active-section`.
- El total de pagos de ficha y previsualizacion de factura se muestra en UI, eliminando avisos antiguos.

### Feedback amable y practico

- Se implementa un sistema propio de toast en `frontend/src/pages/index.astro`.
- Se implementa un dialogo propio de confirmacion y entrada breve.
- Se sustituyen `alert()`, `confirm()` y `prompt()` nativos en flujos operativos por:
  - avisos de exito/error no intrusivos,
  - confirmaciones con contexto antes de borrar,
  - entrada guiada para firma por nombre cuando aplica.

### Finanzas como entrada unica

- El sidebar ya no apunta internamente a `pagos`, sino a `finanzas`.
- El router resuelve `finanzas` hacia la portada financiera actual (`pagos`) sin romper loaders existentes.
- Las pestanas `Pagos`, `Facturas`, `Bonos` y `Gestoria` se mantienen como navegacion interna de finanzas.
- El 2026-04-28 se anade un panel operativo en `Pagos/Finanzas`:
  - prioridad de caja,
  - accion primaria contextual,
  - accesos directos a registrar cobro, emitir factura, crear bono y abrir gestoria.
- El 2026-04-28 se integran visualmente las subpantallas:
  - `Facturas`, `Bonos` y `Gestoria` muestran encabezado comun de `Finanzas`,
  - cada subvista tiene banda de contexto practico,
  - todas tienen vuelta rapida al resumen financiero.
- El 2026-04-28 se limpia el bloque financiero:
  - botones destructivos con clase comun,
  - preview de factura con clase propia,
  - progreso de bonos con elemento `progress`.

## Validaciones realizadas

- `npm run check` en `frontend`: OK.
  - 0 errores.
  - 0 warnings.
  - 0 hints.
- `npm run build` en `frontend`: OK en cierre 2026-04-27, repetido OK tras el panel operativo 2026-04-28, repetido OK tras la integracion visual de subpantallas, repetido OK tras la limpieza interna de Finanzas, repetido OK tras el fix de Seguimiento 2026-04-29, repetido OK tras fallback de ficha legacy y repetido OK tras correccion visual EasyPanel.
- `npm run lint` en `backend`: OK tras endurecer pacientes/Telegram y ficha legacy; queda warning antiguo no bloqueante en `professional.js`.
- `git diff --check`: OK; solo aparece aviso normal de CRLF/LF en Windows para `frontend/src/pages/index.astro`.

## Auditoria premium creada

Documento nuevo:

- `docs/premium_platform_audit_20260427.md`

Contenido clave:

- diagnostico de producto y arquitectura,
- riesgos del monolito frontend,
- direccion visual premium-clinica,
- arquitectura objetivo modular,
- roadmap por fases,
- siguiente bloque recomendado.

## Decision de enfoque para continuar

No seguir acumulando parches visuales sobre el monolito salvo ajustes tacticos muy acotados.

El nuevo enfoque es:

1. consolidar flujos premium practicos sin romper contratos,
2. modularizar frontend,
3. endurecer backend/n8n con servicios y contratos mas claros,
4. rematar experiencia comercial/paciente.

## Siguiente bloque recomendado

Ejecutar Fase 1 del documento premium, empezando por:

1. Reducir duplicidad interna de tablas y resumenes en Finanzas.
2. Limpiar estilos inline visibles restantes en dashboard, agenda y documentos.
3. Reducir ruido visual y eliminar bloques que no ayuden a una accion diaria.
4. Validar con:
   - `npm run check`
   - `npm run build`
5. Smoke visual local:
   - desktop,
   - movil,
   - Inicio,
   - Pacientes,
   - Ficha,
   - Seguimiento,
   - Finanzas,
   - Documentos.

## Orden exacto al retomar si se corta la sesion

1. Leer este archivo.
2. Leer `docs/premium_platform_audit_20260427.md`.
3. Ejecutar:
   - `git status --short`
   - `npm run check` en `frontend`
   - `npm run build` en `frontend`
4. Si los cambios locales siguen sin commit:
   - revisar `frontend/src/pages/index.astro`,
   - confirmar que `Seguimiento del caso` y `Documentos del caso` se ven en UI,
   - hacer commit con mensaje sugerido: `refactor: clarify case-centered navigation`.
5. Continuar con el bloque:
   - finanzas unica real,
   - limpieza de estilos inline,
   - recorte de elementos poco practicos.

## Riesgos abiertos

- `frontend/src/pages/index.astro` sigue siendo demasiado grande: 22k+ lineas.
- Hay muchas capas de CSS historicas con `!important` e inline styles.
- Backend funciona, pero `professional.js`, `telegram.js` y `exercises.js` tambien necesitan servicios por dominio.
- La auditoria premium recomienda modularizar, pero hacerlo de golpe seria arriesgado; dividir por fases.
