# Punto de situación para segunda pasada independiente — 16 octubre 2026

## Encargo vigente y primera respuesta

Raúl solicita ahora que Calcode/Claude Code continúe la revisión de código, diseño y funcionalidades, buscando defectos o mejoras que la pasada de Codex no detectó, para preparar el testing final. Esta petición **sustituye la cancelación anterior del traspaso**. Ya ha trabajado en este proyecto, pero debe contrastar ese contexto con este cierre.

Antes de auditar: leer el contexto y recomendar modelo, nivel de razonamiento y reparto por tareas/agentes entre los realmente disponibles. Priorizar el menor consumo que cumpla el resultado; no fijar versiones por nombres citados como ejemplo. La primera respuesta debe presentar esa propuesta y esperar a que Raúl confirme o configure la selección. Después, declarar en una línea el modelo/razonamiento de cada bloque y delegar solo cuando aporte valor, con contexto acotado y sin escrituras concurrentes. No atribuirse cambios de modelo o agentes que la herramienta no permita ejecutar. Prompt completo: [PROMPT_AUDITORIA_CLOUDCODE.txt](PROMPT_AUDITORIA_CLOUDCODE.txt).

## Repositorio y publicación

- Raíz real: `C:\Visual Code\FISIO_IA_AGENT\Fisio_IA_Agent`. La carpeta contenedora `C:\Visual Code\FISIO_IA_AGENT` es distinta.
- GitHub: https://github.com/raulruizproyectos/Fisio_IA_Agent ; rama `main`.
- Base de producto de este checkpoint: `ea7f998b41d43f35f0cda353bbed7e2b3931d887`. [CI 38911381365 verde](https://github.com/raulruizproyectos/Fisio_IA_Agent/actions/runs/38911381365).
- Esta entrega publica **solo seguimiento y prompt** con la petición de Raúl de actualizar GitHub. El commit documental que contiene este archivo será posterior a `ea7f998`; obtener su SHA con `git rev-parse HEAD` y comprobar su CI. No requiere redeploy ni cambia el producto.
- Al iniciar este checkpoint había cuatro documentos postdeploy modificados y `.claude/` sin seguimiento. Se incorporan los documentos de seguimiento; `.claude/`, `.env.local`, recibos y capturas privados quedan fuera de Git. No reset/clean, no descartar cambios de otro agente.

## Estado remoto leído el 16-oct a las 18:18:51 Europe/Madrid

| Elemento | Estado comprobado |
| --- | --- |
| EasyPanel `fisio-ia-agent/fisio-frontend` | Habilitado, `ea7f998b41d43f35f0cda353bbed7e2b3931d887` |
| EasyPanel `fisio-ia-agent/fisio-backend` | Habilitado, `3d4cce78192131bd8cb40efa1f9291a876730138` |
| Calendar background sync | `healthy`, `error:null`; último éxito 18:18:24 Europe/Madrid |
| W5 «Fisio IA \| Calendario leer» | Activo/publicado, versión `8dfe42f4-0f3d-48df-8e83-9f6827f77363`; `timeMin/timeMax` correctos en raíz de parámetros |
| CRM | https://fisio-frontend.b5xbaf.easypanel.host/login/ ; primera prueba de Raúl **ya iniciada**, con fallos concretos reparados |

Recibo sanitizado privado: `.private-backups/local-validation/handoff-2026-10-16/state.json`. Esta lectura no revalida DB/RLS, login, todos los proveedores ni todos los workflows. El bot/agente de citas sigue bajo la pausa vigente: no se ha autorizado reactivarlo ni alterar sus riesgos pendientes. No confundir bots Telegram profesionales/pacientes, reserva pública web, cron de recordatorios y piloto de booking: son recorridos distintos. El estado histórico de doce workflows activos no es un recuento remoto nuevo de este checkpoint.

## Qué se hizo en esta sesión

1. Auditoría local amplia de código/funcionalidad/diseño y reparaciones integradas en `3d4cce7`: aislamiento de respuestas por paciente/filtro, notas y dictado sin inferencias clínicas, fechas Madrid/DST, paginación financiera, errores DB honestos, reserva pública sin identidad privada, chat profesional autorizado, firmas/PDF y recibo previo a envío de PDF al paciente. Módulos compartidos de navegación, texto, HTTP, creación recuperable y Calendar. Detalle: [AUDITORIA_FINAL_2026-10-16.md](AUDITORIA_FINAL_2026-10-16.md).
2. Primera prueba real de Raúl: avisos Calendar y bloques Historial sin distribución. Se corrigieron separación de etiquetas, rejilla Telegram, enlaces largos, acciones y textarea. La ejecución manual n8n mostró una autorización Google no renovable aunque figurara «Account connected»; Raúl reconectó su cuenta. Se corrigieron en W5 los parámetros de fechas que el nodo 1.3 ignoraba. Fuente/prueba/CI en `e3a4773`; frontend y W5 publicados con autorizaciones separadas.
3. Otra captura mostró bloqueos Calendar que invadían otros días: `1fr` dejaba crecer el mínimo intrínseco de la fila por el texto largo. `ea7f998` fija columnas/celdas, cadenas móviles, etiquetas y hora fuera de horario. Frontend desplegado y comprobado. [Incidencias y secuencia completa](INCIDENCIA_CALENDAR_HISTORIAL_2026-10-16.md).

## Evidencia disponible y límites

- Backend lint y **214/214 pruebas**; frontend check de 46 archivos, cero errores/warnings y un hint heredado; build cuatro páginas. CI completo de `3d4cce7`, `e3a4773` y `ea7f998` verde. No atribuir todos los recorridos reales a esa suite.
- Auditoría previa: 112 estados de navegador a 375/768/1280/1920, diálogos/teclado/movimiento reducido, importes largos y PDFs extremos. Incidencia Historial: 24 estados locales y 12 sobre archivos públicos. Última Agenda: cinco anchuras 375/768/1024/1280/1920, bloqueos largos/simultáneos, alineación geométrica, apertura de detalle y contención del texto móvil.
- Los detectores generales **no detectaron todos los fallos que encontró Raúl**. Examinar capturas y geometría/texto real, con datos heterogéneos; no aceptar «sin overflow de documento» como prueba suficiente.
- Navegador automatizado con API/Auth ficticias; sin escrituras ni mensajes clínicos reales. Calendar sí tiene lecturas reales y ciclo automático acreditados en la incidencia. No se acredita generación IA de pago, entrega real a pacientes, primer tick de recordatorios, móvil físico ni nueva comprobación exhaustiva SQL/RLS.
- Cobertura estática inventariada: 41 JS backend; frontend 53 archivos leídos y 14 CSS grandes con análisis estructural/revisión dirigida; 29 SQL y 24 archivos n8n/helper en el inventario de entonces. No es una certificación de cada declaración CSS ni del 100% de combinaciones runtime.
- Inventarios y recibos: `docs/auditoria-local/`; `verification-2026-10-16.json` es un snapshot **anterior a publicar**, por eso contiene `published:false/deployed:false`. No editar evidencias antiguas para aparentar actualidad. Logs `tmp/`; capturas y recibos privados `.private-backups/local-validation/`, excluidos de Git y posiblemente ausentes en otro equipo.

## Pendientes para contrastar, sin implementarlos por esta entrega

| Prioridad/ámbito | Pendiente conocido |
| --- | --- |
| Seguridad booking pausado | M-03: identidad por últimas nueve cifras, colisión internacional. M-04: entrega Telegram incierta clasificada fallida/reintentable |
| Estados y avisos | M-05 negaciones de redacción IA; M-06 confirmación legacy demasiado pronto; M-09 caducados bloquean avisos nuevos; M-10 revisión manual mostrada como enviado |
| Recordatorios | M-08: clave de recibo no distingue horario tras reprogramación; no borrar recibos inciertos para sortearlo |
| Entrega a profesional | M-02 conserva riesgo de repetición en `/physio-report/send`; el envío al paciente sí se protegió con recibo persistido |
| Notas legacy | `/profesional/notes` sin idempotencia durable de servidor ante recarga/otro proceso; la vista bloquea repetición incierta en sesión |
| Arquitectura/CSS | Controladores `index.astro`, `professional.js`, `telegram.js` grandes; cascada/overrides históricos; pruebas que extraen fragmentos por texto. Separar por responsabilidad solo con comportamiento caracterizado |
| Eficiencia/consistencia | Cliente Supabase sin deadline global; matching con listas acotadas; totales financieros por páginas sin snapshot transaccional y límite explícito de volumen. Medir antes de cachear/refactorizar |
| OAuth | Estado External/Testing de Google Cloud no comprobado. Si aplica, expiración de siete días puede exigir nuevas reconexiones; no modificar publicación/permisos sin autorización |

Contrastar estos pendientes con la fuente actual y separar hallazgos nuevos de los ya conocidos/resueltos. Las descripciones antiguas y sus reproducciones de fallo no son tests que deban seguir fallando tras una reparación. Fuentes: `docs/auditoria-local/messaging-review-findings.md`, `backend-core-review-findings.md`, [CODE_STRUCTURE_REVIEW.md](CODE_STRUCTURE_REVIEW.md).

## Invariantes y alcance de la siguiente pasada

CRM sencillo para fisioterapeutas, completo sin repetir accesos/acciones. Mantener `DESIGN.md` Precisión azul, responsive desde 375, controles/foco/teclado y movimiento reducido; todos los IDs/data-* existentes. Las 25 referencias están en [DESIGN_RESOURCES.md](DESIGN_RESOURCES.md), como inspiración, no dependencias que instalar ni orden de rediseñar todo.

Una clínica, permisos/RLS y servidor autoritativo; secretos solo `.env.local` raíz, sin imprimir, copiar a GitHub ni a prompts. Plan IA empieza `requiere_revision`; no PDF/envío sin aprobación profesional, ni hechos clínicos inventados. Citas CRM conservadas ante fallos externos; ausencia/404/lectura parcial no confirma cancelación. No reintentar escrituras o entregas inciertas a ciegas.

Booking futuro: Telegram primero, nuevos/existentes con alta mínima/contacto verificado; consultar/reservar/reprogramar/cancelar/recordar, confirmación explícita, no solapes ni alucinaciones, derivación humana. Cambios/cancelaciones con al menos 24 horas; después clínica. WhatsApp futuro. Requisitos y código existente no equivalen a validación/activación. Leer `PILOTO_MENSAJERIA.md` y contratos del agente para auditar; no reanudar implementación ni activar por esta petición.

La continuación autorizada es una segunda **revisión local independiente**, primero propuesta de modelos y después auditoría cuando Raúl confirme. No autoriza al siguiente agente commit/push, deploy, migraciones Cloud, activaciones, credenciales, automatizaciones, IA de pago ni envíos. La autorización de publicar este checkpoint no se transfiere a acciones futuras. Las cinco migraciones ya aplicadas no se repiten por timestamps. No actualizar el software n8n.

## Siguiente entrega esperada

Una recomendación inicial breve de modelos/razonamiento y consumo; después `docs/AUDITORIA_SEGUNDA_PASADA.md` con cobertura real, hallazgos priorizados y reproducción, distinción nuevo/conocido/regresión/resuelto, corrección mínima propuesta y pruebas necesarias. Sin inventar fallos ni reescribir por reducir líneas. Si no hay hallazgos nuevos materiales, decirlo y describir los límites. Proponer implementación de uno en uno, esperando autorización para cambios de producto.
