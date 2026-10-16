# Auditoría local de código, funcionalidades y diseño — 16 octubre 2026

## Dictamen y alcance

Se cierra la revisión local solicitada por Raúl y se aplican las correcciones verificadas de esta tanda. El criterio de producto sigue siendo facilidad para fisioterapeutas, sin quitar funciones, con el diseño Precisión azul existente. No se promete ausencia de errores ni ejecución del 100% de combinaciones por haber leído código o pasado pruebas.

Repositorio: `C:\Visual Code\FISIO_IA_AGENT\Fisio_IA_Agent`. Base `main`, HEAD `1b2a9546c4427b7611092b2afb82ee5246d509e3`. El snapshot de verificación se tomó **local y antes de commit/push/despliegue**. Después, Raúl autorizó expresamente crear el commit y, por separado, publicarlo en main; la entrega que contiene esta entrada reúne esa tanda. El CI se comprueba en GitHub para el HEAD publicado. No se autoriza ni se realiza despliegue por esos permisos. Se conservan los cambios anteriores y `.claude/`. Retirado el prompt de traspaso a Claude; se conservan los recursos de diseño y la documentación funcional/histórica del producto.

### Cobertura de fuente

| Área | Revisión realizada | Límite |
| --- | --- | --- |
| Backend | 40 archivos JS leídos entre núcleo y mensajería, más el nuevo helper `pdf-filename.js` revisado al integrarlo: 41 actuales | Lectura y regresiones locales; no ejecución exhaustiva de todas las rutas contra proveedores |
| Frontend | 67 archivos inventariados: 53 leídos y 14 CSS grandes con análisis estructural y revisión dirigida | No se presenta el índice CSS como lectura humana de cada declaración |
| CSS | 22 archivos analizados, 19 importados, 2819 reglas/10668 declaraciones en el índice previo a los ajustes finales; correcciones finales revisadas aparte | La cascada histórica conserva deuda; no se ha reescrito toda la interfaz |
| SQL | 29 archivos revisados estáticamente | No se reejecutan migraciones aplicadas ni se acredita Cloud con este análisis |
| n8n | 24 archivos JSON/JS y 13 módulos backend de mensajería revisados | Una carpeta llamada production no prueba activación remota; ningún workflow cambiado/activado |
| Scripts/configuración | Scripts locales, CI, Docker/nginx, metadatos Node y lockfiles revisados | Sin cambio de resoluciones de dependencias; sin instalación ni actualización de n8n |

Inventarios y hallazgos originales en `auditoria-local/`. Sus reproducciones históricas describen el fallo antes de corregirlo; no son pruebas que deban seguir pasando después de la reparación. El recibo de integración distingue esas evidencias de la fuente final.

## Correcciones aplicadas

| Problema observado | Resultado y evidencia principal |
| --- | --- |
| Navegación, reparación de texto y altas duplicaban lógica/trabajo | Módulos compartidos para navegación, texto, HTTP y creación recuperable; sin perder sesión, CSRF ni claves de recuperación. Regresiones de los módulos y de alta |
| Cambiar de paciente o filtro dejaba respuestas antiguas visibles | Contexto, versión y trabajos por paciente; ficha, notas, historial, documentos, Copiloto y finanzas rechazan respuestas desfasadas. No se confunde error de lectura con vacío o cero |
| Registro de seguimiento enviaba dos POST o anunciaba el paciente equivocado | Un envío simultáneo, paciente/nombre capturados, borrador conservado y bloqueo explícito ante resultado incierto. No se atribuye idempotencia durable a este endpoint heredado |
| Hora y semana dependían de la zona del dispositivo | Helpers de Madrid para agrupación, semana, rangos GET y datetime-local→UTC; pruebas UTC/Los Angeles/Madrid y semanas de 167/169 h. Hora inexistente o ambigua rechazada antes del POST |
| Una zona registrada por voz/mapa no existía en el editor manual | Selector de nota con las zonas usadas por mapa/voz; EVA cero y orden clínico/creación preservados |
| Totales anuales leían solo una página de cobros | Lectura paginada con orden, recuento, límite temporal y rechazo de páginas fallidas/vacías/duplicadas o recuento cambiante. Ensayo con 6000 filas y cap de 173 por respuesta devuelve el total correcto, sin residuos de céntimos |
| Fallback clínico inventaba tratamiento o alivio al ver palabras negadas | Conserva el dictado completo y no infiere esos hechos por palabras clave. EVA solo explícita, sin confundir dosis/decimales; evolución desconocida no se muestra como favorable |
| Fallos SQL se convertían en vacío, 404 o guardado confirmado | Lecturas y escrituras afectadas preservan fallo; plantillas válidas por propiedad propia; seguimiento/archivo confirman solo persistencia acreditada |
| n8n agotaba el plazo solo hasta recibir cabeceras | El mismo timeout cubre también el cuerpo; transporte ficticio bloqueado devuelve el fallback. Fallos de auditoría dejan advertencia sin payload ni diagnóstico privado |
| Lista Calendar incompleta o vacía podía alterar citas | Lector compartido paginado; una ausencia en lista/404 no se trata como cancelación. Se mantienen marcas y bloqueos cuando falta evidencia |
| Reserva anónima devolvía identidad del CRM o rellenaba un contacto | DTO público de cita sin paciente/relación/contactos, sin editar la ficha existente por contacto no verificado. POST aplica la ventana publicada; recuperación histórica conserva idempotencia |
| Un chat ajeno podía apropiarse del bot profesional | Se comprueba el chat configurado antes de audio/IA; no se vincula al primer remitente |
| Repetir un envío de PDF podía duplicar la entrega al paciente | Reclamación persistida por clínica/plan/versión antes de Telegram, un solo envío concurrente y bloqueo ante acuse incierto; 13 regresiones, sin envíos reales. Fuente CRM canónica precede a duplicados legados |
| Firma inválida se guardaba como documento firmado | PNG validado y acotado antes de escribir, sin sustituir otra firma; el PDF no etiqueta como firmada una imagen ilegible. La ficha reutiliza el diálogo de dibujo existente y el contenido del documento correcto |
| Nombre Unicode rompía cabeceras PDF; conceptos largos se superponían | Filename ASCII más UTF-8; facturas con altura real y saltos de página. PDF de 100 filas y concepto de varias páginas generado, texto comprobado y páginas renderizadas/inspeccionadas |
| Resumen profesional largo fallaba por exceder Telegram | Salida acotada con aviso de lista abreviada y acceso a la lista completa en CRM; total/recuento conservados. No se cambió ni ejecutó el workflow |
| Scripts podían borrar un destino local existente o activar pausados | Destino nuevo validado, sin borrado recursivo configurable; renombrado conserva la activación previa y no reintenta mutaciones inciertas. Importador preserva contraindicaciones revisadas |
| Defectos visuales fuera del detector general | Importe largo legible en móvil; firma blanca/azul con texto desplazable y botones accesibles; progreso, prioridades y seguimiento con jerarquía; detalle de cita con lenguaje comprensible. Sin nuevas librerías/efectos decorativos |

## Verificación de la integración

- Backend: lint y **214/214 pruebas**, sin omitidas. Los tests de sockets se ejecutan fuera del aislamiento con fixtures locales; el EACCES del primer intento no era un fallo del producto.
- Frontend: check de 46 archivos, cero errores/cero warnings y un hint de renderer heredado sin consumidor; build de cuatro páginas. La advertencia Astro/Shiki no ha motivado relajar CSP.
- Los 28 scripts de regresión definidos en CI se verifican localmente. Git Bash necesita salir del aislamiento MSYS; los dos tests de configuración pasan en ese entorno. Helper PowerShell de carpetas temporales también pasa.
- Contratos DOM conservados: 540/540 marcadores únicos, comparados por archivo frente a la base.
- Navegador: 112 estados a 375/768/1280/1920 px, más recorridos con nombres Ñ y diálogos de cita/firma/voz con teclado, Escape y movimiento reducido. Capturas reales revisadas; el detector general por sí solo no detectó los dos fallos visuales corregidos.
- Firma larga: más de 2000 caracteres a 375×667/800, texto con scroll, lienzo 315×160 y guardado visible. Cantidades de 120 €, 123456,78 € y 123.456.789,00 € comprobadas sin recorte.
- PDFs: 100 filas en 10 páginas y concepto extremo en 5 páginas, sin texto fuera de márgenes ni pérdida de filas/totales en el ensayo. No son facturas reales.
- Recibos y capturas: `.private-backups/local-validation/audit-2026-10-16/`; logs en `tmp/`. No se publican datos privados como evidencia.

La integración final conserva un manifiesto de fuente y resultados en `auditoria-local/verification-2026-10-16.json`. La API de paginación sigue el [contrato oficial de rango y orden de Supabase](https://supabase.com/docs/reference/javascript/range); su uso local no demuestra el límite configurado de PostgREST remoto.

## Pendientes y riesgos que la auditoría deja identificados

### Bloquean reactivar el agente de citas o darlo por validado

El bot sigue **pausado, sin cambios ni activación**. M-03/M-04 del informe de mensajería conservan riesgo alto: comparación por últimas nueve cifras y clasificación de entrega incierta como fallida/reintentable. Otros pendientes del mismo ámbito: negaciones de redacción IA, respuestas legacy que confirman demasiado pronto y avisos caducados que pueden atascar la cola. Requieren su trabajo y pruebas específicas cuando Raúl autorice reanudar ese bloque.

Recordatorios existentes: la unicidad por cita/tipo/canal no distingue un nuevo horario tras reprogramar una cita ya recordada (M-08); requiere una solución de esquema/versionado ensayada, no borrar recibos inciertos. Seguimiento de ausencias: revision_manual puede mostrarse como enviado (M-10). No se acreditan estos recorridos por la suite verde. No usarlos como prueba de entrega real ni primer tick.

### Mantenibilidad y límites actuales

- `index.astro` y `professional.js` siguen concentrando dominios grandes. Se han extraído límites compartidos y corregido defectos, pero no se presenta esta auditoría como una reescritura total ni un código sin deuda. Continuar por responsabilidades pequeñas cuando un cambio concreto lo justifique.
- La cascada CSS tiene overrides y `!important` históricos; conservar contratos y comparar vistas antes de consolidarla. El renderer de seguimiento sin consumidor se conserva por los marcadores canónicos; no se borró código por tamaño a ciegas.
- `/profesional/notes` carece de idempotencia durable de servidor. La vista bloquea repetición incierta, pero recargar u otro proceso puede volver a enviar. Comprobar Historial antes de repetir un guardado dudoso.
- Agregación financiera por páginas no es una transacción de snapshot entre todas las lecturas: se detectan varios cambios/inconsistencias, pero no todas las ediciones simultáneas con igual recuento. Más de 100000 cobros/año responde error; un agregado SQL sería el siguiente cambio justificado por volumen.
- Matching de teléfono/calendario con listas acotadas puede omitir coincidencias en clínicas grandes; no se ha introducido una búsqueda indexada nueva ni se ha comprobado su cardinalidad en producción.
- Cliente Supabase sin deadline global; no añadir reintentos ciegos de escrituras. El envío del informe al propio profesional conserva riesgo de repetición, distinto del envío al paciente ya protegido.
- Las migraciones históricas contienen pasos no reejecutables sin preparación; no se modifican ni se reproducen por diferencias de timestamp.

## Qué no se acredita y cómo probar esta tanda

Sin ejecución de proveedores reales, mensajes/emails clínicos, IA con gasto, activaciones, cambios de credenciales, Cloud SQL, commit, push o despliegue. SQL/RLS/PostgREST y Docker/nginx no se han reensayado en ejecución para esta tanda; pruebas con dobles no los sustituyen. El audit remoto de dependencias backend quedó pendiente tras rechazo automático por salida de metadatos a npm; no se rodeó ese rechazo. El resultado frontend de dependencias cero corresponde a la comprobación anterior, no a una nueva consulta remota.

Para ver esta tanda en la URL pública hacen falta publicación autorizada, CI verde y despliegue autorizado de **backend y frontend** en EasyPanel. No se añade ninguna migración SQL en esta tanda. Después verificar contenedores/readiness, sesión/cookies, Calendar y los recorridos afectados con datos ficticios. Los hashes históricos de producción no prueban el despliegue de este árbol.

Primera prueba manual propuesta: abrir paciente y editar nota sin perder contexto; consultar Agenda desde móvil y escritorio; generar/revisar un plan, comprobar su aprobación y PDF; dibujar una firma; registrar cobro/consultar resumen y factura; cambiar rápidamente paciente/filtros y comprobar estados de error. Mantener el bot pausado y no usar destinos reales como fixture de esta comprobación.
