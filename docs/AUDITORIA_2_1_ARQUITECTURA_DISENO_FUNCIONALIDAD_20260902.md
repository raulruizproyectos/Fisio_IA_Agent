# Auditoría 2.1 de arquitectura, diseño y funcionalidad

Fecha: 2026-09-02  
Rama auditada: `production-hardening`  
Ámbito: frontend Astro, API Express, Supabase/PostgreSQL, despliegue y operación.

## Decisión ejecutiva

El producto funciona en staging, autentica con Supabase y mantiene frontend y backend saludables. El principal riesgo ya no es el despliegue: es la acumulación estructural. La siguiente fase debe reducir complejidad sin reescribir el producto.

Prioridad de producto: convertir el inicio en una mesa de trabajo clínica. Debe responder, por este orden, a qué requiere atención, qué sesión viene después y qué acción debe ejecutar el profesional. La IA se presenta como circuito clínico revisable, no como adorno ni como colección de tarjetas.

## Evidencia verificable

| Área | Evidencia | Riesgo | Prioridad |
|---|---|---|---|
| Controlador frontend | `frontend/src/pages/index.astro`: 9.169 líneas | Regresiones y dificultad para probar por dominio | P1 |
| Cascada visual | 4 hojas principales, 6.929 líneas y 2.970 usos de `!important` | Colisiones responsive y correcciones frágiles | P1 |
| API de agenda/programas | `backend/src/routes/professional.js`: 3.311 líneas | Acoplamiento de calendario, reservas y programas | P1 |
| API Telegram | `backend/src/routes/telegram.js`: 3.069 líneas | Difícil aislamiento de parsing, transporte y casos clínicos | P1 |
| Motor de ejercicios | `backend/src/routes/exercises.js`: 2.065 líneas | Mezcla HTTP, generación, persistencia y trabajos asíncronos | P1 |
| Accesibilidad | Controles e iconos con cobertura ARIA desigual; existen `outline-none` compensados globalmente | Riesgo de navegación inconsistente por teclado | P1 |
| Copia de interfaz | Textos heredados sin tildes y elipsis ASCII | Menor calidad percibida y coherencia en español | P2 |
| Configuración clínica | Datos de clínica guardados en `localStorage` | No se sincronizan entre equipos y perfiles | P1 |
| Estado de navegación | Aplicación de página única basada en secciones sin URL canónica por vista | Recarga y enlaces profundos no conservan contexto | P2 |
| Seguridad | JWT de usuario, RLS, separación de `service_role`, rate limits e idempotencia presentes | Base adecuada; faltan pruebas reales de aislamiento y restauración | P0 antes de producción |

## Auditoría visual y de experiencia

### Problemas observados

1. La versión previa acumulaba contenedores redondeados, sombras y píldoras en casi todos los niveles. Esto hacía que acciones, métricas y contexto compitiesen visualmente.
2. El lateral mezclaba estado, promoción de IA y navegación con el mismo peso, además de invadir el área de los enlaces con su barra de desplazamiento en portátil.
3. El bloque principal incluía una tarjeta dentro de otra superficie y comprimía el saludo en resoluciones de portátil.
4. Los estados vacíos describen el problema, pero no siempre indican una acción concreta.
5. La terminología combina inglés técnico visible (`Clinical OS`, `Sync`, `Triage`) con español clínico.

### Dirección 2.1

- Identidad: mesa clínica editorial, sobria y precisa.
- Paleta: bosque `#123f38`, bosque profundo `#0b302a`, verde clínico `#197266`, papel `#fffdf8`, lienzo `#f4f2ec`, oro señal `#ae8446`.
- Tipografía: Sora solo para titulares y decisiones; Manrope para lectura, formularios y datos.
- Firma visual: recorrido diagnóstico → propuesta → validación → seguimiento, mostrado como una secuencia clínica continua.
- Restricción: una sola superficie de alto contraste por pantalla. El resto usa jerarquía, espacio y divisores.
- Lenguaje: español de España para conceptos del producto; nombres técnicos del ecosistema se conservan cuando traducirlos reduzca precisión.

### Cambios incluidos en esta entrega

- Barra de desplazamiento del lateral aislada del área interactiva.
- Estado activo del menú mediante acento vertical y cambio de contraste, sin bloque oscuro ni sombra.
- Estado de consulta y acceso a IA simplificados.
- Hero del inicio convertido en composición abierta con divisor, sin contenedor decorativo.
- Próxima sesión presentada como información prioritaria, no como tarjeta anidada.
- Indicadores agrupados en una banda continua.
- Recorrido IA sin cuatro tarjetas repetidas.
- Radios, sombras y elevaciones reducidos de forma sistemática.
- Etiquetas de búsqueda, nombres de controles, elipsis y acentos corregidos.
- Adaptación específica para portátil, móvil y preferencia de movimiento reducido.

## Arquitectura objetivo incremental

### Frontend

Extraer desde `index.astro` sin cambiar los contratos DOM existentes:

1. `controllers/navegacion.ts`: sección activa, URL y responsive.
2. `controllers/pacientes.ts`: búsqueda, alta y ficha.
3. `controllers/agenda.ts`: calendario, citas y sincronización.
4. `controllers/copiloto.ts`: conversación, plan, revisión y entrega.
5. `controllers/finanzas.ts`: pagos, bonos, facturas y gestoría.
6. `controllers/documentos.ts`: documentos y enlaces protegidos.
7. `services/api.ts`: `fetch`, autenticación, timeout y errores normalizados.

Cada extracción requiere pruebas de contrato sobre los IDs y `data-*` utilizados por las vistas Astro.

### Backend

- `professional.js`: separar `agenda`, `reservas-publicas`, `calendario-google` y `programas`.
- `telegram.js`: separar adaptador Telegram, parser de intenciones, sesiones y casos de uso.
- `exercises.js`: separar rutas, recomendación, trabajos asíncronos, persistencia e informes.
- Introducir validación de entrada compartida y códigos de error estables antes de ampliar endpoints.
- Mantener alias ingleses solo como compatibilidad; la API canónica nueva será española y documentada.

### Datos

- Mantener tablas y columnas existentes para evitar una migración destructiva.
- Usar español conciso en entidades nuevas y documentar un glosario único.
- Migrar la configuración de clínica desde `localStorage` a una tabla vinculada al perfil o centro.
- Verificar RLS con dos profesionales y pacientes cruzados antes de producción.
- Definir retención, exportación, supresión, backup y restauración para datos clínicos.

## Plan priorizado

### P0 — requisito previo a producción

- Prueba automatizada de aislamiento entre dos profesionales.
- Restauración de backup probada y documentada.
- Smoke real de autenticación, aprobación clínica, PDF, Telegram, agenda y cierre de sesión.
- Confirmar que logs, alertas y n8n no contienen datos clínicos identificables.

### P1 — estabilización

- Extraer cliente API y primer controlador de `index.astro`.
- Dividir las tres rutas backend mayores por contexto.
- Consolidar tokens y componentes en una única capa CSS; eliminar overrides por bloques.
- Persistir configuración de clínica en Supabase.
- Auditoría completa de teclado, foco, etiquetas, diálogos y mensajes `aria-live`.

### P2 — madurez de producto

- Sincronizar la vista activa y filtros relevantes con la URL.
- Añadir pruebas end-to-end para móvil, portátil y escritorio.
- Medir LCP, CLS e INP en staging y registrar presupuesto por versión.
- Unificar terminología visible y estados vacíos orientados a la acción.

## Criterios de aceptación de la fase 2.1

- `astro check` y build sin errores ni avisos.
- Lint y tests backend en verde.
- Sin desplazamiento horizontal a 360, 768, 1280 y 1920 px.
- Navegación completa por teclado con foco visible.
- El lateral no solapa texto, enlaces ni barra de desplazamiento.
- El inicio conserva jerarquía y acciones sin tarjetas anidadas en portátil.
- Ninguna propuesta de IA puede enviarse sin revisión profesional.
- Ningún secreto aparece en frontend, logs, documentos o commits.
- Producción permanece intacta hasta autorización explícita.

## Secuencia de ejecución

1. Finalizar y validar el rediseño del inicio en staging.
2. Ejecutar smoke visual y funcional con el usuario QA.
3. Extraer `services/api.ts` y el controlador de navegación como primer corte de arquitectura.
4. Añadir pruebas de contrato DOM y aislamiento multiusuario.
5. Dividir backend por contextos, una ruta por entrega.
6. Consolidar CSS después de estabilizar los módulos extraídos.

