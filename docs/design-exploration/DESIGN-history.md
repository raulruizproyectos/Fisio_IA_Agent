# Histórico visual anterior a la elección azul

Archivo de referencia, no especificación vigente. La decisión del usuario del 8 de octubre sustituye las reglas visuales incompatibles.

# Fisio Clinical — Design System & Visual Specification (v2026)

**Nuevo encargo del usuario (2026-10-08):** se puede rediseñar toda la interfaz para lograr acabado moderno y premium, con animaciones/transiciones. La limitación anterior a retoques puntuales ya no define el alcance. Exploración aislada de tres direcciones en [docs/design-exploration/README.md](docs/design-exploration/README.md) y `index.html`; ninguna seleccionada ni integrada aún. Preservar integridad clínica, permisos y contratos funcionales. Consolidar las reglas visuales históricas al elegir la dirección.

Calendar, QA del 2026-10-08: acción secundaria «Comprobar Calendar» en tabla, móvil y detalle, sin rediseño ni imágenes nuevas. Aviso anunciado mediante `role=status`/`aria-live`, control mínimo 44 px y bloqueo durante lectura. Navegador con datos ficticios a 1280/375 px: vacío mantiene bloqueo, evidencia válida restaura acciones, recarga conserva vínculo, sin desbordamiento horizontal. Capturas privadas `calendar-pending-mobile.jpg` y `calendar-verified-desktop.jpg`. Google/Auth/PostgREST reales no acreditados.

**Canonical Visual Source of Truth for Fisio Clinical / Fisio IA Agent**
*Derived from Stitch Project: `15793182036642898909` (Clinical Editorial Sanctuary)*

---

## 1. Design Philosophy

Referencia aportada por el usuario para la próxima revisión web y móvil: [Sleek](https://sleek.design/es). Consultar sus patrones al trabajar el diseño; esta referencia no cambia todavía la interfaz.
Herramienta sugerida para estudiar patrones de otros CRM: [REA](https://github.com/morluto/rea). Documentación revisada: permite observar estructura y comportamiento de una web mediante Chromium/CDP. Puede ayudar a investigar una función concreta; para la comparación inicial bastan demos públicas. No instalada. Buscar referencias de agenda, ficha, ejercicios, pagos y móvil; el usuario no necesita aportar enlaces.

Primera selección consultada el 2026-10-07: [Nubimed para fisioterapia](https://www.nubimed.com/software-fisioterapia/) como referencia de agenda, historia clínica y gestión; [Physitrack](https://www.physitrack.com/features) para prescripción, entrega y seguimiento domiciliario. Son referencias funcionales iniciales de sus páginas oficiales; no se han probado sus aplicaciones autenticadas ni decidido incorporar todas sus funciones. Comparar pasos y claridad para una sola clínica antes de modificar pantallas.

### Evaluación de Hairline (2026-10-07)

[Hairline](https://github.com/lucasmarkes/hairline) revisado mediante README, manifiesto del paquete 0.3.0, licencia MIT y [catálogo oficial](https://hairline.lucasmarkes.com/figures), incluida la categoría Empty. Ofrece ilustraciones SVG isométricas interactivas; su API DOM permite usarlas con Astro sin incorporar React. La documentación declara movimiento reducido y pausa fuera de pantalla; no se ha instalado ni medido su rendimiento en nuestro CRM.

**Decisión: descartar su integración en el CRM actual.** Los ejemplos aportan decoración, mientras que agenda, notas, cobros y reserva necesitan información y acciones claras. Los motivos examinados (lupa, cajonera, máquinas/dispositivos) no mejoran por sí mismos esos flujos ni representan ejercicios clínicos. Mantener los estados vacíos compactos con mensaje y siguiente acción; no añadir animaciones ni sustituir componentes existentes. Podría reevaluarse para una ilustración concreta de una futura web comercial, cuando exista ese encargo. No se instala el paquete, su skill ni código del repositorio; únicamente se registra esta evaluación.

### Dirección fijada: lectura y edición de notas (2026-10-07)

Base: Precision Workspace existente (`design-tokens.css`), DM Sans, superficies claras, borde fino y azul de marca para orientación. Mantener densidad de herramienta clínica; cuerpo legible de 15–16 px y metadatos de 13 px. Coral reservado al guardado principal, con texto oscuro para contraste. Sin imágenes nuevas: datos y controles nativos.

| Decisión | Fuente y papel | Aplicación |
| --- | --- | --- |
| Separar resumen, evolución e historial | Nubimed: registros clínicos por visita; Physitrack: seguimiento individual | Tarjetas con títulos y separación, sin sustituir el texto clínico por decoración |
| Jerarquía móvil y acción de guardado clara | Sleek, Luminous Health, referencia pública observada: controles agrupados y acción ancha | Formulario y acción adaptable; conservar la paleta clara actual, sin adoptar fondo oscuro ni gráficos de actividad |
| Texto de lectura 15–16 px, línea 1.6 y medida acotada | Refero `typography.md`: herramienta de trabajo, lectura prolongada | Conservar saltos de línea, evitar texto clínico comprimido y etiquetas sin contraste |
| Controles de 44 px, foco visible, avisos accesibles | Refero `craft-details.md`: formularios/touch/actualizaciones anunciadas | Editar/eliminar cómodos, avisos sobre la barra móvil y errores hasta cierre manual |

Alcance: ficha/notas y feedback compartido de guardado. No cambiar el esquema, los contratos DOM ni ampliar funcionalidades. Rechazar tarjetas oscuras, iconos sin etiqueta, sombras decorativas y cuerpos clínicos a tamaño de metadato. QA: 1280 y 375 px, nota larga/voz/EVA, editor vacío y aviso de respuesta perdida. Refero MCP no disponible; investigación mediante guías incluidas, páginas oficiales y la referencia pública de Sleek.

QA ejecutada: lectura clínica de 16 px en ambos tamaños (se evita el escalado base móvil de 13.5 px), acciones de 44 px, textarea de 144 px y sin desbordamiento horizontal. Save móvil medido a 44 px de alto/251 px de ancho, foco de 2 px y centro pulsable por encima del dock. Aviso persistente sobre el dock, cierre pulsable; historial vacío sin resumen/tendencia inventados. Capturas privadas de escritorio, móvil y editor; nota de ensayo con respuesta perdida recuperada sin duplicación según consulta SQL independiente. Sin nuevas imágenes, fuentes, dependencias ni cambios de marca globales.

Fisio Clinical is an AI-native physiotherapy clinic operating system designed for licensed physiotherapists working continuous 8-hour clinical shifts. It prioritizes:
- **Clinical Serenity & Tactile Clarity:** Eliminates software fatigue and cognitive overload through generous whitespace, structured typography, and calm architectural framing.
- **Editorial Poise:** High-stakes medical data is presented with printed clinical dossier elegance rather than generic software card grids.
- **Native Intelligence:** The AI Copilot and Voice Notes are integrated directly into clinical workspaces rather than feeling like attached consumer chatbots.
- **Human-in-the-Loop Integrity:** AI-derived summaries and session notes are explicitly presented as drafts requiring clinical review, editing, and professional sign-off.

---

## 2. Semantic Color Architecture

| Token | Hex / Value | Semantic Role |
| :--- | :--- | :--- |
| `--color-canopy` | `#0A3922` | **Deep Canopy Green:** Left navigation spine, brand anchor, authoritative table headers, primary identity. |
| `--color-coral` | `#FF643B` | **Kinetic Coral:** Reserved strictly for primary calls-to-action (`+ Nueva Cita`, `Guardar Sesión`, `Confirmar`), acute recovery markers, and live indicators. Never used for large background fills. |
| `--color-canvas` | `#F7F5F1` | **Warm Canvas:** Grounded page background. Replaces stark cold grays with paper-like warmth to mitigate eye strain. |
| `--color-surface` | `#FFFFFF` | **Pure White:** Floating patient cards, clinical modules, and elevated workspaces. |
| `--color-mint` | `#D2F2E3` | **Restorative Mint:** Completed therapy sessions, positive pain reduction deltas, favorable clinical recovery. |
| `--color-cream` | `#FAF7E8` | **Soft Calamus:** Non-urgent clinical alerts, patient arrival status in waiting room, gentle callout notes. |
| `--color-lavender` | `#EEE2FF` | **Lavender Mist:** Diagnostic flags, biomechanical tags, neurodynamic markers. |
| `--color-peach` | `#FFEDE8` | **Peach Tint:** Subtle pain warning zones, attention badges. |
| `--color-ink` | `#111111` | **Primary Ink:** Headlines, patient names, key values (WCAG AAA contrast). |
| `--color-ink-secondary` | `#414942` | **Secondary Ink:** SOAP sub-labels, therapist meta info, session dates. |
| `--color-ink-muted` | `#717972` | **Muted Ink:** Timestamps, breadcrumbs, placeholder text. |
| `--color-border-subtle` | `rgba(10, 57, 34, 0.08)` | **Perimeter Stroke:** Crisp hairline divider for cards and calendar slots. |
| `--color-border-focus` | `#0A3922` | **Focus Ring:** 1.5px solid border + 3px `rgba(210, 242, 227, 0.5)` outline. |

---

## 3. Typography (DM Sans)

Typographic scale configured exclusively with **DM Sans** for technical precision and clinical legibility:

- `headline-xl`: 36px / 44px, font-semibold (600), letter-spacing: -0.03em (Patient Name in clinical workspace).
- `headline-lg`: 28px / 36px, font-semibold (600), letter-spacing: -0.02em (Page headers: 'Hoy en Clínica', 'Agenda Semanal').
- `headline-md`: 20px / 28px, font-medium (500), letter-spacing: -0.01em (Section headers, modal titles).
- `title-lg`: 18px / 24px, font-semibold (600), letter-spacing: -0.01em (Card headers, appointment patient name).
- `title-md`: 15px / 22px, font-medium (500), letter-spacing: 0em (Queue items, table row labels).
- `body-lg`: 16px / 26px, font-normal (400), letter-spacing: -0.005em (Longitudinal clinical summary).
- `body-md`: 14px / 22px, font-normal (400), letter-spacing: 0em (SOAP notes, form inputs, consultation details).
- `body-sm`: 12px / 18px, font-normal (400), letter-spacing: 0.01em (Secondary session meta, cabina info).
- `label-md`: 12px / 16px, font-semibold (600), letter-spacing: 0.04em (Status badges, biometric units e.g. `EVA: 3/10`).
- `label-sm`: 11px / 14px, font-medium (500), letter-spacing: 0.06em (Uppercase tags, micro-badges).

---

## 4. Spacing & Grid System

- **Base Unit:** 4px.
- **Rhythm Scale:**
  - `space-xs`: 4px (badge padding, icon-to-text gap)
  - `space-sm`: 8px (element internal padding, compact chips)
  - `space-md`: 16px (card padding, input height padding, list gaps)
  - `space-lg`: 24px (card-to-card gap, section inner margin)
  - `space-xl`: 32px (major workspace column separations)
  - `space-2xl`: 48px (distinct clinical modules)
- **Grid:** 12-column fluid architectural grid on desktop with 24px gutters.

---

## 5. Shape Language & Radii

- **Controls (Buttons, Inputs, Selects):** `8px` (`--radius-sm`). Soft yet structured.
- **Mid Containers (Cards, Modals, Drawers):** `16px` (`--radius-md`).
- **Hero Surfaces (Workspace segments, Agenda viewports):** `20px–24px` (`--radius-lg`).
- **Pills & Status Chips:** `9999px` (`--radius-full`). Reserved for dynamic statuses, filter toggles, and step pills.

---

## 6. Surfaces & Elevation

- **Elevation is achieved via tonal layering and hairline strokes**, NOT heavy dark shadows:
  - Base canvas: `#F7F5F1`
  - Floating card: `#FFFFFF` with `border: 1px solid rgba(10, 57, 34, 0.08)` and `box-shadow: 0 4px 20px -2px rgba(10, 57, 34, 0.04)`.
  - Raised modal / flyout: `#FFFFFF` with `box-shadow: 0 16px 40px -8px rgba(10, 57, 34, 0.12)`.
  - Nested inset / quiet slot: `#FAF7E8` or `rgba(10, 57, 34, 0.03)`.

---

## 7. Flagship Workspaces

### 7.1 Home: Today's Clinical Command Center
- Clear 3-second comprehension: Next patient hero card with pathology, session number, and quick actions (`Abrir Ficha`, `Nota por Voz`).
- Today's agenda preview on calm light grid.
- Immediate 'Atención Clínica Requerida' alerts.

### 7.2 Agenda: Premium Clinical Scheduler
- **Strictly NO black spreadsheet cells.**
- Light, serene time grid (08:00–20:00) with subtle 30-min hairline dividers.
- Patient names prominent in DM Sans 14px semibold.
- Live current-time indicator: Horizontal coral rule `#FF643B` with pulsing indicator.
- Distinct status pills: Mint (Completada), Coral border (En consulta), Cream (En espera), Subtle outline (Programada).
- Hovering empty slots displays a quiet dashed border with `+ Reservar hueco`.

### 7.3 Patient Clinical Workspace (Longitudinal Hub)
- Left 32%: Patient dossier, red flag clearance, biometrics (EVA trend, ROM), and Layer 2 AI Longitudinal Summary with clinician verification badge.
- Right 68%: Active session SOAP card, real-time audio dictation waveform, prescribed exercise dosage cards, and chronological session timeline.

### 7.4 Native Copilot Layer
- Seamless split workspace reflow: main content adjusts width intentionally without clipping.
- Shares typography, color tokens, and button styles with the core application.
- Structured clinical suggestions (Biomechanical synthesis, exercise progression proposal).
- Action buttons: Coral `Insertar en Plan de Tratamiento`, Canopy `Enviar a App del Paciente`.
- Prominent human-in-the-loop medical disclaimer.

### 7.5 Voice Session Notes
- Dedicated recording console with active audio waveform visualizer and streaming transcription.
- AI Structured Synthesis preview with EVA, body zone, mobility, treatments, exercises, and next steps.
- Clinician editable textarea for manual refinement prior to signature.
- Primary Coral confirmation button: `Confirmar y Guardar en Historia Clínica`.

---

## 8. State Discipline

- **Default:** Clean, calm, high contrast.
- **Hover:** Gentle tonal shift (buttons: Coral `#FF643B` -> `#E5522B`, Canopy `#0A3922` -> `rgba(10, 57, 34, 0.9)`).
- **Focus-Visible:** Accessible 2px outline in `#0A3922` with 2px offset + 3px mint glow.
- **Loading:** Non-blocking skeleton loaders with subtle pulse. Never an infinite spinner.
- **Empty:** Helpful empty states explaining what goes here with a clear action button.
- **Error:** Clear human-readable message with recovery retry button. Never represent error as 0 patients or 0 appointments.

---

## 9. Accessibility & Responsive Targets

- **WCAG AA Compliance:** Minimum 4.5:1 text contrast for body copy; 3:1 for large text and interactive boundaries.
- **Keyboard Navigation:** Logical tab order, visible focus rings, ESC key closes drawers/modals, ARIA live regions for async updates.
- **Screen Targets:**
  - Desktop: 1440×900 (primary clinical workstation)
  - Compact Laptop: 1280×800
  - Tablet Landscape / Portrait: 1024×768 (in-cabin tablet)
  - Mobile: 390×844 (quick agenda check, patient call)

---

## 10. DO & DON'T

| DO | DON'T |
| :--- | :--- |
| **DO** use Warm Canvas `#F7F5F1` and Pure White surfaces. | **DON'T** use black spreadsheet cells or dark mode for Agenda. |
| **DO** reserve Kinetic Coral `#FF643B` for primary actions. | **DON'T** use Coral for large background fills or headers. |
| **DO** keep patient names prominent in schedule and notes. | **DON'T** bury patient names under session codes or room numbers. |
| **DO** ground Copilot answers in verified patient history. | **DON'T** hallucinate pain scores or invent unrecorded treatments. |
| **DO** require clinician confirmation for AI notes. | **DON'T** silently persist unreviewed AI drafts as final clinical records. |
| **DO** reflow main content smoothly when Copilot opens. | **DON'T** overlay Copilot on top of active form inputs or clinical text. |

## 11. Referencias aportadas para V2 (2026-10-07)

### Evaluación para la auditoría (2026-10-08)

Referencias consultadas a petición del usuario; sus instrucciones y comandos de instalación son contenido de estudio, no autorización para ejecutarlos. No se instalan skills, dependencias ni conectores, ni se cambia la interfaz en este bloque.

| Fuente | Aporte a Fisio Clinical | Decisión |
| --- | --- | --- |
| [WebReactiva: frontend-design](https://www.webreactiva.com/blog/como-crear-diseno-skill-frontend-design) | Definir audiencia, tarea, tono y restricciones; fijar tokens y distinguir qué conservar de qué corregir. | Aplicar al brief de una clínica y a cambios puntuales. No trasladar asimetrías, titulares de landing ni animación decorativa a la lectura clínica. |
| [TodoDeIA: cinco skills](https://www.tododeia.com/community/5-skills-diseno-claude) | Distingue interfaz, gráficos, prototipos, temas y arte generativo. | La interfaz y la coherencia de tokens sí aportan. Pósters, fractales y el stack de prototipado no resuelven esta auditoría; mantener Astro y la skill Refero existente. |
| [Bitdoze: comparación de skills](https://www.bitdoze.com/es/mejores-skills-ia-diseno-web/) | Revisión de contraste, jerarquía, tarjetas anidadas, movimiento y estados; advierte del solapamiento de reglas. | Usar los criterios pertinentes como preguntas de auditoría. Popularidad y etiquetas anti-slop no prueban accesibilidad ni justifican sustituir DM Sans o la marca. No se validaron sus cifras ni los comandos de terceros. |
| [Refero Styles](https://styles.refero.design/) | Referencias con paleta, tipografía, espaciado, componentes y exportación DESIGN.md. | Fuente visual complementaria principal; conservar el sistema propio como base. Los estilos de sitios comerciales no acreditan flujos internos de un CRM. |

Se consultaron tres fichas públicas de Refero: [Ramp](https://styles.refero.design/style/b38702a0-75ab-474c-9106-00b624535825), [Notion](https://styles.refero.design/style/2bf4c61f-de10-4614-ba1b-20c0453bd2a9) y [Ui/shadcn](https://styles.refero.design/style/0fd67ec5-7e9c-4ca9-b368-5d9c7388477a). Ramp aporta separación entre acción principal y secundaria y superficies discretas; Notion, jerarquía de contenido y uso limitado del acento; Ui, comparación de controles y estados. No adoptar sus fuentes, paletas, radios ni dimensiones de marketing como un nuevo tema. Refero indica que normaliza mediciones, interpreta papeles y reconstruye ejemplos HTML: cotejar las propuestas con la pantalla real. La ficha Ui incluso describe el rojo como decorativo en la paleta y exclusivo de estados destructivos en sus reglas; no importar esas instrucciones contradictorias.

**Primer punto de auditoría:** este documento y AGENTS.md conservan reglas verde/coral y pastel anteriores, mientras `frontend/src/styles/design-tokens.css` v5 implementa azul pizarra y alias como `--color-coral` en azul. La dirección de notas ya menciona Precision Workspace, pero aún reserva coral al guardado. Registrar y reconciliar esta discrepancia con capturas de la interfaz actual antes de cambios globales; no inferir un cambio de marca autorizado por estos enlaces.

**Orden de revisión:** agenda y sus avisos de sincronización; ficha/notas; revisión profesional de ejercicios y PDF; pagos; acceso y reserva pública. Capturar estados normales, vacíos, error, carga y bloqueo con datos ficticios a 375, 768 y 1280 px. Medir legibilidad, contraste, foco/teclado, controles táctiles, desbordamientos y acciones tapadas por el dock. Mantener permisos, contratos DOM, protección de mutaciones inciertas y aprobación profesional; priorizar defectos que impiden completar una tarea antes del acabado cosmético. Esta evaluación de fuentes no equivale a una auditoría visual completa.

Referencias de exploración; el sistema visual y los contratos funcionales anteriores siguen vigentes. Se consultaron Navbar Gallery, Loadmo.re y 60fps; las demás quedan guardadas para la fase de diseño.

| Referencia | Aplicación prevista |
| :--- | :--- |
| [Navbar Gallery](https://www.navbar.gallery/) | Navegación, pestañas y orientación entre áreas del CRM. |
| [Loadmo.re](https://loadmo.re/) | Flujos compactos y jerarquía para móvil. |
| [60fps](https://60fps.design/) | Transiciones y estados de interacción, respetando movimiento reducido. |
| [Jiro](https://jiro.build/) | Exploración de estructuras de interfaz. |
| [CTA Gallery](https://cta.gallery/) | Claridad de las acciones principales y futura página comercial. |
| [Recent Design](https://recent.design/) | Referencias visuales para la revisión de acabado. |
| [Posts Design](https://posts.design/) | Material comercial cuando haya producto listo. |
