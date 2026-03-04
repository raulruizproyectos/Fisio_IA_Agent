import { Router } from 'express';
import crypto from 'node:crypto';
import { supabase } from '../index.js';

const router = Router();
const INTENT_CONFIDENCE_THRESHOLD = 0.6;
const APPOINTMENT_WEBHOOK_URL = process.env.N8N_APPOINTMENT_WEBHOOK_URL?.trim() || null;

function pickValue(obj, ...keys) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== '') {
      return obj[key];
    }
  }
  return null;
}

function normalizeCommand(text = '') {
  return text.trim();
}

function formatDuration(durationSecs) {
  if (!durationSecs) return '';
  return ` - ${durationSecs}s`;
}

function parsePainCommand(text) {
  const match = text.match(/^\/dolor\s+(\d{1,2})(?:\s+(.+))?$/i);
  if (!match) return null;
  return { painLevel: Number(match[1]), notes: match[2]?.trim() || null };
}

function parseAppointmentCommand(text) {
  const match = text.match(/^\/cita\s+(\S+)\s+(\S+)(?:\s+(.+))?$/i);
  if (!match) return null;
  return {
    startAt: match[1]?.trim() || null,
    endAt: match[2]?.trim() || null,
    notes: match[3]?.trim() || null,
  };
}

function extractIsoSlots(messageText = '') {
  const matches = messageText.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/g) || [];
  return {
    slotStart: matches[0] || null,
    slotEnd: matches[1] || null,
  };
}

function parseIncomingPayload(body = {}) {
  if (body.chat_id && (body.texto_mensaje || body.message_text)) {
    return {
      chat_id: body.chat_id,
      username: body.username || null,
      texto_mensaje: body.texto_mensaje || body.message_text,
      first_name: body.first_name || null,
      last_name: body.last_name || null,
    };
  }

  const message = body.message || body.edited_message || body.channel_post;
  const chatId = message?.chat?.id;
  const username = message?.from?.username || message?.chat?.username || null;
  const text = message?.text || message?.caption || null;

  if (!chatId || !text) return null;

  return {
    chat_id: chatId,
    username,
    texto_mensaje: text,
    first_name: message?.from?.first_name || null,
    last_name: message?.from?.last_name || null,
  };
}

function isNativeTelegramPayload(body = {}) {
  return Boolean(body.message || body.edited_message || body.channel_post);
}

const RED_FLAG_RULES = [
  { key: 'perdida_fuerza', pattern: /(p[eé]rdida|pierdo).*(fuerza)/i },
  { key: 'esfinteres', pattern: /(esf[ií]nter|orina|incontinencia)/i },
  { key: 'dolor_toracico', pattern: /(dolor).*(pecho|tor[aá]c)/i },
  { key: 'dificultad_respiratoria', pattern: /(falta de aire|dificultad.*respir|ahogo)/i },
  { key: 'deficit_neurologico', pattern: /(hormigueo.*progres|adormecimiento.*progres|par[aá]lisis)/i },
  { key: 'fiebre_alta', pattern: /(fiebre).*(alta|39|40)/i },
  { key: 'dolor_nocturno_severo', pattern: /(dolor).*(noche|nocturno).*(fuerte|severo|intenso)/i },
  { key: 'trauma_reciente', pattern: /(ca[ií]da|golpe|accidente|trauma).*(reciente|hoy|ayer)/i },
];

function detectRedFlags(messageText = '') {
  const redFlags = RED_FLAG_RULES
    .filter((rule) => rule.pattern.test(messageText))
    .map((rule) => rule.key);
  return {
    tiene_alertas_rojas: redFlags.length > 0,
    alertas_rojas: redFlags,
  };
}

async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurado');

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.ok) {
    throw new Error(`Telegram sendMessage fallo: ${JSON.stringify(payload)}`);
  }
}

function isMissingTableError(error) {
  return String(error?.message || '').includes("Could not find the table 'public.vinculos_telegram_pacientes'");
}

async function getDefaultProfessionalId() {
  const configuredId = process.env.DEFAULT_PROFESSIONAL_ID?.trim();
  if (configuredId) return configuredId;

  const { data, error } = await supabase
    .from('profesionales')
    .select('id')
    .order('creado_en', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error('No hay profesionales en Supabase. Crea uno o define DEFAULT_PROFESSIONAL_ID en .env');
  }

  return data.id;
}

function getPatientDisplayName(payload) {
  const fullName = [payload.first_name, payload.last_name].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (payload.username) return `@${payload.username}`;
  return `Paciente Telegram ${payload.chat_id}`;
}

async function autoLinkFirstContact(payload) {
  const professionalId = await getDefaultProfessionalId();
  const fullName = getPatientDisplayName(payload);

  const { data: patient, error: patientError } = await supabase
    .from('pacientes')
    .insert({
      profesional_id: professionalId,
      nombre_completo: fullName,
      phone: null,
      email: null,
      notas_medicas: {
        fuente: 'telegram_auto_onboarding',
        username: payload.username || null,
      },
    })
    .select('id')
    .single();

  if (patientError) throw patientError;

  const linkCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  const { error: linkError } = await supabase
    .from('vinculos_telegram_pacientes')
    .insert({
      paciente_id: patient.id,
      profesional_id: professionalId,
      telegram_chat_id: String(payload.chat_id),
      telegram_username: payload.username || null,
      codigo_vinculacion: linkCode,
      vinculado_en: new Date().toISOString(),
    });

  if (linkError) throw linkError;

  return { patientId: patient.id, fullName };
}

async function getPatientHistorySnapshot(patientId) {
  const [videosResp, notesResp] = await Promise.all([
    supabase
      .from('eventos_visualizacion_video')
      .select('id, tipo_evento, segundos_vistos, secuencia, evento_en, trabajo_video_id')
      .eq('paciente_id', patientId)
      .order('evento_en', { ascending: true })
      .limit(20),
    supabase
      .from('notas_seguimiento_paciente')
      .select('id, texto_nota, fuente, ingesta_vinculada_id, creado_en')
      .eq('paciente_id', patientId)
      .order('creado_en', { ascending: true })
      .limit(20),
  ]);

  if (videosResp.error && !String(videosResp.error.message || '').includes('eventos_visualizacion_video')) {
    throw videosResp.error;
  }
  if (notesResp.error && !String(notesResp.error.message || '').includes('notas_seguimiento_paciente')) {
    throw notesResp.error;
  }

  return {
    videos_vistos: videosResp.data || [],
    notas_seguimiento: notesResp.data || [],
  };
}

async function createIntakeMessage({
  patientId,
  professionalId,
  messageText,
  historySnapshot,
  redFlagResult,
}) {
  const { error } = await supabase.from('mensajes_ingesta_paciente').insert({
    paciente_id: patientId,
    profesional_id: professionalId,
    fuente: 'telegram',
    texto_mensaje: messageText,
    tiene_alertas_rojas: redFlagResult.tiene_alertas_rojas,
    alertas_rojas: redFlagResult.alertas_rojas,
    resumen_historial: historySnapshot,
    estado: 'pendiente_revision',
  });

  if (error && !String(error.message || '').includes('mensajes_ingesta_paciente')) {
    throw error;
  }
}

async function logCrmCommunication(payload) {
  try {
    const { error } = await supabase
      .from('crm_comunicaciones')
      .insert(payload);

    if (error) throw error;
  } catch (error) {
    if (!String(error?.message || '').includes("Could not find the table 'public.crm_comunicaciones'")) {
      console.warn('[telegram] crm_comunicaciones log error:', error.message);
    }
  }
}

async function triggerAppointmentWorkflow({
  patientId,
  professionalId,
  chatId,
  username,
  messageText,
  slotStart = null,
  slotEnd = null,
}) {
  const requestId = crypto.randomUUID();

  if (!APPOINTMENT_WEBHOOK_URL) {
    return {
      ok: false,
      requestId,
      reason: 'missing_webhook',
    };
  }

  const payload = {
    request_id: requestId,
    source: 'telegram',
    channel: 'telegram',
    patient_id: patientId,
    professional_id: professionalId,
    chat_id: String(chatId),
    username: username || null,
    message_text: messageText,
    slot_start: slotStart,
    slot_end: slotEnd,
    timezone: 'Europe/Madrid',
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(APPOINTMENT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        requestId,
        reason: 'http_error',
        statusCode: response.status,
        response: data,
      };
    }

    return {
      ok: true,
      requestId,
      status: data?.status || 'accepted',
      messageToPatient:
        data?.message_to_patient_es ||
        data?.message_to_patient ||
        data?.reply_text ||
        data?.message ||
        '📅 He recibido tu solicitud de cita. En breve te confirmaremos hueco disponible.',
      response: data,
    };
  } catch (error) {
    return {
      ok: false,
      requestId,
      reason: error?.name === 'AbortError' ? 'timeout' : 'fetch_failed',
      errorMessage: error.message,
    };
  }
}

function getHelpMessage() {
  return [
    'Comandos disponibles:',
    '/plan - Ver plan activo',
    '/cita <inicio_iso> <fin_iso> [nota] - Solicitar cita (ej: /cita 2026-03-10T18:00 2026-03-10T18:45)',
    '/dolor <0-10> [nota] - Registrar dolor de hoy',
    '/ayuda - Ver esta ayuda',
  ].join('\n');
}

router.post('/link-code/:patientId', async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const { data: patient, error: patientError } = await supabase
      .from('pacientes')
      .select('id, profesional_id, nombre_completo')
      .eq('id', patientId)
      .single();

    if (patientError) throw patientError;
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

    const linkCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const { data, error } = await supabase
      .from('vinculos_telegram_pacientes')
      .upsert(
        {
          paciente_id: patient.id,
          profesional_id: patient.profesional_id,
          codigo_vinculacion: linkCode,
          telegram_chat_id: null,
          telegram_username: null,
          vinculado_en: null,
        },
        { onConflict: 'paciente_id' }
      )
      .select('paciente_id, codigo_vinculacion')
      .single();

    if (error) throw error;

    res.json({
      data,
      instructions: `Comparte este mensaje con el paciente: /start ${linkCode}`,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/incoming', async (req, res, next) => {
  try {
    const fromTelegramWebhook = isNativeTelegramPayload(req.body);
    const parsedPayload = parseIncomingPayload(req.body);
    if (!parsedPayload) {
      return res.status(400).json({
        error: 'Payload invalido. Envia chat_id + texto_mensaje (o message_text) o el webhook nativo de Telegram',
      });
    }

    const { chat_id, username, texto_mensaje } = parsedPayload;
    const text = normalizeCommand(texto_mensaje);
    const isCommand = text.startsWith('/');

    const reply = async (replyText) => {
      if (fromTelegramWebhook) {
        await sendTelegramMessage(chat_id, replyText);
        return res.status(200).json({ ok: true });
      }
      return res.json({ reply_text: replyText });
    };

    if (text.toLowerCase().startsWith('/start')) {
      const [, rawCode] = text.split(/\s+/);
      const code = rawCode?.trim()?.toUpperCase();

      if (!code) {
        return await reply('Falta el codigo de vinculacion. Usa: /start CODIGO');
      }

      const { data: link, error: linkError } = await supabase
        .from('vinculos_telegram_pacientes')
        .select('id, paciente_id, pacientes(nombre_completo)')
        .eq('codigo_vinculacion', code)
        .single();

      if (linkError || !link) {
        return await reply('Codigo invalido o expirado. Pide uno nuevo a tu fisio.');
      }

      const { error: updateError } = await supabase
        .from('vinculos_telegram_pacientes')
        .update({
          telegram_chat_id: String(chat_id),
          telegram_username: username || null,
          vinculado_en: new Date().toISOString(),
        })
        .eq('id', link.id);

      if (updateError) throw updateError;

      const patientName = link.pacientes?.nombre_completo || 'paciente';
      return await reply(`Vinculacion completada para ${patientName}.\n\n${getHelpMessage()}`);
    }

    const { data: link, error: linkError } = await supabase
      .from('vinculos_telegram_pacientes')
      .select('paciente_id')
      .eq('telegram_chat_id', String(chat_id))
      .maybeSingle();

    if (isMissingTableError(linkError)) {
      return await reply(
        'Falta configurar la base de datos: tabla vinculos_telegram_pacientes no existe. Ejecuta la migracion SQL y vuelve a intentarlo.'
      );
    }

    if (linkError) throw linkError;

    if (!link) {
      const onboarding = await autoLinkFirstContact(parsedPayload);
      const professionalId = await getDefaultProfessionalId();
      const historySnapshot = await getPatientHistorySnapshot(onboarding.patientId);
      const redFlagResult = detectRedFlags(text);

      await createIntakeMessage({
        patientId: onboarding.patientId,
        professionalId,
        messageText: text,
        historySnapshot,
        redFlagResult,
      });

      if (redFlagResult.tiene_alertas_rojas) {
        return await reply('He detectado señales de alerta. Contacta con tu fisioterapeuta hoy mismo o con urgencias si empeoras.');
      }

      return await reply(
        `Bienvenido/a ${onboarding.fullName}. Ya he creado tu ficha y enviado tus síntomas al fisioterapeuta para revisión.\n\n${getHelpMessage()}`
      );
    }

    if (!isCommand) {
      const professionalId = await getDefaultProfessionalId();
      const historySnapshot = await getPatientHistorySnapshot(link.paciente_id);
      const redFlagResult = detectRedFlags(text);

      // W0: Intent classification via Edge Function
      let intent = { route: 'unknown', confidence: 0 };
      try {
        const routerUrl = `${process.env.SUPABASE_URL}/functions/v1/intent-router`;
        const routerResp = await fetch(routerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_text: text, request_id: crypto.randomUUID() }),
          signal: AbortSignal.timeout(8000),
        });
        if (routerResp.ok) {
          intent = await routerResp.json();
        }
      } catch (routerErr) {
        console.warn('[telegram] W0 intent-router error:', routerErr.message);
      }

      // Always create intake for tracking
      await createIntakeMessage({
        patientId: link.paciente_id,
        professionalId,
        messageText: text,
        historySnapshot,
        redFlagResult,
      });

      if (redFlagResult.tiene_alertas_rojas) {
        return await reply('⚠️ He detectado señales de alerta. Contacta con tu fisioterapeuta hoy mismo o con urgencias si empeoras.');
      }

      // W2: If intent is exercise with decent confidence, auto-recommend
      if (intent.route === 'exercise' && intent.confidence >= INTENT_CONFIDENCE_THRESHOLD) {
        try {
          const exerciseUrl = `${process.env.SUPABASE_URL}/functions/v1/exercise-recommend`;
          const { data: catalog } = await supabase
            .from('crm_ejercicios_catalogo')
            .select('id, nombre, descripcion, zona_corporal, nivel, contraindicaciones, metadata')
            .eq('activo', true);

          const recoResp = await fetch(exerciseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              request_id: crypto.randomUUID(),
              patient_id: link.paciente_id,
              symptoms: text,
              catalog: (catalog || []).map(e => ({
                id: e.id, nombre: e.nombre, descripcion: e.descripcion,
                zona_corporal: e.zona_corporal, nivel: e.nivel,
                contraindicaciones: e.contraindicaciones,
                fase: e.metadata?.fase_original || null,
                series: e.metadata?.series_defecto || 3,
                repeticiones: e.metadata?.repeticiones_defecto || 10,
              })),
            }),
            signal: AbortSignal.timeout(25000),
          });

          if (recoResp.ok) {
            const recoData = await recoResp.json();
            const reco = recoData.recommendation || recoData;
            const patientMsg = reco.message_to_patient_es;

            if (patientMsg) {
              // Store recommendation in CRM
              const { data: recoRow } = await supabase.from('crm_recomendaciones').insert({
                paciente_id: link.paciente_id,
                fisioterapeuta_id: null,
                origen: 'telegram',
                symptom_summary: reco.symptom_summary || text,
                red_flags_present: reco.red_flags_present || false,
                red_flags_items: reco.red_flags_items || [],
                selection_rationale: reco.selection_rationale || '',
                message_to_patient_es: patientMsg,
                message_to_therapist_es: reco.message_to_therapist_es || '',
                escalation_recommend_medical_attention: reco.escalation_recommend_medical_attention || false,
                escalation_reason: reco.escalation_reason || '',
                estado: reco.escalation_recommend_medical_attention ? 'requiere_revision' : 'generada',
              }).select('id').single();

              if (recoRow && reco.selected_exercises?.length) {
                await supabase.from('crm_recomendacion_items').insert(
                  reco.selected_exercises.map((ex, idx) => ({
                    recomendacion_id: recoRow.id,
                    ejercicio_id: ex.exercise_id || ex.id,
                    confidence: ex.confidence || 0.8,
                    why: ex.why || '',
                    cautions: ex.cautions || [],
                    orden: idx + 1,
                  }))
                );
              }

              return await reply(patientMsg);
            }
          }
        } catch (exErr) {
          console.warn('[telegram] W2 exercise auto-recommend error:', exErr.message);
        }
      }

      // W1: appointment intent detected, trigger dedicated n8n workflow if configured.
      if (intent.route === 'appointment' && intent.confidence >= INTENT_CONFIDENCE_THRESHOLD) {
        const { slotStart, slotEnd } = extractIsoSlots(text);
        const appointment = await triggerAppointmentWorkflow({
          patientId: link.paciente_id,
          professionalId,
          chatId: chat_id,
          username,
          messageText: text,
          slotStart,
          slotEnd,
        });

        await logCrmCommunication({
          channel: 'telegram',
          direction: 'internal',
          message_type: 'event',
          message_text: appointment.ok
            ? 'Solicitud de cita enviada a workflow W1'
            : 'Error al enviar solicitud de cita a workflow W1',
          payload: {
            legacy_patient_id: link.paciente_id,
            legacy_profesional_id: professionalId,
            chat_id: String(chat_id),
            route: intent.route,
            confidence: intent.confidence,
            detail: appointment,
          },
          request_id: appointment.requestId,
          status: appointment.ok ? 'processed' : 'error',
        });

        if (appointment.ok) {
          return await reply(appointment.messageToPatient);
        }

        return await reply(
          '📅 He recibido tu solicitud de cita. Nuestro equipo la revisará y te confirmará disponibilidad lo antes posible.'
        );
      }

      // Default: intake created, generic reply
      return await reply('Mensaje recibido. Tu fisioterapeuta revisará tus síntomas y te pautará el siguiente ejercicio.');
    }

    if (text.toLowerCase() === '/ayuda') {
      return await reply(getHelpMessage());
    }

    if (text.toLowerCase() === '/plan') {
      const { data: planActivo, error: planActivoError } = await supabase
        .from('planes')
        .select('id, titulo, fecha_inicio, fecha_fin')
        .eq('paciente_id', link.paciente_id)
        .eq('estado', 'activo')
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planActivoError) throw planActivoError;
      if (!planActivo) return await reply('No tienes un plan activo ahora mismo.');

      const { data: items, error: itemsError } = await supabase
        .from('items_plan')
        .select('indice_orden, series, repeticiones, duracion_segundos, ejercicios(nombre)')
        .eq('plan_id', planActivo.id)
        .order('indice_orden', { ascending: true });

      if (itemsError) throw itemsError;

      const lines = (items || []).map((item, idx) => {
        const exerciseName = item.ejercicios?.nombre || 'Ejercicio';
        return `${idx + 1}. ${exerciseName} - ${item.series}x${item.repeticiones}${formatDuration(item.duracion_segundos)}`;
      });

      const planSummary = [
        `Plan activo: ${planActivo.titulo}`,
        `Periodo: ${planActivo.fecha_inicio || '-'} a ${planActivo.fecha_fin || '-'}`,
        '',
        ...(lines.length ? lines : ['No hay ejercicios cargados en este plan.']),
      ].join('\n');

      return await reply(planSummary);
    }

    const painCommand = parsePainCommand(text);
    if (painCommand) {
      if (painCommand.painLevel < 0 || painCommand.painLevel > 10) {
        return await reply('El dolor debe estar entre 0 y 10.');
      }

      const { data: planActivo, error: planActivoError } = await supabase
        .from('planes')
        .select('id')
        .eq('paciente_id', link.paciente_id)
        .eq('estado', 'activo')
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planActivoError) throw planActivoError;
      if (!planActivo) return await reply('No tienes plan activo para registrar dolor.');

      const { error: sesionError } = await supabase.from('sesiones').insert({
        paciente_id: link.paciente_id,
        plan_id: planActivo.id,
        fecha_sesion: new Date().toISOString().slice(0, 10),
        nivel_dolor: painCommand.painLevel,
        notas: painCommand.notes,
        estado_completado: 'parcial',
      });

      if (sesionError) throw sesionError;

      return await reply(`Dolor registrado: ${painCommand.painLevel}/10. Gracias, se lo notificaremos a tu fisioterapeuta.`);
    }

    const appointmentCommand = parseAppointmentCommand(text);
    if (appointmentCommand) {
      const professionalId = await getDefaultProfessionalId();
      const startDate = new Date(appointmentCommand.startAt || '');
      const endDate = new Date(appointmentCommand.endAt || '');

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return await reply('Formato de cita invalido. Usa: /cita 2026-03-10T18:00 2026-03-10T18:45 [nota opcional]');
      }

      if (endDate.getTime() <= startDate.getTime()) {
        return await reply('La hora de fin debe ser posterior a la de inicio.');
      }

      const appointment = await triggerAppointmentWorkflow({
        patientId: link.paciente_id,
        professionalId,
        chatId: chat_id,
        username,
        messageText: appointmentCommand.notes || text,
        slotStart: startDate.toISOString(),
        slotEnd: endDate.toISOString(),
      });

      await logCrmCommunication({
        channel: 'telegram',
        direction: 'internal',
        message_type: 'event',
        message_text: appointment.ok
          ? 'Solicitud de cita enviada por comando /cita'
          : 'Error al enviar solicitud /cita',
        payload: {
          legacy_patient_id: link.paciente_id,
          legacy_profesional_id: professionalId,
          chat_id: String(chat_id),
          slot_start: startDate.toISOString(),
          slot_end: endDate.toISOString(),
          detail: appointment,
        },
        request_id: appointment.requestId,
        status: appointment.ok ? 'processed' : 'error',
      });

      if (appointment.ok) {
        return await reply(appointment.messageToPatient);
      }

      return await reply('📅 He recibido tu solicitud de cita. Nuestro equipo la revisará y te confirmará disponibilidad lo antes posible.');
    }

    return await reply(`No reconozco ese comando.\n\n${getHelpMessage()}`);
  } catch (err) {
    next(err);
  }
});

export default router;
