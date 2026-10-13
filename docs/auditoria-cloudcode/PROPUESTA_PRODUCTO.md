# Propuesta de producto

Propuestas para revisar **antes de implementarlas**. La identidad Precisión azul se mantiene. Formato de cada propuesta:

**pantalla/elemento → problema → cambio → beneficio → riesgo → comprobación**

Base: código actual, capturas ficticias de la ficha (1280 y 375 px) y recorridos descritos en la documentación. No se navegó por el CRM con un backend local en esta sesión; donde una propuesta depende de una observación en vivo se indica.

## 1. Ficha del paciente (tarea: preparar y registrar una sesión)

**1.1 Acciones duplicadas en la cabecera**
- **Problema.** En escritorio conviven tres entradas al copiloto (barra superior, botón principal de la ficha y «Nuevo plan con IA» en la barra lateral) y dos a Agenda (barra superior y ficha). La acción más destacada de la ficha es «Registrar por voz», arriba a la derecha y **por encima** del nombre del paciente. Registrar la sesión escrita está en la pestaña «Notas clínicas».
- **Cambio.**
  - Barra de acciones de la ficha: un solo botón principal, **«Registrar sesión»**, que abre la nota con el dictado como opción interna.
  - Secundarias: «Nueva cita» (con el paciente ya elegido) y «Plan de ejercicios».
  - Fuera de la cabecera de la ficha: «Agenda» y «Copiloto». Ya están en la barra superior.
- **Beneficio.** Un clic menos y una sola decisión por pantalla. La tarea más frecuente queda primera.
- **Riesgo.** Hay que mantener los IDs y atributos `data-*` existentes: reubicar, no renombrar.
- **Comprobación.** Contar clics para «abrir ficha → nota guardada» (ahora: pestaña + formulario; objetivo: 1 + formulario) y regresión DOM.

**1.2 Identidad primero en móvil**
- **Problema.** A 375 px, «Registrar por voz» y «Editar datos» ocupan la primera pantalla y el nombre aparece unos 200 px más abajo.
- **Cambio.** Orden en móvil: nombre y estado → próxima cita → acción principal. «Editar datos» pasa al menú «⋯».
- **Beneficio.** Confirmar que es el paciente correcto antes de actuar (seguridad clínica).
- **Riesgo.** Bajo.
- **Comprobación.** Captura a 375 px con el nombre visible sin desplazar.

**1.3 Próxima cita en la cabecera**
- **Problema.** La cabecera muestra contacto y «Sin datos clave», pero no la próxima cita ni su estado de Calendar.
- **Cambio.** Línea «Próxima cita: jueves 15, 10:00 · confirmada» o «Sin próxima cita · Programar».
- **Beneficio.** Evita ir a Agenda para la pregunta más habitual.
- **Riesgo.** Una lectura más. Reutilizar las citas ya cargadas en la ficha.
- **Comprobación.** Prueba de render con cita, sin cita y con Calendar pendiente.

**1.4 Vínculo Telegram en la ficha**
- **Problema.** El bloque usa el código heredado reutilizable (P1-1).
- **Cambio.** Ya resuelto en el backend con el agente activo. Además, en la interfaz: mostrar «Caduca en 30 min · un solo uso» y el estado «Baja del canal» cuando llegue `baja_en`.
- **Comprobación.** Las pruebas del backend ya cubren el contrato.

**1.5 Textos y cifras**
- **Problema.** Faltan tildes: «telefono», «evolucion», «Todavia», «invitacion», «codigo». Importes «0.00 EUR».
- **Cambio.** Corregir textos y usar `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`.
- **Beneficio.** Percepción profesional.
- **Riesgo.** Ninguno funcional.
- **Comprobación.** Búsqueda de las cadenas y captura.

## 2. Mapa corporal

- **Problema.** El rótulo «Lectura evolutiva» aparece aunque no haya datos. Es un selector esquemático con seis zonas.
- **Cambio.** Sin datos, rótulo «Sin registros de dolor». Con datos, mostrar fecha e intensidad de la última marca por zona. Mantener el aviso de que es una selección esquemática, no una localización anatómica precisa.
- **Beneficio.** No sugerir una evolución inexistente.
- **Riesgo.** Ninguno.
- **Comprobación.** Render con y sin registros.

## 3. Evolución (tarea: consultar la evolución)

- **Problema.** La evolución se lee en tarjetas y textos. No hay gráfico de dolor o función a lo largo de las sesiones.
- **Cambio.** Un *sparkline* SVG nativo (sin librería) del dolor EVA por sesión en «Resumen de caso», con valores en texto accesible (`<title>` y tabla oculta para lectores).
- **Beneficio.** Tendencia visible en 2 segundos.
- **Riesgo.** No inferir mejoría clínica: solo representar los valores registrados.
- **Comprobación.** Prueba con 0, 1 y 12 sesiones; lector de pantalla.

## 4. Agenda (tarea: gestionar una cita)

- **Problema.** Las citas creadas o cambiadas por el agente se distinguen solo por `canal_origen`.
- **Cambio.** Insignia «Telegram» en la tarjeta de cita y filtro «Cambios del asistente (últimas 24 h)».
- **Beneficio.** La clínica ve a primera vista lo que ha hecho el agente.
- **Riesgo.** Bajo.
- **Comprobación.** Render con los tres canales.

## 5. Planes y copiloto (tarea: crear o revisar un plan)

- **Problema.** La documentación muestra correctamente los estados «generado / guardado / requiere revisión / aprobado / enviado». No consta en pantalla **qué motor y versión** lo generaron (P1-3).
- **Cambio.** Línea discreta en el informe: «Generado con {motor} · prompt {versión} · {fecha}», y «Plan de respaldo (reglas)» cuando `fallback_used`.
- **Beneficio.** Trazabilidad clínica.
- **Riesgo.** Requiere el cambio del backend P1-3.
- **Comprobación.** El informe con y sin respaldo.

## 6. Login y reserva pública

Sin defectos funcionales observados en esta sesión. La reserva pública comparte el cálculo de huecos optimizado (P2-1), con menos espera al elegir un día.

## 7. Recursos de diseño (selección)

Coincido con el estudio del 13-oct en lo esencial. Mi selección para este producto:

| Uso | Recurso | Por qué |
| --- | --- | --- |
| Patrones de pestañas, diálogos y estados | Component Gallery, Refero Styles | Comparar comportamientos de sistemas maduros sin importar código |
| Microinteracciones ya aplicadas | MicroKit, Motion Primitives (como patrón) | Ya inspiraron la pestaña deslizante y los paneles. No hace falta nada más |
| Estructura de componentes | shadcn/ui (solo como referencia) | Su instalación en Astro requiere React: no compensa |
| Estados vacíos | Kitbitz (CC0), con un único estilo | Solo si se diseña un estado vacío concreto; revisar peso y licencia |

**Descartados para el trabajo clínico:**
- Aceternity, Magic UI, Liquid Glass, Text Effects y Gradient Buttons: efectos de marketing que dificultan la lectura.
- 3dicons: mezcla estilos con Material Symbols.
- Anime.js: CSS y Web Animations bastan.
- mapcn: sin necesidad de mapas.
- 21st.dev, UIAble y VibePrompts: capa React o prompts; aportan poco a un producto ya construido.
- Jiro, Minimal Gallery, AppShot, Kage y DESIGNmd: inspiración puntual para el acceso o el futuro sitio comercial.
- Circle Loaders: como mucho un indicador estático y accesible.

No se volvieron a abrir las 25 webs en esta sesión. Licencias y requisitos se toman del estudio previo y deben confirmarse antes de incorporar cualquier recurso.

## 8. Automatizaciones con n8n

Principio: **n8n orquesta, el backend decide.** n8n se encarga de disparadores, horarios, transporte y avisos. Permisos, reglas de negocio y estado quedan en la API, con pruebas y RLS. Así se aprovecha n8n sin duplicar reglas en nodos difíciles de probar.

| Prioridad | Automatización | Diseño | Beneficio | Coste/riesgo |
| --- | --- | --- | --- | --- |
| 1 | **Bot paciente → agente de citas** | Ya preparado: `pendiente-activacion/bot-pacientes.json` | Retira el P0-1 | Activación autorizada |
| 2 | **Aviso a la clínica cuando el agente deriva o queda en revisión** | El backend publica un evento en un webhook n8n (Header Auth). n8n avisa al fisio por el bot profesional de Telegram con un enlace a la cita, sin datos clínicos | Nadie se queda sin respuesta | Bajo. El agente solo dirá «la clínica ha sido avisada» cuando n8n confirme el envío |
| 3 | **Resumen diario de agenda** (7:30, laborables) | Programador n8n → `GET` interno de citas del día → mensaje al fisio | Preparar el día sin abrir el CRM | Bajo; un mensaje al día |
| 4 | **Citas sin confirmar / Calendar pendiente** | Programador n8n cada hora → endpoint de lectura → aviso si hay `calendar_sync_pending` de más de 15 min | Detecta desincronizaciones | Bajo |
| 5 | **Seguimiento tras ausencia (no_show)** | Al marcar `no_show`, n8n propone al paciente vinculado reservar de nuevo (mensaje revisable) | Recupera sesiones perdidas | Necesita tu decisión sobre el texto y si es automático |
| 6 | **Reactivación** (pacientes sin próxima cita tras N días) | Programador semanal → lista para el fisio, **no** mensaje automático al paciente | Continuidad del tratamiento | Envíos a pacientes solo con consentimiento |
| 7 | **Bonos por agotarse / pagos pendientes** | Programador semanal → lista para la clínica | Ingresos | Bajo |
| Futuro | **Agente de llamadas** | Proveedor de voz (p. ej. Twilio, Vapi o Retell) → n8n → las mismas funciones del agente de citas (`handlePatientMessage`) | Atiende a quien no usa Telegram | Coste por minuto, latencia, consentimiento de grabación y RGPD. Requiere presupuesto y autorización |
| Futuro | **WhatsApp** | API oficial de Meta (plantillas de recordatorio) → n8n → misma lógica | Canal más usado | Coste por conversación y verificación de negocio |

Para 2, 3 y 4 hace falta un endpoint de backend pequeño por automatización y un flujo n8n con webhook protegido. Se pueden implementar en local en una sesión siguiente si lo apruebas.
