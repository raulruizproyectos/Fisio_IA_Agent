import { Router } from 'express';
import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import { supabase } from '../index.js';
import { resolveAgentConversation } from './agent.js';

const router = Router();
const INTENT_CONFIDENCE_THRESHOLD = 0.6;
const APPOINTMENT_WEBHOOK_URL = process.env.N8N_APPOINTMENT_WEBHOOK_URL?.trim() || null;
const TELEGRAM_PATIENT_BOT_USERNAME = String(process.env.TELEGRAM_PATIENT_BOT_USERNAME || 'fisioterapia_CarlaJL')
  .replace(/^@/, '')
  .toLowerCase();
const TELEGRAM_PHYSIO_BOT_USERNAME = String(process.env.TELEGRAM_PHYSIO_BOT_USERNAME || 'FisioIA_Agent_bot')
  .replace(/^@/, '')
  .toLowerCase();
const TELEGRAM_PATIENT_BOT_TOKEN = process.env.TELEGRAM_PATIENT_BOT_TOKEN?.trim() || null;
const TELEGRAM_PHYSIO_BOT_TOKEN = process.env.TELEGRAM_PHYSIO_BOT_TOKEN?.trim() || null;

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

function parsePhysioReportCommand(text) {
  const withPipe = text.match(/^\/informe\s+([a-f0-9-]{8,})\s*\|\s*(.+)$/i);
  if (withPipe) {
    return {
      patientId: withPipe[1]?.trim() || null,
      symptoms: withPipe[2]?.trim() || null,
    };
  }

  const withSemicolon = text.match(/^\/informe\s+([a-f0-9-]{8,})\s+(.+)$/i);
  if (!withSemicolon) return null;
  return {
    patientId: withSemicolon[1]?.trim() || null,
    symptoms: withSemicolon[2]?.trim() || null,
  };
}

function getPhysioHelpMessage() {
  return [
    'Comandos (bot fisio):',
    '/informe <paciente_id> | <sintomas> - genera recomendacion y PDF',
    'Ejemplo:',
    '/informe 11111111-2222-3333-4444-555555555555 | Dolor cervical al girar cuello desde hace 3 dias',
  ].join('\n');
}

function extractIsoSlots(messageText = '') {
  const matches = messageText.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/g) || [];
  return {
    slotStart: matches[0] || null,
    slotEnd: matches[1] || null,
  };
}

function truncateTelegramMessage(text = '', maxLen = 3900) {
  const clean = String(text || '').trim();
  if (!clean) return '';
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 3)}...`;
}

function detectTelegramAgentMode(payload = {}) {
  const explicitMode = String(payload.agent_mode || payload.bot_mode || '').trim().toLowerCase();
  if (explicitMode === 'patient_appointments' || explicitMode === 'physio_reports') {
    return explicitMode;
  }

  const botUsername = String(payload.bot_username || '').replace(/^@/, '').toLowerCase();
  if (botUsername && botUsername === TELEGRAM_PATIENT_BOT_USERNAME) return 'patient_appointments';
  if (botUsername && botUsername === TELEGRAM_PHYSIO_BOT_USERNAME) return 'physio_reports';
  return 'legacy';
}

function inferIntentFromText(messageText = '') {
  const text = String(messageText || '').toLowerCase();
  if (!text) return { route: 'unknown', confidence: 0.2 };
  if (/\b(cita|agendar|agenda|reservar|reserva|hueco|hora|calendario)\b/.test(text)) {
    return { route: 'appointment', confidence: 0.85 };
  }
  if (/\b(ejercicio|estiramiento|rutina|movilidad|fortalecimiento|rehabilit)\b/.test(text)) {
    return { route: 'exercise', confidence: 0.8 };
  }
  if (/\b(dolor|sintoma|sintomas|molestia|lesion|evolucion|seguimiento)\b/.test(text)) {
    return { route: 'session_note', confidence: 0.72 };
  }
  return { route: 'unknown', confidence: 0.4 };
}

function buildTelegramExerciseFallback(payload = {}) {
  const exercises = Array.isArray(payload.exercises) ? payload.exercises : [];
  const lines = [];

  if (payload.red_flags?.present) {
    lines.push('âš ï¸ Se detectaron alertas. Valora consulta mÃ©dica antes de continuar.');
    lines.push('');
  }

  lines.push(`âœ… Informe de ejercicios (${exercises.length})`);
  lines.push('');

  exercises.forEach((ex, idx) => {
    const order = ex.orden || idx + 1;
    lines.push(`${order}. ${ex.nombre || 'Ejercicio'} (${ex.zona_corporal || 'general'})`);
    if (ex.procedimiento) lines.push(`   Procedimiento: ${Array.isArray(ex.procedimiento) ? ex.procedimiento.join(' ') : ex.procedimiento}`);
    if (ex.imagen_url) lines.push(`   Imagen: ${ex.imagen_url}`);
    if (ex.why) lines.push(`   Motivo: ${ex.why}`);
  });

  if (payload.message_to_patient) {
    lines.push('');
    lines.push(payload.message_to_patient);
  }

  return lines.join('\n').trim();
}

function parseIncomingPayload(body = {}) {
  if (body.chat_id && (body.texto_mensaje || body.message_text)) {
    return {
      chat_id: body.chat_id,
      username: body.username || null,
      texto_mensaje: body.texto_mensaje || body.message_text,
      first_name: body.first_name || null,
      last_name: body.last_name || null,
      bot_username: body.bot_username || null,
      agent_mode: body.agent_mode || null,
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
    bot_username: body.bot_username || null,
    agent_mode: body.agent_mode || null,
  };
}

function isNativeTelegramPayload(body = {}) {
  return Boolean(body.message || body.edited_message || body.channel_post);
}

const RED_FLAG_RULES = [
  { key: 'perdida_fuerza', pattern: /(p[eÃ©]rdida|pierdo).*(fuerza)/i },
  { key: 'esfinteres', pattern: /(esf[iÃ­]nter|orina|incontinencia)/i },
  { key: 'dolor_toracico', pattern: /(dolor).*(pecho|tor[aÃ¡]c)/i },
  { key: 'dificultad_respiratoria', pattern: /(falta de aire|dificultad.*respir|ahogo)/i },
  { key: 'deficit_neurologico', pattern: /(hormigueo.*progres|adormecimiento.*progres|par[aÃ¡]lisis)/i },
  { key: 'fiebre_alta', pattern: /(fiebre).*(alta|39|40)/i },
  { key: 'dolor_nocturno_severo', pattern: /(dolor).*(noche|nocturno).*(fuerte|severo|intenso)/i },
  { key: 'trauma_reciente', pattern: /(ca[iÃ­]da|golpe|accidente|trauma).*(reciente|hoy|ayer)/i },
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

function resolveTelegramToken(agentMode = 'legacy') {
  if (agentMode === 'patient_appointments') {
    return TELEGRAM_PATIENT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || null;
  }
  if (agentMode === 'physio_reports') {
    return TELEGRAM_PHYSIO_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || null;
  }
  return process.env.TELEGRAM_BOT_TOKEN || TELEGRAM_PATIENT_BOT_TOKEN || TELEGRAM_PHYSIO_BOT_TOKEN || null;
}

async function sendTelegramMessage(chatId, text, agentMode = 'legacy') {
  const token = resolveTelegramToken(agentMode);
  if (!token) throw new Error('No hay token Telegram configurado para este agente');

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

async function sendTelegramDocument({ chatId, filename, buffer, caption = '', agentMode = 'legacy' }) {
  const token = resolveTelegramToken(agentMode);
  if (!token) throw new Error('No hay token Telegram configurado para envio de PDF');
  if (!buffer || !buffer.length) throw new Error('Buffer PDF vacio');

  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) form.append('caption', truncateTelegramMessage(caption, 900));
  form.append('document', new Blob([buffer], { type: 'application/pdf' }), filename || 'informe-ejercicios.pdf');

  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: form,
  });

  const payload = await response.json();
  if (!response.ok || !payload?.ok) {
    throw new Error(`Telegram sendDocument fallo: ${JSON.stringify(payload)}`);
  }
}

async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const arr = await response.arrayBuffer();
    return Buffer.from(arr);
  } catch {
    return null;
  }
}

async function buildExerciseReportPdfBuffer(payload = {}) {
  return await new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const exercises = Array.isArray(payload.exercises) ? payload.exercises : [];
      const dateText = new Date().toLocaleString('es-ES');

      doc.fontSize(18).text('Informe de Ejercicios - Fisio IA Agent', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Fecha: ${dateText}`);
      doc.text(`ID recomendacion: ${payload.recommendation_id || '-'}`);
      doc.text(`Paciente: ${payload.patient_id || '-'}`);
      doc.moveDown(0.5);

      doc.fontSize(12).text('Resumen clinico', { underline: true });
      doc.fontSize(10).text(`Sintomas: ${payload.symptom_summary || 'No informado'}`);
      doc.text(`Razon de seleccion: ${payload.selection_rationale || '-'}`);
      const redFlags = Array.isArray(payload?.red_flags?.items) ? payload.red_flags.items.join(', ') : '';
      doc.text(`Alertas: ${payload?.red_flags?.present ? 'Si' : 'No'}${redFlags ? ` (${redFlags})` : ''}`);
      doc.moveDown(0.5);

      doc.fontSize(12).text(`Rutina (${exercises.length} ejercicios)`, { underline: true });
      doc.moveDown(0.2);

      for (let idx = 0; idx < exercises.length; idx += 1) {
        const ex = exercises[idx] || {};
        doc.fontSize(11).text(`${idx + 1}. ${ex.nombre || 'Ejercicio'} (${ex.zona_corporal || 'general'})`, {
          continued: false,
        });
        doc.fontSize(10);
        const pauta = [
          ex.series ? `Series ${ex.series}` : null,
          ex.repeticiones ? `Repeticiones ${ex.repeticiones}` : null,
          ex.duracion_segundos ? `Duracion ${ex.duracion_segundos}s` : null,
        ].filter(Boolean).join(' | ');
        if (pauta) doc.text(`Pauta: ${pauta}`);
        if (ex.procedimiento) {
          const procedimiento = Array.isArray(ex.procedimiento) ? ex.procedimiento.join(' ') : String(ex.procedimiento);
          doc.text(`Procedimiento: ${procedimiento}`);
        }
        if (ex.why) doc.text(`Motivo: ${ex.why}`);
        if (Array.isArray(ex.cautions) && ex.cautions.length) doc.text(`Cautelas: ${ex.cautions.join('; ')}`);

        if (ex.imagen_url) {
          const imageBuffer = await fetchImageBuffer(ex.imagen_url);
          if (imageBuffer) {
            const currentY = doc.y;
            if (currentY > 700) doc.addPage();
            try {
              doc.image(imageBuffer, {
                fit: [180, 110],
                align: 'left',
              });
              doc.moveDown(0.4);
            } catch {
              doc.text(`Imagen: ${ex.imagen_url}`);
            }
          } else {
            doc.text(`Imagen: ${ex.imagen_url}`);
          }
        }

        doc.moveDown(0.7);
        if (doc.y > 740 && idx < exercises.length - 1) doc.addPage();
      }

      doc.fontSize(12).text('Mensajes', { underline: true });
      doc.fontSize(10).text(`Paciente: ${payload.message_to_patient || '-'}`);
      doc.text(`Fisioterapeuta: ${payload.message_to_therapist || '-'}`);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
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
  const notesResp = await supabase
    .from('notas_seguimiento_paciente')
    .select('id, texto_nota, fuente, ingesta_vinculada_id, creado_en')
    .eq('paciente_id', patientId)
    .order('creado_en', { ascending: true })
    .limit(20);

  if (notesResp.error && !String(notesResp.error.message || '').includes('notas_seguimiento_paciente')) {
    throw notesResp.error;
  }

  return {
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

async function createAppointmentDirectFallback({
  req,
  requestId,
  patientId,
  professionalId,
  chatId,
  messageText,
  slotStart,
  slotEnd,
}) {
  if (!req || !slotStart || !slotEnd) {
    return {
      ok: false,
      requestId,
      reason: 'missing_slot_or_context',
    };
  }

  try {
    const internalUrl = `${req.protocol}://${req.get('host')}/api/profesional/appointments`;
    const response = await fetch(internalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paciente_id: patientId,
        fisioterapeuta_id: professionalId,
        inicio_en: slotStart,
        fin_en: slotEnd,
        motivo: messageText || 'Solicitud desde Telegram',
        status: 'pendiente',
        canal_origen: 'telegram',
        source: 'telegram',
        metadata: {
          telegram_chat_id: String(chatId || ''),
          origin: 'telegram_direct_fallback',
        },
      }),
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
        reason: 'direct_create_http_error',
        statusCode: response.status,
        response: data,
      };
    }

    return {
      ok: true,
      requestId,
      status: 'created_direct',
      fallbackUsed: true,
      appointment: data?.data || null,
      messageToPatient:
        'Cita registrada correctamente. Te confirmaremos cualquier ajuste y tambiÃ©n la verÃ¡s en el CRM.',
      response: data,
    };
  } catch (error) {
    return {
      ok: false,
      requestId,
      reason: error?.name === 'AbortError' ? 'direct_create_timeout' : 'direct_create_failed',
      errorMessage: error.message,
    };
  }
}

async function triggerAppointmentWorkflow({
  req,
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
    const directFallback = await createAppointmentDirectFallback({
      req,
      requestId,
      patientId,
      professionalId,
      chatId,
      messageText,
      slotStart,
      slotEnd,
    });
    if (directFallback.ok) return directFallback;

    return {
      ok: false,
      requestId,
      reason: directFallback.reason || 'missing_webhook',
      fallback: directFallback,
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
      const directFallback = await createAppointmentDirectFallback({
        req,
        requestId,
        patientId,
        professionalId,
        chatId,
        messageText,
        slotStart,
        slotEnd,
      });
      if (directFallback.ok) return directFallback;

      return {
        ok: false,
        requestId,
        reason: 'http_error',
        statusCode: response.status,
        response: data,
        fallback: directFallback,
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
        'ðŸ“… He recibido tu solicitud de cita. En breve te confirmaremos hueco disponible.',
      response: data,
    };
  } catch (error) {
    const directFallback = await createAppointmentDirectFallback({
      req,
      requestId,
      patientId,
      professionalId,
      chatId,
      messageText,
      slotStart,
      slotEnd,
    });
    if (directFallback.ok) return directFallback;

    return {
      ok: false,
      requestId,
      reason: error?.name === 'AbortError' ? 'timeout' : 'fetch_failed',
      errorMessage: error.message,
      fallback: directFallback,
    };
  }
}

async function triggerExerciseRecommendation({
  req,
  patientId,
  professionalId,
  messageText,
  channel = 'telegram',
}) {
  const internalUrl = `${req.protocol}://${req.get('host')}/api/exercises/recommend`;
  const response = await fetch(internalUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_id: patientId,
      symptoms: messageText,
      channel,
      fisioterapeuta_id: professionalId || null,
    }),
    signal: AbortSignal.timeout(40000),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    ok: response.ok && Boolean(payload?.ok),
    statusCode: response.status,
    payload,
  };
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

function getPatientAppointmentHelpMessage() {
  return [
    'Comandos disponibles (citas):',
    '/cita <inicio_iso> <fin_iso> [nota] - Solicitar cita',
    'Ejemplo: /cita 2026-03-10T18:00 2026-03-10T18:45 dolor cervical',
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
    const agentMode = detectTelegramAgentMode(parsedPayload);
    const text = normalizeCommand(texto_mensaje);
    const isCommand = text.startsWith('/');

    const reply = async (replyText) => {
      if (fromTelegramWebhook) {
        await sendTelegramMessage(chat_id, replyText, agentMode);
        return res.status(200).json({ ok: true });
      }
      return res.json({ reply_text: replyText });
    };

    if (agentMode === 'physio_reports') {
      if (!isCommand || text.toLowerCase() === '/start' || text.toLowerCase() === '/ayuda') {
        return await reply(getPhysioHelpMessage());
      }

      const reportCommand = parsePhysioReportCommand(text);
      if (!reportCommand?.patientId || !reportCommand?.symptoms) {
        return await reply(
          'Formato invalido.\nUsa: /informe <paciente_id> | <sintomas>\nEjemplo: /informe 11111111-2222-3333-4444-555555555555 | Dolor cervical al girar cuello'
        );
      }

      const professionalId = await getDefaultProfessionalId();
      const recoResult = await triggerExerciseRecommendation({
        req,
        patientId: reportCommand.patientId,
        professionalId,
        messageText: reportCommand.symptoms,
        channel: 'telegram',
      });

      if (!recoResult.ok || !recoResult.payload?.ok) {
        return await reply(
          `No pude generar el informe para el paciente ${reportCommand.patientId}. Revisa el ID y vuelve a intentarlo.`
        );
      }

      const recoPayload = recoResult.payload;
      const reportText =
        recoPayload.informe_clinico ||
        buildTelegramExerciseFallback(recoPayload) ||
        recoPayload.message_to_therapist ||
        'Informe generado correctamente.';

      let pdfSent = false;
      try {
        const pdfBuffer = await buildExerciseReportPdfBuffer(recoPayload);
        await sendTelegramDocument({
          chatId: chat_id,
          filename: `informe-ejercicios-${String(recoPayload.recommendation_id || Date.now())}.pdf`,
          buffer: pdfBuffer,
          caption: `Informe listo para paciente ${reportCommand.patientId}`,
          agentMode: 'physio_reports',
        });
        pdfSent = true;
      } catch (pdfErr) {
        console.warn('[telegram] PDF generation/send error:', pdfErr.message);
      }

      if (pdfSent) {
        return await reply(
          `Informe generado para paciente ${reportCommand.patientId}.\nRecomendacion: ${recoPayload.recommendation_id || '-'}\nPDF enviado en este chat.`
        );
      }
      return await reply(truncateTelegramMessage(reportText));
    }

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
      const modeHelp = agentMode === 'patient_appointments' ? getPatientAppointmentHelpMessage() : getHelpMessage();
      return await reply(`Vinculacion completada para ${patientName}.\n\n${modeHelp}`);
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
        return await reply('He detectado seÃ±ales de alerta. Contacta con tu fisioterapeuta hoy mismo o con urgencias si empeoras.');
      }

      if (agentMode === 'patient_appointments') {
        return await reply(
          `Bienvenido/a ${onboarding.fullName}. Ya he creado tu ficha.\n\nPara agendar, envia: /cita 2026-03-10T18:00 2026-03-10T18:45\n\n${getPatientAppointmentHelpMessage()}`
        );
      }

      return await reply(
        `Bienvenido/a ${onboarding.fullName}. Ya he creado tu ficha y enviado tus sintomas al fisioterapeuta para revision.\n\n${getHelpMessage()}`
      );
    }

    if (!isCommand) {
      const professionalId = await getDefaultProfessionalId();
      const historySnapshot = await getPatientHistorySnapshot(link.paciente_id);
      const redFlagResult = detectRedFlags(text);

      let agentConversation = null;
      let intent = { route: 'unknown', confidence: 0 };
      try {
        agentConversation = await resolveAgentConversation({
          channel: 'telegram',
          role: 'patient',
          chatId: chat_id,
          patientId: link.paciente_id,
          professionalId,
          text,
          requestId: crypto.randomUUID(),
          timeoutMs: 12000,
        });
        intent = {
          route: String(agentConversation?.data?.route || agentConversation?.data?.intent_hint || 'unknown'),
          confidence: Number(agentConversation?.data?.confidence || 0),
        };
      } catch (agentErr) {
        console.warn('[telegram] n8n agent gateway error:', agentErr.message);
      }

      if (!intent?.route || intent.route === 'unknown' || Number(intent.confidence || 0) < INTENT_CONFIDENCE_THRESHOLD) {
        try {
          const routerUrl = `${process.env.SUPABASE_URL}/functions/v1/intent-router`;
          const routerResp = await fetch(routerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_text: text, request_id: crypto.randomUUID() }),
            signal: AbortSignal.timeout(8000),
          });
          if (routerResp.ok) {
            const routerIntent = await routerResp.json();
            if (routerIntent?.route) {
              intent = routerIntent;
            }
          }
        } catch (routerErr) {
          console.warn('[telegram] W0 intent-router error:', routerErr.message);
        }
      }

      const fallbackIntent = inferIntentFromText(text);
      if (!intent?.route || intent.route === 'unknown' || Number(intent.confidence || 0) < INTENT_CONFIDENCE_THRESHOLD) {
        intent = fallbackIntent;
      }
      if (agentMode === 'patient_appointments') {
        intent = { route: 'appointment', confidence: Math.max(Number(intent.confidence || 0), 0.95) };
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
        return await reply('âš ï¸ He detectado seÃ±ales de alerta. Contacta con tu fisioterapeuta hoy mismo o con urgencias si empeoras.');
      }

      // W2: If intent is exercise with decent confidence, auto-recommend
      if (intent.route === 'exercise' && intent.confidence >= INTENT_CONFIDENCE_THRESHOLD) {
        try {
          const internalUrl = `${req.protocol}://${req.get('host')}/api/exercises/recommend`;
          const recoResp = await fetch(internalUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patient_id: link.paciente_id,
              symptoms: text,
              channel: 'telegram',
              fisioterapeuta_id: professionalId,
            }),
            signal: AbortSignal.timeout(35000),
          });

          if (recoResp.ok) {
            const recoPayload = await recoResp.json();
            if (recoPayload?.ok) {
              const report =
                recoPayload.informe_clinico ||
                buildTelegramExerciseFallback(recoPayload) ||
                recoPayload.message_to_patient ||
                'He generado tu informe de ejercicios y lo he enviado al fisioterapeuta.';
              return await reply(truncateTelegramMessage(report));
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
          req,
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
          'ðŸ“… He recibido tu solicitud de cita. Nuestro equipo la revisarÃ¡ y te confirmarÃ¡ disponibilidad lo antes posible.'
        );
      }

      // Default: intake created, generic reply
      return await reply('Mensaje recibido. Tu fisioterapeuta revisarÃ¡ tus sÃ­ntomas y te pautarÃ¡ el siguiente ejercicio.');
    }

    if (text.toLowerCase() === '/ayuda') {
      if (agentMode === 'patient_appointments') {
        return await reply(getPatientAppointmentHelpMessage());
      }
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
        req,
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

      return await reply('ðŸ“… He recibido tu solicitud de cita. Nuestro equipo la revisarÃ¡ y te confirmarÃ¡ disponibilidad lo antes posible.');
    }

    return await reply(`No reconozco ese comando.\n\n${getHelpMessage()}`);
  } catch (err) {
    next(err);
  }
});

export default router;

