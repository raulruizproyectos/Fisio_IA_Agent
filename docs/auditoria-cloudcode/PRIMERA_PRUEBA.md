# Primera prueba manual

Usa **solo datos ficticios**: «Paciente Prueba Uno», email `prueba1@example.invalid`, sin datos de salud reales. Duración estimada de la parte A: 30–40 minutos.

## A. CRM en producción (puede hacerse ya)

| # | Paso | Resultado esperado | Si falla |
| --- | --- | --- | --- |
| 1 | Entra en https://fisio-frontend.b5xbaf.easypanel.host/login/ con tu cuenta | Inicio con tu clínica | Anota el mensaje; no reintentes más de 3 veces (límite de 10 intentos cada 15 min) |
| 2 | Pacientes → Nuevo paciente «Paciente Prueba Uno» | Aparece una sola vez en la lista tras recargar | Si sale un error pero luego aparece, anótalo; no lo crees de nuevo |
| 3 | Búscalo desde la barra superior | Lo encuentra por nombre | — |
| 4 | Ficha → Notas clínicas: guarda una nota ficticia y marca una zona del mapa corporal | Una sola nota tras recargar. La zona por sí sola no guarda nada | Si la nota no aparece, no la repitas hasta recargar |
| 5 | Agenda → nueva cita para él dentro de 3 días | Cita visible. Si Calendar está conectado, sin el aviso «pendiente» | Si aparece «Calendar pendiente», pulsa «Comprobar Calendar» una vez; no crees otra |
| 6 | Mueve la cita una hora | Cambia la misma cita, sin duplicados en Agenda ni en Google Calendar | Comprueba Google Calendar antes de repetir |
| 7 | Ficha → Resumen: revisa la evolución | Sesiones y notas coherentes con lo creado | — |
| 8 | Planes: genera un plan **solo si autorizas el gasto de IA**. Si no, abre un plan existente del paciente ficticio | Nace «Requiere revisión»; PDF y envío bloqueados hasta aprobar | Si permite PDF sin aprobar, para y comunícalo (sería P0) |
| 9 | Revisa, edita un ejercicio y aprueba (con alertas: justificación de 12 caracteres o más) | Estado «Aprobado» y versión del informe | — |
| 10 | Exporta el PDF | El PDF contiene exactamente lo aprobado | — |
| 11 | Finanzas: registra un pago ficticio y emite una factura | Numeración correlativa sin huecos ni duplicados | No emitas dos veces seguidas si tarda |
| 12 | Anula la cita del paso 5 | Estado «cancelada»; desaparece de Calendar | — |
| 13 | Da de baja al paciente ficticio | Baja confirmada solo si se completa | — |

**No pruebes el bot de pacientes actual con personas reales.** La ruta activa tiene los problemas P0-1 de la auditoría.

## B. Agente de citas (solo después de activarlo)

Necesita los pasos de activación de [AGENTE_CITAS.md](AGENTE_CITAS.md) y un móvil con Telegram propio.

| # | Paso | Resultado esperado |
| --- | --- | --- |
| B1 | Escribe «Hola» al bot desde un Telegram sin vincular | Se presenta como asistente automático y muestra el botón «Compartir mi teléfono». No muestra citas |
| B2 | Comparte tu teléfono y escribe un nombre ficticio con apellido | «Listo» y menú. Ficha nueva en el CRM con la nota de revisar duplicados |
| B3 | Reservar cita → un día laborable → una hora → CONFIRMAR | «Cita confirmada…» o «registrada… calendario pendiente». La cita aparece una sola vez en el CRM |
| B4 | Escribe CONFIRMAR otra vez | «No hay ninguna operación pendiente», sin otra cita |
| B5 | Mis citas | Solo tus citas, con fecha completa |
| B6 | Cambiar cita → otro día → hora → CONFIRMAR | La misma cita cambia de hora (estado «reprogramada») |
| B7 | Crea en el CRM una cita para dentro de 20 horas e intenta anularla desde el bot | Te deriva a la clínica con su teléfono, sin anularla |
| B8 | Anular cita (la de más de 24 h) → CONFIRMAR | «queda anulada». Estado «cancelada» en el CRM y fuera de Calendar |
| B9 | Ficha de otro paciente ficticio → «Preparar invitación» → abre el enlace desde un segundo Telegram | Vinculado. Reusar el mismo código desde otro chat → «no válido» |
| B10 | Escribe BAJA | Canal desactivado. No llegan recordatorios a ese chat |

## Recuperación ante fallos

- **El bot no responde:** no repitas CONFIRMAR. Espera 5 minutos y escribe «Mis citas»: el agente lee el resultado y no duplica nada.
- **«registrada… calendario pendiente»:** en la Agenda del CRM, pulsa «Comprobar Calendar» en esa cita.
- **Mensaje «la clínica lo revisará»:** busca en Supabase `crm_mensajeria_eventos` con estado `revision_manual` y la fecha. No borres registros para desbloquear.

## Cómo comunicar una incidencia

Copia y rellena:

```
Pantalla / paso: (p. ej. A6 Agenda → mover cita)
Qué hice:
Qué esperaba:
Qué ocurrió (texto exacto del mensaje):
Hora aproximada:
Dispositivo y navegador / Telegram:
¿Se repitió al recargar?:
```

No incluyas contraseñas, tokens ni datos de pacientes reales. Las capturas, solo con datos ficticios.
