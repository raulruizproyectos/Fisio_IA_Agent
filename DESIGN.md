# Sistema de Diseño Clínico — Fisio IA Agent
**Clinical Precision × Human Movement × Intelligent Software**

> Referencias de diseño: Estudio de sistemas visuales Refero (`styles.refero.design`), health-tech de alta precisión (Superpower Health), herramientas operacionales densas (Linear, Attio, Relate) y tipografía editorial contemporánea.

---

## 1. Filosofía Visual

Fisio IA Agent se concibe como **instrumental digital clínico de precisión**. No es un CRM genérico de oficina con tarjetas repetitivas; es un entorno de trabajo clínico diario para fisioterapeutas y centros de rehabilitación que prioriza:

1. **Claridad sobre Ruido (Anti-Card Soup)**: Los datos no se encierran en tarjetas arbitrarias dentro de tarjetas. Se organizan mediante ritmo tipográfico, líneas de regla sutiles (`1px solid rgba(15, 23, 42, 0.08)`), timelines continuos y superficies conectadas.
2. **Identidad Biomecánica**: El movimiento humano y la postura están presentes en la estética (indicadores de arcos de movimiento, escalas de dolor EVA intuitivas, siluetas anatómicas y transiciones suaves con inercia controlada).
3. **Inteligencia Silenciosa**: El Copiloto IA no es una ventana de chat flotante genérica; es un rail asistencial integrado que respeta el espacio de trabajo de la historia clínica, con estados de generación trazables (contexto → búsqueda de biomecánica → posología → validación profesional).

---

## 2. Paleta Cromática y Tokens

```css
:root {
  /* Superficies y Fondos */
  --surface-canvas: #f8fafc;       /* Fondo global limpio y descansado */
  --surface-ground: #ffffff;       /* Superficie principal de trabajo */
  --surface-raised: #f1f5f9;       /* Capas de apoyo y elevación suave */
  --surface-overlay: rgba(255, 255, 255, 0.92);
  --surface-dark: #090d16;         /* Modo oscuro / acento de autoridad */

  /* Tipografía e Ink */
  --ink-primary: #090d16;          /* Máximo contraste para lectura clínica */
  --ink-secondary: #334155;        /* Etiquetas y datos secundarios */
  --ink-muted: #64748b;            /* Metadatos y fechas */
  --ink-faint: #94a3b8;            /* Placeholders y marcas estructurales */

  /* Identidad Clínica (Clinical Teal & Biomechanic Cyan) */
  --teal-500: #0d9488;
  --teal-600: #0f766e;
  --teal-700: #115e59;
  --teal-50: #f0fdfa;
  --teal-100: #ccfbf1;
  --cyan-500: #06b6d4;
  --indigo-500: #6366f1;

  /* Semántica Clínica y Alertas */
  --clinical-red-flag: #e11d48;    /* Alertas rojas / contraindicaciones */
  --clinical-red-flag-bg: #fff1f2;
  --clinical-warning: #d97706;     /* Precauciones / dolor elevado */
  --clinical-warning-bg: #fffbeb;
  --clinical-success: #059669;     /* Sesión completada / plan aprobado */
  --clinical-success-bg: #ecfdf5;
  --clinical-pending: #2563eb;     /* En revisión / cita próxima */
  --clinical-pending-bg: #eff6ff;

  /* Estructura y Bordes */
  --border-subtle: rgba(15, 23, 42, 0.08);
  --border-strong: rgba(15, 23, 42, 0.16);
  --border-focus: #0d9488;

  /* Sombras y Luces */
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.06);
  --shadow-lg: 0 12px 32px rgba(15, 23, 42, 0.08);
  --shadow-glow-teal: 0 0 20px rgba(13, 148, 136, 0.18);

  /* Radios de Precisión */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Tipografías */
  --font-ui: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Sora', 'Manrope', sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
```

---

## 3. Tipografía y Jerarquía

- **Títulos y Hitos Clínicos (`Sora`)**:
  - `H1 (Jornada / Ficha)`: 28px–32px, tracking -0.025em, peso 700.
  - `H2 (Secciones Clínicas)`: 20px–22px, tracking -0.02em, peso 600.
  - `H3 (Subsecciones)`: 15px–16px, tracking -0.01em, peso 600.
- **Cuerpo y Datos Operativos (`Manrope`)**:
  - `Body`: 14px, interlineado 1.55, peso 400/500.
  - `Captions & Metadatos`: 12px, interlineado 1.4, peso 500/600, `text-transform: uppercase` con `letter-spacing: 0.05em` solo en kickers.
  - `EVA Score / Métricas`: 24px–36px, `tabular-nums`, peso 800.

---

## 4. Estructuras Arquitectónicas: Fuera la "Cardificación"

1. **Clinical Command Center (Inicio)**:
   - **Hero de Orientación Operativa**: Nombre del profesional, conteo en vivo de pacientes del día, y llamada prioritaria directa.
   - **Timeline Clínico Continuo**: En lugar de 4 tarjetas flotantes de citas, un carril horario vertical que muestra la progresión del día (pasada, en curso, siguiente, huecos libres).
   - **Foco "En Consulta Ahora"**: Tarjeta destacada con el paciente en camilla, diagnóstico rápido y botón directo de Copiloto IA.
   - **Triage y Prioridades**: Lista continua con separadores lineales de 1px, badges de estado semántico y acceso directo con teclado.
2. **Workspace del Paciente (Ficha)**:
   - **Cabecera de Identidad**: Avatar con iniciales, datos de contacto, alertas médicas (alergias/red flags) visibles sin scroll.
   - **Línea de Vida Clínica (Timeline)**: Episodios, notas subjetivas, pruebas objetivas (dolor EVA, goniometría), tratamientos y planes prescritos.
   - **Quick Actions Rápidas**: Nueva nota, Crear plan IA, Agendar cita, Registrar pago.
3. **Copiloto Clínico IA (Assistant Rail)**:
   - Rail lateral derecho con apertura fluida tipo drawer (280ms cubic-bezier).
   - Indicadores de estado transparentes:
     1. `Explorando catálogo anatómico`
     2. `Filtrando contraindicaciones`
     3. `Sintetizando posología clínica`
     4. `Listo para revisión del profesional`
   - Vista previa interactiva de ejercicios con apoyo visual y selector de series/repeticiones editable.

---

## 5. Motion Design de Producto

El movimiento es una herramienta funcional de orientación y feedback, no un adorno:

| Tipo de Interacción | Duración | Curva de Aceleración | Propósito |
|---|---|---|---|
| **Micro feedback** (hover, click, chip toggle) | 120ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Respuesta táctil instantánea |
| **Cambio de estado / tab activo** | 180ms | `cubic-bezier(0.2, 0, 0, 1)` | Continuidad de foco visual |
| **Apertura de drawer / Copiloto** | 260ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Desplazamiento orgánico con amortiguación |
| **Transición entre vistas** | 220ms | `cubic-bezier(0.2, 0, 0, 1)` | Fade-in suave con desplazamiento de 4px |

### Accesibilidad de Movimiento:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 6. Criterio de Control Anti-Genérico

Ante cada componente, verificar:
- [x] ¿Tiene terminología y propósito clínico explícito (EVA, zona corporal, contraindicaciones, alertas médicas)?
- [x] ¿Evita sombras purpuras o gradientes SaaS genéricos?
- [x] ¿Utiliza ritmo tipográfico y espacio negativo en lugar de bordes y cajas arbitrarias?
- [x] ¿El Copiloto exige supervisión humana antes de exportar?
