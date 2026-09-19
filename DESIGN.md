# Fisio IA Agent — Sistema de Diseño Clínico Premium (v2.0)

## 1. Filosofía y Dirección Visual (Refero & Superpower)
El sistema de diseño de **Fisio IA Agent** ha sido concebido para romper radicalmente con la apariencia genérica de CRM administrativo ("card soup" de tarjetas blancas con bordes redondeados y tipografía gris sobre blanco). 

Inspirado en la precisión de **Superpower**, la fluidez de **Linear** y la densidad de datos de **Attio** (documentados en Refero Styles), el producto adopta una estética de **Clinical Command Center**:
- **Superficies continuas** y **agrupación por whitespace** en lugar de anidar tarjetas indiscriminadamente.
- **Obsidian Dark Canvas**: Canvas de trabajo oscuro de alto contraste (`#090e17`) diseñado para jornadas intensivas de consulta clínica sin fatiga ocular.
- **Tipografía clínica de alta legibilidad**: Sans-serif moderna con números tabulares (`font-variant-numeric: tabular-nums`) para horas, métricas e importes económicos.
- **Micro-interacciones táctiles y Motion**: Transiciones de entrada `workspaceEnter`, escalado activo `scale(0.985)`, y aperturas contextuales para el Copiloto IA.

---

## 2. Tokens de Color y Superficies

### Superficies (Obsidian & Deep Slate)
| Token | Valor | Uso Principal |
| :--- | :--- | :--- |
| `--bg-base` | `#090e17` | Canvas global de la aplicación |
| `--bg-soft` | `#0d1522` | Paneles de trabajo, barras laterales y fondos de tabla |
| `--bg-paper` | `#111a26` | Tarjetas de acción, campos de formulario y modales |
| `--line` | `rgba(255, 255, 255, 0.08)` | Bordes sutiles de separación estructural |
| `--line-subtle` | `rgba(255, 255, 255, 0.04)` | Divisores internos de filas y celdas |

### Acentos Clínicos
| Token | Valor | Uso Principal |
| :--- | :--- | :--- |
| `--emerald-vibrant` | `#10b981` / `#34d399` | Horas de cita, estados confirmados, acciones primarias, IA |
| `--cyan-glow` | `#06b6d4` / `#38bdf8` | Indicadores de sincronización activa y notas clínicas |
| `--indigo-accent` | `#6366f1` / `#818cf8` | Documentos, consentimientos y enlaces |
| `--amber-warning` | `#f59e0b` / `#fbbf24` | Estados pendientes y alertas clínicas |
| `--rose-danger` | `#f43f5e` | Cancelaciones y acciones destructivas de finanzas |

### Tipografía y Contraste (WCAG 2.2 AA)
| Token | Valor | Uso Principal |
| :--- | :--- | :--- |
| `--text-primary` | `#f8fafc` | Títulos principales, nombres de pacientes, importes |
| `--text-secondary` | `#94a3b8` | Fechas, horas, metadatos y etiquetas secundarias |
| `--text-muted` | `#64748b` | Kickers, breadcrumbs y placeholders |

---

## 3. Arquitectura de Pantallas Clave

### A. Agenda (Clinical Schedule)
- **Eliminación de saltos de línea destructivos**: Columnas de HORA (`80px`) y DÍA (`115px`) forzadas con `white-space: nowrap !important;` y `tabular-nums`.
- **Nombres de pacientes prioritarios**: Ancho mínimo de `170px` con peso semibold y color `#f8fafc`.
- **Badges limpios**: Eliminación de píldoras vacías mediante selector `#weekPatientCount:empty { display: none !important; }`.
- **Calendario por bloques**: Celdas con fondo `#111a26`, bordes sutiles y chips de evento con acentos esmeralda/azul.

### B. Biblioteca Clínica (Templates & Planes Terapéuticos)
- **Cero colisiones estructurales**: Contenedor `.template-library-shell` en flex-column con `gap: 1.75rem`.
- **3 KPI Signals**: Tarjetas horizontales de metadatos (`Planes visibles`, `Entregas visibles`, `Pacientes con seguimiento`) con kickers esmeralda y tipografía de 2rem.
- **Historial de planes**: Filas enriquecidas que muestran paciente, título del plan, conteo de ejercicios, formato de entrega (PDF/WhatsApp) y botón de acceso directo a ficha.

### C. Finanzas (Caja Diaria & Facturación)
- **Workbench operativo**: Panel de prioridad en la izquierda con llamada a la acción contextual ("Registrar cobro"), y 4 tarjetas de acceso rápido ("Registrar cobro", "Emitir factura", "Crear bono", "Gestoria").
- **Resumen económico superior**: Barra de totales en números tabulares (`Total`, `Sesiones`, `Efectivo`, `Tarjeta`).
- **Tabla de cobros**: Contrastes optimizados sin cajas blancas lavadas.

### D. Documentos y Consentimientos
- **Visibilidad absoluta**: Título "Consentimientos" corregido de `#0b1519` (negro invisible) a `#f8fafc` (blanco nítido).
- **Métricas globales**: Indicadores de Total, Firmados y Pendientes en tarjetas oscuras integradas.
- **Listado seguro**: Estado de firma con chip esmeralda/ámbar y descarga directa de PDF legal.

### E. Ficha de Paciente (Clinical Workspace)
- **Sustitución completa de Tailwind claro**: Se eliminaron todas las clases `bg-[#FAFAF8]`, `bg-white` y `text-[#11181C]` a favor de obsidian slate (`#090e17` / `#0d1522` / `#111a26`).
- **Navegación por Pestañas**: Píldoras con acento esmeralda para alternar entre `Resumen de caso`, `Datos personales`, `Notas clínicas`, `Historial citas`, `Historial pagos` y `Documentos`.
- **Mapa Anatómico de Dolor & Resumen SOAP**: Visualización simultánea del estado clínico, cadencia, notas y evolución sin necesidad de hacer scroll excesivo.

### F. Copiloto Clínico IA (Contextual Rail)
- **Panel deslizante lateral**: Expansión fluida desde el lateral derecho sin desplazar abruptamente el contenido principal.
- **Stepper de 4 fases**: `Contexto` → `Propuesta` → `Revisión` → `Entrega`.
- **Atajos rápidos de prescripción**: Botones de un clic para patologías frecuentes (`Hernia L5-S1`, `Nota SOAP Tobillo`, `Optimizar Agenda`).
- **Píldora de contexto activo**: Muestra al paciente actualmente seleccionado para garantizar seguridad en la prescripción.

---

## 4. Motion System

- **Entrada de página**: `@keyframes workspaceEnter` con curva Bézier suave (`cubic-bezier(0.22, 1, 0.36, 1)`).
- **Sensación táctil**: `:active` con `transform: translateY(1px) scale(0.985)`.
- **Transición del Copiloto**: `transform: translateX(0)` con aceleración GPU (`will-change: transform`).
- **Accesibilidad**: Regla global `@media (prefers-reduced-motion: reduce)` que desactiva animaciones para usuarios que lo requieran.
