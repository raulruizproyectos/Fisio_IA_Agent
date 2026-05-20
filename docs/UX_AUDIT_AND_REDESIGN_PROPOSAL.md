# Auditoría UX y Rediseño Premium: Fisio IA Agent

Como Senior Product Designer y UX Architect, tras revisar la arquitectura, documentación, flujos y código base de `Fisio_IA_Agent`, he detectado que el producto tiene un enorme potencial como **Copiloto Clínico IA**, pero actualmente su interfaz y experiencia de usuario están ancladas en patrones de diseño de un CRM médico tradicional y pesado.

Nuestra meta no es ponerle una capa de pintura al CRM, sino **invertir la jerarquía**: la Inteligencia Artificial no debe ser una herramienta lateral (un "rail" o "widget"); la Inteligencia Artificial debe ser el **lugar de trabajo principal** del fisioterapeuta.

A continuación, presento la auditoría completa y la estrategia de producto para transformar Fisio IA en el "Perplexity / Linear de la fisioterapia".

---

## PARTE 1: AUDITORÍAS Y DIAGNÓSTICO DEL ESTADO ACTUAL

### 1. Auditoría UX Completa
El principal fallo actual es la fricción en la navegación y la saturación de información. El usuario se ve forzado a ir de sección en sección (`Dashboard` -> `Pacientes` -> `Ficha` -> `IA`) en lugar de tener un flujo contextual. El "Assistant Rail" actual, aunque se rediseñó para ser "chat-first", sigue compitiendo por espacio con las tablas y widgets del CRM, sintiéndose como un apéndice en lugar del núcleo.

### 2. Auditoría Visual
- **Exceso de Contenedores:** Hay demasiadas cajas (`card`, `table-card`, `ops-signal`), bordes e interfaces anidadas que generan ruido.
- **Clases Forzadas:** El CSS (`global-shell.css`) está plagado de `!important`, indicando una lucha constante contra estilos legacy. Esto hace que la UI se sienta rígida y pesada.
- **Paleta y Tipografía:** Aunque se ha unificado a `Manrope`, la estética sigue siendo corporativa. Falta sensación de "calma" y "espacio" (whitespace). 

### 3. Problemas Principales de Arquitectura (Frontend)
- **El Monolito (`index.astro`):** Un archivo de +1MB con todas las páginas (`dashboard`, `pacientes`, `citas`, `finanzas`) ocultándose vía DOM (`data-page`). Esto destruye la escalabilidad, el rendimiento y la fluidez.
- **Estado Acoplado al DOM:** No hay un estado central reactivo real, se depende de selectores y `display: none`.
- **CSS Inmantenible:** El uso abusivo de `!important` para sobreescribir estilos antiguos.

### 4. Problemas de Jerarquía Visual
- **Falta de Foco:** Cuando se abre el copiloto, el CRM de fondo sigue reclamando atención.
- **Competencia Visual:** Los KPIs, calendarios y tablas de pacientes tienen el mismo peso visual que las acciones críticas clínicas.
- **Scrolls Anidados:** Múltiples contenedores con su propio `overflow-y: auto`, provocando el síndrome de "scroll dentro de scroll", lo cual es letal para la experiencia de usuario y la percepción premium.

### 5. Problemas Cognitivos
- **Sobrecarga de Decisiones:** La pantalla inicial ofrece demasiadas rutas (`Nuevo paciente`, `Citas`, `Telegram`, `Pagos`).
- **Context-Switching:** El fisio debe recordar el contexto del paciente al cambiar entre la ficha, el calendario y el agente.

### 6. Problemas del Flujo Clínico
- El flujo ideal de un fisioterapeuta en sesión es: **Entender contexto -> Escuchar al paciente -> Razonar -> Generar Plan -> Entregar**.
- Actualmente, el sistema exige rellenar formularios (`Área afectada`, `Duración`) en paneles laterales antes de hablar con la IA, rompiendo la naturalidad conversacional.

---

## PARTE 2: PROPUESTA DE REDISEÑO Y ESTRATEGIA

### 7. Rediseño UX Completo: La Inversión del Paradigma
El producto dejará de ser un "CRM con IA" para ser un **"Copiloto Clínico con Memoria"**.
- **100% Conversacional:** La IA ocupa el centro (70-80% de la pantalla).
- **Un Solo Scroll:** Eliminación absoluta de scrolls internos. Todo fluye en un scroll global estilo Perplexity/Notion.
- **Sin Sidebars Inútiles:** El panel derecho desaparece. El contexto del paciente flota de forma minimalista en la cabecera o como un drawer contextual (`⌘ + K` o `Click`).

### 8. Wireframes Textuales Detallados

**ESTADO: CONSULTA ACTIVA (Ej. "Paciente: María López")**

```text
[TOPBAR MINIMALISTA]
🔍 Buscar paciente, cita o comando (⌘K)      |   🟢 María López (Activa)   |   [Avatar Fisioterapeuta]

[WORKSPACE CENTRAL - 80% DEL ANCHO]
  [CONTEXTO CLÍNICO INVISIBLE PERO PRESENTE]
  | Última visita: Hace 3 días. Dolor lumbar mecánico (3 semanas).
  | Objetivo: Reducir dolor y recuperar flexión.

  [HISTORIAL CONVERSACIONAL Y PLANES]
  Fisio: "María refiere mejoría pero molestia al sentarse más de 2h."
  
  🤖 IA: "Entendido. Dado que hay dolor postural en sedestación prolongada, 
       ajustemos el plan actual. He reducido los grados de flexión en el 
       ejercicio 'Gato-Camello' y añadido pautas de higiene postural."
       
       [WIDGET: PLAN LUMBAR AJUSTADO v2] -> (Botón: 👁️ Ver / 📤 Enviar a Telegram / 📄 PDF)

  [INPUT CONVERSACIONAL (Estilo Claude/Perplexity)]
  |-----------------------------------------------------------------------|
  | Describe síntomas, ajustes o evolución para María...                  |
  |                                                                       |
  | ✨ + Plan Lumbar   ✨ + Añadir Evolución   ✨ + Preparar Próxima Visita |
  |-----------------------------------------------------------------------|
```

### 9. Nueva Arquitectura de Navegación
Se elimina el Sidebar grueso tradicional de CRM.
- **Navegación Izquierda (Colapsada/Iconográfica):** Solo iconos elegantes (Inbox, Pacientes, Calendario, Finanzas).
- **Global Command Menu (⌘K):** Para cambiar rápido entre pacientes, crear citas o facturar sin tocar el ratón.
- **Contexto Pinneado:** Si un paciente está activo, su contexto fija el entorno. No necesitas ir a "Finanzas", pides "Cobrar sesión de hoy" y el widget de pago aparece en el chat.

### 10. Sistema Visual Premium
Inspirado en Linear, Notion y Apple Health:
- **Tipografía:** Transición a `Inter` o `Geist` para máxima legibilidad clínica. Jerarquía clara (Headers grandes, cuerpo limpio).
- **Colores:**
  - *Fondo general:* Blanco cálido / Hueso (`#FAFAF8`).
  - *Textos:* Gris muy oscuro (`#11181C`) para reducir fatiga visual; Gris secundario (`#687076`).
  - *Acentos (IA):* Verde Clínico Elegante o Azul Suave, sin saturar.
- **Whitespace (Aire):** Márgenes generosos, padding de `32px` a `48px`.
- **Ausencia de Bordes:** Separación mediante espaciado y levísimos cambios de fondo, cero sombras pesadas.

### 11. Estrategia IA-First
La IA deja de ser una pestaña. El input de la IA ES la interfaz principal.
- Si escribes: *"Registra paciente Carlos Pérez, teléfono 600..."*, la IA crea la ficha.
- Si escribes: *"Cóbrale la sesión de hoy a Carlos"*, la IA levanta el widget de pago de Stripe/Redsys.
- Si escribes: *"Tiene dolor agudo en el supraespinoso"*, la IA guarda la evolución clínica y sugiere ejercicios.

### 12. Diseño Conversacional Ideal
- **Naturalidad:** Input grande, expansible automáticamente.
- **Markdown Rendering:** Respuestas de la IA formateadas hermosamente (negritas, listas, tablas nativas).
- **Zero-State Inteligente:** Cuando no hay chat activo, mostrar "Atajos de un click" basados en el historial (ej. "Revisar adherencia al plan").

### 13. Componentes Recomendados
Usar **Radix UI** o **shadcn/ui** adaptado:
- `Command` (Paleta de comandos estilo Mac/Linear).
- `Sheet` / `Drawer` (Para mostrar la ficha del paciente solo cuando se pide, superpuesta, sin romper el flujo).
- `Avatar` y `Badge` (Minimalistas y redondeados).
- `ScrollArea` (Unificado).

### 14. Mejoras Prioritarias (Quick Wins)
1. **Desacoplar el Monolito:** Dividir `index.astro` en rutas reales de Astro o usar islas de React/Svelte para la gestión de estado.
2. **Purgar CSS:** Eliminar las 600 líneas de `global-shell.css` llenas de `!important`. Empezar con TailwindCSS limpio.
3. **Unificar Scroll:** Quitar `overflow: auto` de todos los contenedores hijos. Dejar que la ventana principal haga el scroll.
4. **Ocultar el Panel Derecho:** Quitar el `<aside class="assistant-clinical-panel">` del DOM principal y pasarlo a un `Drawer` oculto que solo sale a petición.

### 15. Roadmap de Rediseño (Próximas Sesiones)

**FASE 1: Limpieza Estructural (Arquitectura)**
- Romper `index.astro` en múltiples páginas: `/`, `/pacientes`, `/agenda`, `/finanzas`.
- Migrar el Copiloto IA de un "aside" a una página de `/consulta/[id]` o mantenerlo como overlay global pero que tome el 100% de la pantalla.

**FASE 2: Sistema de Diseño Tailwind / Premium**
- Limpiar `!important` y establecer tokens de diseño en `tailwind.config.js`.
- Aplicar tipografía `Inter/Geist`.
- Eliminar tarjetas redundantes.

**FASE 3: El Nuevo Copiloto (La Revolución)**
- Rediseñar el `AssistantRail.astro` para que sea el Workspace Central.
- Implementar el Input grande conversacional.
- Mostrar planes de ejercicio como componentes renderizados (MDX/Widgets) dentro del chat.

**FASE 4: Microinteracciones y Polish**
- Añadir Framer Motion para transiciones suaves al enviar mensajes o generar el PDF.

### 16. Ideas Diferenciadoras (El Factor "WOW")
- **Timeline Clínica Inteligente:** En lugar de un listado aburrido de fechas, una línea de tiempo visual (estilo GitHub commits) mostrando la evolución del dolor del paciente en las últimas 4 semanas.
- **Generación Visual de Ejercicios:** Al sugerir un ejercicio, mostrar inmediatamente un skeleton o wireframe del músculo implicado, o renders 3D minimalistas (WebGl/Spline).
- **Modo "Zen" Consulta:** Un botón que oculta todo excepto el nombre del paciente y la caja de texto para dictar por voz (Speech-to-text directo a la IA).

### 17. Recomendaciones Frontend Específicas
- **Dejar de usar DOM imperativo:** El código actual depende de `document.getElementById` y ocultar clases. Es urgente introducir un framework de UI (React, Preact, o Svelte) integrado en Astro para gestionar el estado complejo del chat y la UI (Islas de Astro).
- **Zustand / Nanostores:** Para mantener el estado del paciente activo globalmente sin recargar.

### 18. Mejoras para Experiencia Premium
- **Skeleton Loaders:** Nunca mostrar texto "Cargando...". Usar esqueletos animados con colores tenues.
- **Hotkeys (Atajos de Teclado):** `Cmd+Enter` para enviar a la IA. `Cmd+K` para buscar. `Esc` para cerrar modales. Un software profesional se maneja con el teclado.

### 19. Estrategia Mobile / Tablet
- En Tablet (iPad), la IA toma todo el espacio. El menú es una barra inferior (Bottom Tab Bar) estilo iOS.
- El fisioterapeuta a menudo usa una tablet en la camilla. Los botones deben tener un "Touch Target" mínimo de `44x44px`.

### 20. Recomendaciones de Microinteracciones
- El input de texto de la IA debe hacer *auto-grow* suave al escribir.
- Al generar un plan de ejercicios, los ejercicios deben aparecer con un efecto de *stagger fade-in* (apareciendo uno a uno suavemente), demostrando la "inteligencia" en tiempo real (streaming effect).
- Cambio de estado del botón "Generar PDF" con un pequeño morphing del ícono (de un documento a un check verde) al terminar.

---

### CONCLUSIÓN PARA LA PRÓXIMA SESIÓN DE DESARROLLO

Te propongo no hacer más parches CSS. El siguiente paso lógico, técnico y de diseño es **extraer el layout principal de `index.astro`** a componentes limpios, integrar **TailwindCSS** (o CSS Modules sin `!important`), y construir la maqueta del **Workspace Conversacional Central** (el layout tipo ChatGPT/Linear) que reemplace la vista actual del dashboard. 

¿Estás de acuerdo con iniciar la extracción de `index.astro` y aplicar esta nueva arquitectura limpia en la próxima iteración?
