# Fisio Clinical — Design System & Visual Specification (v2026)

**Canonical Visual Source of Truth for Fisio Clinical / Fisio IA Agent**  
*Derived from Stitch Project: `15793182036642898909` (Clinical Editorial Sanctuary)*

---

## 1. Design Philosophy

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
