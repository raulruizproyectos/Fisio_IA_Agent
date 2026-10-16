# Auditoría propia — punto seguro 16-oct-2026, Europe/Madrid

Raúl cancela el traspaso a Claude Code y pide que Codex termine la auditoría de código, funcionalidades y diseño web/móvil. Este punto permite reiniciar Codex por su actualización pendiente; no acredita el cierre de la auditoría.

## Árbol y límites

Repositorio: `C:\Visual Code\FISIO_IA_AGENT\Fisio_IA_Agent`. Rama `main`, HEAD `1b2a9546c4427b7611092b2afb82ee5246d509e3`. Muchos cambios locales y archivos nuevos, sin commit/push/despliegue. No reset/clean ni sustituir por clon limpio. Conservar `.claude/` sin tocar. Secretos solo `.env.local` raíz; no leerlos/imprimirlos por esta revisión.

El agente de citas está pausado por decisión vigente de Raúl: no modificar ni activar su lógica/workflows. Los cambios en `telegram.js` afectan al bot profesional y al envío manual de planes aprobados, no reactivan reservas. Mantener una clínica/RLS, aprobación profesional antes de PDF/envío y los IDs/data-* de las vistas. Commit, push, producción, migraciones, envíos reales y gasto requieren autorizaciones específicas nuevas.

Se retira el prompt de traspaso `PROMPT_AUDITORIA_CLOUDCODE.txt`; los 25 recursos se conservan en `DESIGN_RESOURCES.md`. `auditoria-cloudcode/` contiene documentación funcional e histórica del producto y del agente ya implementado: conservarla, no confundir su nombre con una nueva delegación. No se creó un nuevo prompt para Claude ni se solicitará elección de modelo.

## Cambios preparados en local

- Navegación/textos/HTTP/altas recuperables en módulos compartidos; menos trabajo y consultas repetidos. Nombres con Ñ y timeouts nativos corregidos. Detalle previo en `CODE_STRUCTURE_REVIEW.md`.
- Ficha/Copiloto: invalidación por paciente y versión; no mostrar datos del paciente anterior durante cargas fallidas; trabajos pendientes por paciente, documento e historial con protección frente a respuestas antiguas. Finanzas distingue lectura fallida de cero real. Horas por defecto redondeadas correctamente. Evolución de voz sin mejora inventada; mapa conectado a las notas, EVA cero válido.
- Backend: fallos de lecturas de pacientes/notas/documentos/bonos/facturas dejan de convertirse en vacío/404; plantillas verificadas con propiedades propias; seguimiento/archivo solo confirman escritura persistida. Copiloto reconstruye contexto de notas y limita la petición directa a IA.
- Calendar: lector común paginado con límites y rechazo de respuesta parcial; ausencia en una lista no cancela una cita CRM. Se conserva el estado pendiente ante evidencia insuficiente.
- Voz clínica: EVA solo de expresiones explícitas, valor final de un cambio, sin confundir repeticiones ni truncar decimales; negaciones de mejoría y notas previas preservadas en fallback.
- Errores globales de producción: sin query privada, diagnóstico público genérico, alertas con request_id y timeout; conservar avisos 5xx, sin alertar rechazos esperados 4xx.
- Bot profesional: chat previamente autorizado antes de audio/IA, sin apropiación por primer mensaje.
- PDF al paciente: reclamación persistida por clínica/recomendación/versión antes de enviar; concurrencia/repetición bloqueadas. Timeout o acuse incierto queda para revisión manual y no se reenvía. Documento con límite de 10 s y message_id válido; estado enviada solo tras recibo confirmado. No se han enviado mensajes reales.
- Scripts de copia local ya no borran destinos configurables existentes; rename n8n conserva pausados y no reintenta activaciones; importador Proet no borra contraindicaciones revisadas. Node 24 coherente, sin cambios de resoluciones de dependencias.

## Evidencia fresca de este punto

- Backend `npm run lint --prefix backend`: pasa.
- Backend `npm test --prefix backend`: **201/201**, sin omitidas. Primera ejecución dentro del aislamiento falló por EACCES al conectar a 127.0.0.1; ejecución fuera del aislamiento con servicios ficticios locales pasa. Recibo `tmp/backend-audit-suite.log`.
- Bloque Telegram/aprobación profesional: **27/27**. Regresión nueva de entrega: **12 casos** que fallaban antes y pasan tras el cambio. Dobles de DB/Telegram; no es entrega real.
- Frontend `npm run check --prefix frontend`: 46 archivos, cero errores/cero warnings, un hint por `renderRecommendationFollowUpForm` sin consumidor. No borrarlo a ciegas por sus contratos DOM.
- Frontend build: cuatro páginas. Advertencia de Astro/Shiki sobre estilos inline/CSP; no se ha relajado CSP.
- Contratos DOM comparados por el revisor: 540/540 en 14 archivos, sin pérdidas; recibo `tmp/frontend-dom-contract-review.json`. Revalidar al terminar cualquier edición.
- Trece scripts focales ejecutados tras los cambios: appointment-defaults, assistant-patient-context, ficha-read-state, finance-read-state, ficha-save-context, frontend-auth, public-booking, navigation, text, http, creation-recovery, proet-sync, rename-n8n-fisio: pasan. Los ocho nuevos/relevantes de esta fase quedan añadidos a CI, sin ejecución remota.
- Los 112 estados y recorridos de navegador de la tanda anterior son evidencia histórica; **la tanda combinada actual aún necesita su pasada visual final**.
- Audit frontend de dependencias anterior: cero; audit backend remoto bloqueado por revisión automática por envío de metadatos de dependencias a npm. No reintentar ni rodear el rechazo sin autorización. PostgreSQL/PGlite/Docker y proveedores reales no comprobados en este cierre.

## Cobertura y hallazgos abiertos

Infraestructura/configuración/scripts y 29 SQL revisados estáticamente; no reejecutar migraciones históricas. Mensajería: 13 módulos y 24 JS/JSON revisados, inventario y hallazgos en `tmp/messaging-review-coverage.json` y `tmp/messaging-review-findings.md`. El M-02 de ese informe queda corregido para patient-report/send por esta tanda; al profesional aún no tiene recibo equivalente.

Revisores detenidos, sin más ediciones. Cobertura guardada: frontend 67 archivos inventariados, 34 leídos, 6 parciales y 27 pendientes; backend core 24 completos y 3 parciales (professional 1–2642, exercises 236–2141, prompt 128–145). Inventarios exactos en `tmp/frontend-review-coverage.json` y `tmp/backend-core-review-coverage.json`, con hallazgos core en `tmp/backend-core-review-findings.md`. Copias documentales en `docs/auditoria-local/`. No asumir lectura completa donde constan pendientes.

Cuatro fallos reproducidos por el revisor core sin red/DB, aún sin fix: pagos resumen/gestoría truncan 6000 filas a 5000; fallback clínico interpreta negaciones como terapia/ejercicios/alivio; firma `not-an-image` aceptada como documento firmado; nombre Unicode como 東京 rompe Content-Disposition. Repro y recibo: `tmp/backend-core-readonly-repros.mjs` y archivo JSON asociado. PDF de facturas con coordenadas fijas y muchas líneas sigue como riesgo de lectura sin reproducción. Frontend: cascada CSS y coherencia de zona horaria navegador/Madrid pendientes de lectura/validación. Retomar estas evidencias antes de corregir.

Bot pausado, solo registrar para revisión/permiso posterior: identidad por últimas nueve cifras (colisión internacional), aviso de entrega incierta tratado como fallido/reintentable, negaciones en redacción IA y otros hallazgos M-03…M-10 del informe de mensajería. No presentar la pausa como reparación.

## Próximo paso concreto al volver

Leer este punto y git status/diff. Recuperar los informes de cobertura de los revisores y completar la lectura pendiente de controladores/componentes/CSS y backend core. Evaluar los hallazgos reproducibles de pagos/facturas y cerrar los fallos autorizados con regresiones. Incorporar nuevas regresiones relevantes a CI, comprobar el diff combinado y ejecutar la pasada visual web/móvil con la compilación final (`tmp/audit-code-refactor-ui.mjs`, `tmp/check-code-refactor-flows.mjs`, datos ficticios). Corregir solo fallos demostrados, conservar diseño Precisión azul y simplicidad para fisioterapeutas.

Después: lint/tests backend, check/build frontend y regresiones afectadas; actualizar el informe con cobertura real y límites. No prometer 100% de ejecución ni funcionamiento remoto por lectura del código. Para probar esta tanda en la URL pública se necesitarán publicación y despliegue autorizados de backend y frontend, no realizados aquí.
