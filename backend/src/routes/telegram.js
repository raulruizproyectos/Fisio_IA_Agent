import { Router } from 'express';
import crypto from 'node:crypto';
import { buildExerciseReportPdfBuffer } from '../lib/exercise-report-pdf.js';
import { supabase } from '../index.js';
import { resolveAgentConversation } from './agent.js';

const router = Router();
const INTENT_CONFIDENCE_THRESHOLD = 0.6;
const TELEGRAM_EDGE_ROUTER_ENABLED = String(process.env.TELEGRAM_EDGE_ROUTER_ENABLED || 'false').toLowerCase() === 'true';
const APPOINTMENT_WEBHOOK_URL = process.env.N8N_APPOINTMENT_WEBHOOK_URL?.trim() || null;
const TELEGRAM_PATIENT_BOT_USERNAME = String(process.env.TELEGRAM_PATIENT_BOT_USERNAME || 'fisioterapia_CarlaJL')
  .replace(/^@/, '')
  .toLowerCase();
const TELEGRAM_PHYSIO_BOT_USERNAME = String(process.env.TELEGRAM_PHYSIO_BOT_USERNAME || 'FisioIA_Agent_bot')
  .replace(/^@/, '')
  .toLowerCase();
const TELEGRAM_PATIENT_BOT_TOKEN = process.env.TELEGRAM_PATIENT_BOT_TOKEN?.trim() || null;
const TELEGRAM_PHYSIO_BOT_TOKEN = process.env.TELEGRAM_PHYSIO_BOT_TOKEN?.trim() || null;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() || null;
const TELEGRAM_TRANSCRIPTION_MODEL = process.env.TELEGRAM_TRANSCRIPTION_MODEL?.trim() || 'gpt-4o-mini-transcribe';

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

function parseNaturalAppointmentSlots(text = '') {
  const iso = extractIsoSlots(text);
  if (iso.slotStart) return iso;

  const MONTHS = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  };
  const DAY_NAMES = {
    lunes: 1, martes: 2, miércoles: 3, miercoles: 3,
    jueves: 4, viernes: 5, sábado: 6, sabado: 6, domingo: 0,
  };

  const t = text.toLowerCase();
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const nowDay = now.getDate();
  let day = null, month = null, year = nowYear;

  // "17 de marzo", "el 17 de marzo"
  const monthMatch = t.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/);
  if (monthMatch) {
    day = parseInt(monthMatch[1]);
    month = MONTHS[monthMatch[2]];
    if (month < nowMonth || (month === nowMonth && day < nowDay)) year = nowYear + 1;
  }

  // "mañana"
  if (!day && /\bmañana\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    day = d.getDate(); month = d.getMonth() + 1; year = d.getFullYear();
  }

  // "hoy"
  if (!day && /\bhoy\b/.test(t)) {
    day = nowDay; month = nowMonth; year = nowYear;
  }

  // "el lunes", "el martes", etc. — próxima ocurrencia
  if (!day) {
    for (const [name, targetDow] of Object.entries(DAY_NAMES)) {
      if (t.includes(name)) {
        const d = new Date(now);
        let daysAhead = targetDow - d.getDay();
        if (daysAhead <= 0) daysAhead += 7;
        d.setDate(d.getDate() + daysAhead);
        day = d.getDate(); month = d.getMonth() + 1; year = d.getFullYear();
        break;
      }
    }
  }

  if (!day) return { slotStart: null, slotEnd: null };

  // "a las 10:00", "a las 10", "10:00", "10h"
  let hours = null, minutes = 0;
  const timeMatchFull = t.match(/a\s+las?\s+(\d{1,2})(?::(\d{2}))?/);
  const timeMatchStd = !timeMatchFull && t.match(/(?<!\d)(\d{1,2}):(\d{2})(?!\d)/);
  const timeMatchH = !timeMatchFull && !timeMatchStd && t.match(/(?<!\d)(\d{1,2})\s*h(?:oras?)?(?!\d)/);
  const tm = timeMatchFull || timeMatchStd || timeMatchH;
  if (tm) {
    const h = parseInt(tm[1]);
    const m = parseInt(tm[2] || '0');
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) { hours = h; minutes = m; }
  }

  if (hours === null) return { slotStart: null, slotEnd: null };

  const pad = (n) => String(n).padStart(2, '0');

  // Compute Europe/Madrid UTC offset for the target date to avoid timezone shift
  const refDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const tzParts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', timeZoneName: 'shortOffset' })
    .formatToParts(refDate);
  const tzName = tzParts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+1';
  const offsetMatch = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const offsetSign = offsetMatch?.[1] || '+';
  const offsetH = pad(parseInt(offsetMatch?.[2] || '1'));
  const offsetM = pad(parseInt(offsetMatch?.[3] || '0'));
  const tzOffset = `${offsetSign}${offsetH}:${offsetM}`;

  const slotStart = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00${tzOffset}`;
  let endH = hours, endM = minutes + 60;
  if (endM >= 60) { endH += 1; endM -= 60; }
  const slotEnd = `${year}-${pad(month)}-${pad(day)}T${pad(endH)}:${pad(endM)}:00${tzOffset}`;

  return { slotStart, slotEnd };
}

async function callCarlaAgent(userMessage, context = null) {
  if (!OPENAI_API_KEY) return null;
  const nowMadrid = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', weekday: 'long',
  }).format(new Date());

  const systemPrompt = `Eres Carla, asistente de recepción de la clínica "Fisioterapia Carla JL" en Terrassa (Barcelona). Tu misión es ayudar a reservar citas de fisioterapia.
Personalidad: auténtica, tranquila, profesional. Te comunicas de forma natural como en un chat de WhatsApp. Eres empática y transmites tranquilidad.
Reglas:
- NUNCA menciones que eres IA, asistente virtual o bot.
- Responde siempre en español de España, sin expresiones de Latinoamérica.
- Máximo 100 palabras por respuesta. Solo texto plano, sin emojis ni markdown.
- Evita ofrecimientos genéricos al final del mensaje.
- Combina respuestas cortas y largas para sonar natural.
Horario: lunes a viernes, mañanas 9:00-13:00, tardes 15:00-19:00. Sábados, domingos y festivos: cerrado.
Las sesiones son de 1 hora. Los slots válidos son en punto o y media (9:00, 9:30, 10:00, 10:30...).
Flujo de reserva: cuando el paciente quiera pedir cita, primero pregunta el motivo o dolencia si no lo ha indicado, luego pregunta el día y hora. Con ambos datos procede a gestionar la reserva.
Ahora son las ${nowMadrid}.`;

  const messages = [{ role: 'system', content: systemPrompt }];
  if (context) messages.push({ role: 'system', content: `Contexto: ${context}` });
  messages.push({ role: 'user', content: userMessage });

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 200, temperature: 0.75 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function extractMotivoFromText(text = '') {
  if (!OPENAI_API_KEY || !text.trim()) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extrae en máximo 8 palabras la dolencia, molestia o motivo de consulta que menciona el paciente. Si no hay motivo claro responde exactamente: null. Solo devuelve el motivo, sin explicaciones.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 30,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.choices?.[0]?.message?.content?.trim() || null;
    return result === 'null' || !result ? null : result;
  } catch {
    return null;
  }
}

function truncateTelegramMessage(text = '', maxLen = 3900) {
  const clean = String(text || '').trim();
  if (!clean) return '';
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 3) + '...';
}

function pickBodyValue(obj = {}, ...keys) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== '') {
      return obj[key];
    }
  }
  return null;
}

function parseBooleanFlag(value = null) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function buildTelegramDryRunResponse({
  replyText,
  parsedPayload,
  agentMode,
  isCommand,
  intent,
  redFlagResult,
  nextAction,
  agentConversation = null,
  linkedPatientId = null,
  professionalId = null,
  notes = [],
  details = null,
}) {
  return {
    ok: true,
    dry_run: true,
    reply_text: truncateTelegramMessage(replyText),
    next_action: nextAction,
    agent_mode: agentMode,
    parsed_payload: {
      chat_id: String(parsedPayload?.chat_id || ''),
      username: parsedPayload?.username || null,
      text: parsedPayload?.texto_mensaje || '',
      is_command: Boolean(isCommand),
    },
    linked_patient_id: linkedPatientId || null,
    professional_id: professionalId || null,
    classification: {
      route: String(intent?.route || 'unknown'),
      confidence: Number(intent?.confidence || 0),
      source: agentConversation?.source || 'local_fallback',
      fallback_used: Boolean(agentConversation?.fallback_used),
      fallback_reason: agentConversation?.fallback_reason || null,
      n8n_unreachable: Boolean(agentConversation?.n8n_unreachable),
    },
    red_flags: redFlagResult || { tiene_alertas_rojas: false, alertas_rojas: [] },
    details: details || null,
    notes,
  };
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

  lines.push('Informe profesional de ejercicios');
  lines.push('');

  if (payload.red_flags?.present) {
    lines.push('Atencion: hay alertas clinicas que conviene revisar antes de compartir el plan.');
    lines.push('');
  }

  if (payload.symptom_summary) {
    lines.push(`Resumen clinico: ${payload.symptom_summary}`);
    lines.push('');
  }

  lines.push(`Plan propuesto (${exercises.length} ejercicio(s))`);

  if (!exercises.length) {
    lines.push('- No hay ejercicios disponibles en esta recomendacion.');
  }

  exercises.forEach((ex, idx) => {
    const order = ex.orden || idx + 1;
    lines.push(`${order}. ${ex.nombre || 'Ejercicio'}`);
    if (ex.zona_corporal) lines.push(`   Zona: ${ex.zona_corporal}`);
    if (ex.procedimiento) lines.push(`   Procedimiento: ${Array.isArray(ex.procedimiento) ? ex.procedimiento.join(' ') : ex.procedimiento}`);
    if (ex.why) lines.push(`   Motivo clinico: ${ex.why}`);
    if (Array.isArray(ex.cautions) && ex.cautions.length) lines.push(`   Precauciones: ${ex.cautions.join('; ')}`);
  });

  if (payload.message_to_patient) {
    lines.push('');
    lines.push('Mensaje sugerido para paciente:');
    lines.push(payload.message_to_patient);
  }

  return lines.join('\n').trim();
}

function parseIncomingPayload(body = {}) {
  if (body.chat_id && (body.texto_mensaje || body.message_text || body.voice_transcript || body.voice_message_text || body.voice?.file_id || body.voice_file_id)) {
    return {
      chat_id: body.chat_id,
      username: body.username || null,
      texto_mensaje: body.texto_mensaje || body.message_text || body.voice_transcript || body.voice_message_text || null,
      voice: body.voice?.file_id || body.voice_file_id
        ? {
            file_id: body.voice?.file_id || body.voice_file_id,
            duration: Number(body.voice?.duration || body.voice_duration || 0) || null,
            mime_type: body.voice?.mime_type || body.voice_mime_type || 'audio/ogg',
            file_unique_id: body.voice?.file_unique_id || body.voice_file_unique_id || null,
            source: 'custom',
          }
        : null,
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
  const voice = message?.voice || message?.audio || null;

  if (!chatId || (!text && !voice)) return null;

  return {
    chat_id: chatId,
    username,
    texto_mensaje: text,
    voice: voice
      ? {
          file_id: voice.file_id,
          duration: Number(voice.duration || 0) || null,
          mime_type: voice.mime_type || (message?.voice ? 'audio/ogg' : 'audio/mpeg'),
          file_unique_id: voice.file_unique_id || null,
          source: message?.voice ? 'voice' : 'audio',
        }
      : null,
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

async function getTelegramFileDownloadInfo(fileId, agentMode = 'legacy') {
  const token = resolveTelegramToken(agentMode);
  if (!token) throw new Error('No hay token Telegram configurado para descargar adjuntos');

  const response = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.ok || !payload?.result?.file_path) {
    throw new Error(`Telegram getFile fallo: ${JSON.stringify(payload)}`);
  }

  return {
    token,
    filePath: payload.result.file_path,
  };
}

async function downloadTelegramFileBuffer(fileId, agentMode = 'legacy') {
  const { token, filePath } = await getTelegramFileDownloadInfo(fileId, agentMode);
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!response.ok) {
    throw new Error(`No se pudo descargar el audio de Telegram (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    filePath,
  };
}

async function transcribeAudioBuffer({ buffer, filename = 'telegram-voice.ogg', mimeType = 'audio/ogg' }) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY_missing');
  }

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType || 'audio/ogg' }), filename);
  form.append('model', TELEGRAM_TRANSCRIPTION_MODEL);
  form.append('language', 'es');
  form.append('response_format', 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: form,
    signal: AbortSignal.timeout(45000),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenAI transcription fallo (${response.status})`);
  }

  const text = normalizeCommand(String(payload?.text || ''));
  if (!text) {
    throw new Error('empty_transcription');
  }

  return {
    text,
    model: TELEGRAM_TRANSCRIPTION_MODEL,
  };
}

async function resolveIncomingMessageText(parsedPayload, agentMode = 'legacy') {
  const directText = normalizeCommand(parsedPayload?.texto_mensaje || '');
  if (directText) {
    return {
      text: directText,
      inputType: parsedPayload?.voice ? 'voice_transcript' : 'text',
      transcription: null,
    };
  }

  const voice = parsedPayload?.voice || null;
  if (!voice?.file_id) {
    return {
      text: '',
      inputType: 'unknown',
      transcription: null,
    };
  }

  const downloaded = await downloadTelegramFileBuffer(voice.file_id, agentMode);
  const filename = downloaded.filePath?.split('/').pop() || `telegram-voice-${voice.file_unique_id || Date.now()}.ogg`;
  const transcription = await transcribeAudioBuffer({
    buffer: downloaded.buffer,
    filename,
    mimeType: voice.mime_type || 'audio/ogg',
  });

  return {
    text: transcription.text,
    inputType: 'voice',
    transcription: {
      ...transcription,
      duration_seconds: voice.duration || null,
      file_id: voice.file_id,
      file_path: downloaded.filePath,
    },
  };
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

function isMissingColumnError(error, columnName = '') {
  const message = String(error?.message || '');
  return message.includes(columnName) && (message.includes('column') || message.includes('schema cache'));
}

async function resolveCrmProfessionalProfile(rawProfessionalId) {
  if (!rawProfessionalId) return null;

  const crmProfile = await supabase
    .from('crm_perfiles')
    .select('id, nombre_completo, email, telegram_chat_id, telegram_username, telegram_linked_at, auth_user_id')
    .eq('id', rawProfessionalId)
    .maybeSingle();

  if (crmProfile.error && !isMissingColumnError(crmProfile.error, 'telegram_chat_id')) throw crmProfile.error;
  if (crmProfile.data?.id) return crmProfile.data;

  const legacyProfessional = await supabase
    .from('profesionales')
    .select('id, id_usuario_auth, email, nombre_completo')
    .eq('id', rawProfessionalId)
    .maybeSingle();

  if (legacyProfessional.error) throw legacyProfessional.error;
  if (!legacyProfessional.data) return null;

  if (legacyProfessional.data.id_usuario_auth) {
    const byAuth = await supabase
      .from('crm_perfiles')
      .select('id, nombre_completo, email, telegram_chat_id, telegram_username, telegram_linked_at, auth_user_id')
      .eq('auth_user_id', legacyProfessional.data.id_usuario_auth)
      .maybeSingle();

    if (byAuth.error && !isMissingColumnError(byAuth.error, 'telegram_chat_id')) throw byAuth.error;
    if (byAuth.data?.id) return byAuth.data;
  }

  if (legacyProfessional.data.email) {
    const byEmail = await supabase
      .from('crm_perfiles')
      .select('id, nombre_completo, email, telegram_chat_id, telegram_username, telegram_linked_at, auth_user_id')
      .eq('email', legacyProfessional.data.email)
      .maybeSingle();

    if (byEmail.error && !isMissingColumnError(byEmail.error, 'telegram_chat_id')) throw byEmail.error;
    if (byEmail.data?.id) return byEmail.data;
  }

  return null;
}

async function persistPhysioTelegramChatLink({ fisioterapeutaId, chatId, username }) {
  if (!fisioterapeutaId || !chatId) return null;
  const profile = await resolveCrmProfessionalProfile(fisioterapeutaId);
  if (!profile?.id) return null;

  const { data, error } = await supabase
    .from('crm_perfiles')
    .update({
      telegram_chat_id: String(chatId),
      telegram_username: username || null,
      telegram_linked_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
    .select('id, telegram_chat_id, telegram_username, telegram_linked_at')
    .single();

  if (error) {
    if (
      isMissingColumnError(error, 'telegram_chat_id') ||
      isMissingColumnError(error, 'telegram_username') ||
      isMissingColumnError(error, 'telegram_linked_at')
    ) {
      return { skipped: true, reason: 'missing_crm_perfiles_telegram_columns' };
    }
    throw error;
  }

  return data;
}

async function resolvePhysioTelegramTarget({ fisioterapeutaId, chatId = null }) {
  const explicitChatId = String(chatId || '').trim();
  if (explicitChatId) {
    return { chatId: explicitChatId, source: 'request_body', profile: null };
  }

  const envChatId = String(process.env.TELEGRAM_PHYSIO_REPORTS_CHAT_ID || '').trim();
  if (envChatId) {
    return { chatId: envChatId, source: 'env', profile: null };
  }

  const profile = await resolveCrmProfessionalProfile(fisioterapeutaId);
  const linkedChatId = String(profile?.telegram_chat_id || '').trim();
  if (linkedChatId) {
    return { chatId: linkedChatId, source: 'crm_perfiles', profile };
  }

  return { chatId: null, source: 'missing', profile };
}

function getPatientDisplayName(payload) {
  const fullName = [payload.first_name, payload.last_name].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (payload.username) return `@${payload.username}`;
  return `Paciente Telegram ${payload.chat_id}`;
}

function generateTelegramLinkCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

async function getTelegramLinkPatient(patientId) {
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, profesional_id, nombre_completo')
    .eq('id', patientId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getPatientTelegramLinkRecord(patientId) {
  const { data, error } = await supabase
    .from('vinculos_telegram_pacientes')
    .select(
      'id, paciente_id, profesional_id, telegram_chat_id, telegram_username, codigo_vinculacion, vinculado_en, creado_en, actualizado_en'
    )
    .eq('paciente_id', patientId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

function buildPatientTelegramLinkResponse({ patient, link = null }) {
  const linkCode = String(link?.codigo_vinculacion || '').trim() || null;
  const linkedChatId = String(link?.telegram_chat_id || '').trim() || null;
  const linkedAt = link?.vinculado_en || null;
  const linkStatus = linkedChatId || linkedAt ? 'linked' : linkCode ? 'pending' : 'not_linked';
  const telegramStartCommand = linkCode ? `/start ${linkCode}` : null;
  const telegramDeepLink =
    linkCode && TELEGRAM_PATIENT_BOT_USERNAME
      ? `https://t.me/${TELEGRAM_PATIENT_BOT_USERNAME}?start=${encodeURIComponent(linkCode)}`
      : null;

  return {
    data: {
      patient_id: patient?.id || null,
      patient_name: patient?.nombre_completo || null,
      professional_id: patient?.profesional_id || null,
      link_status: linkStatus,
      codigo_vinculacion: linkCode,
      telegram_chat_id: linkedChatId,
      telegram_username: link?.telegram_username || null,
      vinculado_en: linkedAt,
      creado_en: link?.creado_en || null,
      actualizado_en: link?.actualizado_en || null,
      telegram_start_command: telegramStartCommand,
      telegram_deep_link: telegramDeepLink,
    },
    instructions: telegramStartCommand
      ? `Comparte este mensaje con el paciente: ${telegramStartCommand}`
      : null,
  };
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

  const linkCode = generateTelegramLinkCode();
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
        'Cita registrada correctamente. Te confirmaremos cualquier ajuste y también la verás en el CRM.',
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
    'Tambien puedes escribir o enviar una nota de voz para pedir cita.',
    '/cita <inicio_iso> <fin_iso> [nota] - Solicitar cita',
    'Ejemplo: /cita 2026-03-10T18:00 2026-03-10T18:45 dolor cervical',
    '/ayuda - Ver esta ayuda',
  ].join('\n');
}

router.post('/physio-report/send', async (req, res, next) => {
  try {
    const fisioterapeutaId = pickBodyValue(req.body, 'fisioterapeuta_id', 'professional_id');
    const patientId = pickBodyValue(req.body, 'patient_id', 'paciente_id');
    const patientName = pickBodyValue(req.body, 'patient_name', 'paciente_nombre');
    const recommendationId = pickBodyValue(req.body, 'recommendation_id', 'recomendacion_id');
    const chatId = pickBodyValue(req.body, 'chat_id');
    const caption = pickBodyValue(req.body, 'caption') || `Informe profesional listo${patientName ? ` para ${patientName}` : ''}`;
    const exercises = Array.isArray(req.body?.exercises) ? req.body.exercises : [];
    const dryRun = parseBooleanFlag(req.query?.dry_run) || parseBooleanFlag(req.body?.dry_run);

    if (!fisioterapeutaId) {
      return res.status(400).json({ error: 'fisioterapeuta_id es obligatorio' });
    }

    if (!exercises.length) {
      return res.status(400).json({ error: 'No hay ejercicios para enviar por Telegram' });
    }

    const target = await resolvePhysioTelegramTarget({ fisioterapeutaId, chatId });
    if (!target.chatId) {
      return res.status(400).json({
        error: 'No hay chat Telegram configurado para el fisioterapeuta. Vincula el bot profesional o define TELEGRAM_PHYSIO_REPORTS_CHAT_ID.',
      });
    }

    const pdfPayload = {
      ...req.body,
      patient_id: patientId || null,
      patient_name: patientName || null,
      recommendation_id: recommendationId || null,
      fisioterapeuta_id: fisioterapeutaId,
    };

    const pdfBuffer = await buildExerciseReportPdfBuffer(pdfPayload);

    if (dryRun) {
      return res.json({
        ok: true,
        dry_run: true,
        delivered_via: 'telegram',
        target_source: target.source,
        recommendation_id: recommendationId || null,
        pdf_bytes: pdfBuffer.length || 0,
      });
    }

    await sendTelegramDocument({
      chatId: target.chatId,
      filename: `informe-ejercicios-${String(recommendationId || Date.now())}.pdf`,
      buffer: pdfBuffer,
      caption,
      agentMode: 'physio_reports',
    });

    return res.json({
      ok: true,
      delivered_via: 'telegram',
      target_source: target.source,
      recommendation_id: recommendationId || null,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/link-code/:patientId', async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const patient = await getTelegramLinkPatient(patientId);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

    let link = null;
    try {
      link = await getPatientTelegramLinkRecord(patient.id);
    } catch (error) {
      if (isMissingTableError(error)) {
        return res.status(400).json({
          error: 'Falta configurar la base de datos: tabla vinculos_telegram_pacientes no existe. Ejecuta la migracion SQL y vuelve a intentarlo.',
        });
      }
      throw error;
    }

    res.json(buildPatientTelegramLinkResponse({ patient, link }));
  } catch (err) {
    next(err);
  }
});

router.post('/link-code/:patientId', async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const regenerate = parseBooleanFlag(pickBodyValue(req.body, 'regenerate')) || parseBooleanFlag(req.query?.regenerate);
    const resetLinked = parseBooleanFlag(pickBodyValue(req.body, 'reset_linked', 'force_reset')) || parseBooleanFlag(req.query?.reset_linked);

    const patient = await getTelegramLinkPatient(patientId);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

    let existingLink;
    try {
      existingLink = await getPatientTelegramLinkRecord(patient.id);
    } catch (error) {
      if (isMissingTableError(error)) {
        return res.status(400).json({
          error: 'Falta configurar la base de datos: tabla vinculos_telegram_pacientes no existe. Ejecuta la migracion SQL y vuelve a intentarlo.',
        });
      }
      throw error;
    }

    const isLinked = Boolean(existingLink?.telegram_chat_id || existingLink?.vinculado_en);
    if (isLinked && !resetLinked) {
      return res.json({
        ...buildPatientTelegramLinkResponse({ patient, link: existingLink }),
        warning: 'patient_already_linked',
      });
    }

    if (existingLink?.codigo_vinculacion && !regenerate && !resetLinked) {
      return res.json(buildPatientTelegramLinkResponse({ patient, link: existingLink }));
    }

    const linkCode = generateTelegramLinkCode();

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
      .select(
        'id, paciente_id, profesional_id, telegram_chat_id, telegram_username, codigo_vinculacion, vinculado_en, creado_en, actualizado_en'
      )
      .single();

    if (error) throw error;

    res.json(buildPatientTelegramLinkResponse({ patient, link: data }));
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
        error: 'Payload invalido. Envia chat_id + texto_mensaje, voice_transcript o el webhook nativo de Telegram (texto o audio).',
      });
    }

    const { chat_id, username } = parsedPayload;
    const agentMode = detectTelegramAgentMode(parsedPayload);

    let resolvedIncoming = null;
    try {
      resolvedIncoming = await resolveIncomingMessageText(parsedPayload, agentMode);
    } catch (voiceErr) {
      const voiceReply = OPENAI_API_KEY
        ? 'He recibido tu audio, pero no he podido transcribirlo. Prueba a reenviarlo o escribeme la solicitud por texto.'
        : 'Ahora mismo no puedo procesar audios. Enviame tu solicitud por texto.';

      if (fromTelegramWebhook) {
        await sendTelegramMessage(chat_id, voiceReply, agentMode);
        return res.status(200).json({ ok: true, transcription_error: voiceErr.message });
      }

      return res.status(400).json({ error: voiceReply, detail: voiceErr.message });
    }

    const text = normalizeCommand(resolvedIncoming?.text || '');
    if (!text) {
      return res.status(400).json({ error: 'No he podido obtener texto del mensaje recibido.' });
    }

    parsedPayload.texto_mensaje = text;
    const isVoiceInput = resolvedIncoming?.inputType === 'voice';
    const isCommand = text.startsWith('/');
    const dryRun = parseBooleanFlag(pickBodyValue(req.body, 'dry_run')) || parseBooleanFlag(req.query?.dry_run);
    const forcedPatientId = pickBodyValue(req.body, 'paciente_id', 'patient_id');
    const forcedProfessionalId = pickBodyValue(req.body, 'profesional_id', 'professional_id');

    if (dryRun) {
      if (fromTelegramWebhook) {
        return res.status(400).json({
          error: 'dry_run solo disponible con payload custom, no con webhook nativo de Telegram',
        });
      }

      const professionalId = forcedProfessionalId || await getDefaultProfessionalId();
      const redFlagResult = detectRedFlags(text);

      if (agentMode === 'physio_reports') {
        if (!isCommand || text.toLowerCase() === '/start' || text.toLowerCase() === '/ayuda') {
          return res.json(buildTelegramDryRunResponse({
            replyText: getPhysioHelpMessage(),
            parsedPayload,
            agentMode,
            isCommand,
            intent: { route: 'exercise', confidence: 1 },
            redFlagResult,
            nextAction: 'show_physio_help',
            professionalId,
            notes: ['dry_run: no se genera PDF ni se persiste ninguna recomendacion'],
          }));
        }

        const reportCommand = parsePhysioReportCommand(text);
        if (!reportCommand?.patientId || !reportCommand?.symptoms) {
          return res.json(buildTelegramDryRunResponse({
            replyText: 'Formato invalido. Usa: /informe <paciente_id> | <sintomas>',
            parsedPayload,
            agentMode,
            isCommand,
            intent: { route: 'exercise', confidence: 1 },
            redFlagResult,
            nextAction: 'await_valid_physio_report_command',
            professionalId,
            notes: ['dry_run: corrige el comando para simular la generacion del informe'],
          }));
        }

        return res.json(buildTelegramDryRunResponse({
          replyText: 'Dry run OK. Se dispararia W2 para generar informe y PDF del paciente indicado.',
          parsedPayload,
          agentMode,
          isCommand,
          intent: { route: 'exercise', confidence: 1 },
          redFlagResult,
          nextAction: 'trigger_w2_report',
          linkedPatientId: reportCommand.patientId,
          professionalId,
          details: {
            symptoms: reportCommand.symptoms,
          },
          notes: ['dry_run: no se genera PDF ni se persiste ninguna recomendacion'],
        }));
      }

      if (text.toLowerCase().startsWith('/start')) {
        const [, rawCode] = text.split(/\s+/);
        const code = rawCode?.trim()?.toUpperCase() || null;
        return res.json(buildTelegramDryRunResponse({
          replyText: code ? 'Dry run OK. Se validaria el codigo de vinculacion y se asociaria el chat al paciente.' : 'Falta el codigo de vinculacion. Usa: /start CODIGO',
          parsedPayload,
          agentMode,
          isCommand,
          intent: { route: 'link', confidence: code ? 1 : 0.2 },
          redFlagResult,
          nextAction: code ? 'validate_link_code' : 'await_link_code',
          professionalId,
          details: code ? { code } : null,
          notes: ['dry_run: no se actualiza ninguna vinculacion en base de datos'],
        }));
      }

      if (text.toLowerCase() === '/ayuda') {
        return res.json(buildTelegramDryRunResponse({
          replyText: agentMode === 'patient_appointments' ? getPatientAppointmentHelpMessage() : getHelpMessage(),
          parsedPayload,
          agentMode,
          isCommand,
          intent: { route: 'help', confidence: 1 },
          redFlagResult,
          nextAction: 'show_help',
          professionalId,
          notes: ['dry_run: solo se devuelve la ayuda, sin efectos laterales'],
        }));
      }

      if (text.toLowerCase() === '/plan') {
        return res.json(buildTelegramDryRunResponse({
          replyText: 'Dry run OK. Se consultaria el plan activo del paciente vinculado.',
          parsedPayload,
          agentMode,
          isCommand,
          intent: { route: 'plan_status', confidence: 0.95 },
          redFlagResult,
          nextAction: 'read_active_plan',
          linkedPatientId: forcedPatientId,
          professionalId,
          notes: ['dry_run: envia paciente_id para simular un chat ya vinculado'],
        }));
      }

      if (text.toLowerCase().startsWith('/dolor')) {
        const painCommand = parsePainCommand(text);
        return res.json(buildTelegramDryRunResponse({
          replyText: painCommand ? 'Dry run OK. Se registraria dolor ' + painCommand.painLevel + '/10 para el paciente vinculado.' : 'Formato invalido. Usa: /dolor <0-10> [nota opcional]',
          parsedPayload,
          agentMode,
          isCommand,
          intent: { route: 'pain_log', confidence: painCommand ? 0.95 : 0.2 },
          redFlagResult,
          nextAction: painCommand ? 'log_pain' : 'await_valid_pain_command',
          linkedPatientId: forcedPatientId,
          professionalId,
          details: painCommand,
          notes: ['dry_run: no se escribe ninguna medicion en base de datos'],
        }));
      }

      if (text.toLowerCase().startsWith('/cita')) {
        const appointmentCommand = parseAppointmentCommand(text);
        return res.json(buildTelegramDryRunResponse({
          replyText: appointmentCommand ? 'Solicitud de cita recibida. Voy a tramitarla.' : 'Formato de cita invalido. Usa: /cita 2026-03-10T18:00 2026-03-10T18:45 [nota opcional]',
          parsedPayload,
          agentMode,
          isCommand,
          intent: { route: 'appointment', confidence: appointmentCommand ? 0.95 : 0.2 },
          redFlagResult,
          nextAction: appointmentCommand ? 'trigger_w1' : 'await_valid_appointment_command',
          linkedPatientId: forcedPatientId,
          professionalId,
          details: appointmentCommand,
          notes: ['dry_run: no se llama a W1 ni se crea la cita'],
        }));
      }

      if (!isCommand) {
        let agentConversation = null;
        let intent = { route: 'unknown', confidence: 0 };
        try {
          agentConversation = await resolveAgentConversation({
            channel: 'telegram',
            role: 'patient',
            chatId: chat_id,
            patientId: forcedPatientId,
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
          console.warn('[telegram] dry_run n8n agent gateway error:', agentErr.message);
        }

        if (
          TELEGRAM_EDGE_ROUTER_ENABLED &&
          process.env.SUPABASE_URL &&
          (!intent?.route || intent.route === 'unknown' || Number(intent.confidence || 0) < INTENT_CONFIDENCE_THRESHOLD)
        ) {
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
            console.warn('[telegram] dry_run W0 intent-router error:', routerErr.message);
          }
        }

        const fallbackIntent = inferIntentFromText(text);
        if (!intent?.route || intent.route === 'unknown' || Number(intent.confidence || 0) < INTENT_CONFIDENCE_THRESHOLD) {
          intent = fallbackIntent;
        }
        if (agentMode === 'patient_appointments') {
          intent = { route: 'appointment', confidence: Math.max(Number(intent.confidence || 0), 0.95) };
        }

        const sharedAgentReply = String(
          agentConversation?.data?.reply_text ||
          agentConversation?.data?.message ||
          ''
        ).trim() || 'Mensaje recibido. Tu fisioterapeuta revisara tus sintomas y te pautara el siguiente ejercicio.';

        let nextAction = forcedPatientId ? 'create_intake_and_reply' : 'auto_link_and_create_intake';
        let replyText = sharedAgentReply;
        const notes = ['dry_run: no se crean fichas, intakes, citas ni recomendaciones'];
        if (isVoiceInput) notes.push('entrada_voz_transcrita: se evaluaria igual que texto libre');
        if (!forcedPatientId) {
          notes.push('envia patient_id o paciente_id para simular un chat ya vinculado');
        }

        if (redFlagResult.tiene_alertas_rojas) {
          nextAction = 'red_flag_alert';
          replyText = 'ALERTA: He detectado senales de alerta. Contacta con tu fisioterapeuta hoy mismo o con urgencias si empeoras.';
        } else if (intent.route === 'exercise' && intent.confidence >= INTENT_CONFIDENCE_THRESHOLD) {
          nextAction = 'trigger_w2';
        } else if (intent.route === 'appointment' && intent.confidence >= INTENT_CONFIDENCE_THRESHOLD) {
          nextAction = 'trigger_w1';
          replyText = 'Solicitud de cita recibida. Voy a tramitarla.';
        }

        return res.json(buildTelegramDryRunResponse({
          replyText,
          parsedPayload,
          agentMode,
          isCommand,
          intent,
          redFlagResult,
          nextAction,
          agentConversation,
          linkedPatientId: forcedPatientId,
          professionalId,
          notes,
        }));
      }

      return res.json(buildTelegramDryRunResponse({
        replyText: 'No reconozco ese comando.\n\n' + getHelpMessage(),
        parsedPayload,
        agentMode,
        isCommand,
        intent: { route: 'unknown', confidence: 0.2 },
        redFlagResult,
        nextAction: 'show_help',
        professionalId,
        notes: ['dry_run: comando no reconocido'],
      }));
    }

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
      await persistPhysioTelegramChatLink({ fisioterapeutaId: professionalId, chatId: chat_id, username });
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
        return await reply('He detectado señales de alerta. Contacta con tu fisioterapeuta hoy mismo o con urgencias si empeoras.');
      }

      if (agentMode === 'patient_appointments') {
        const carlaWelcome = await callCarlaAgent(
          text,
          `El paciente se llama ${onboarding.fullName} y acaba de registrarse en el sistema. Salúdale y pregúntale qué día y hora le viene mejor para su cita.`
        );
        return await reply(carlaWelcome || `Hola ${onboarding.fullName}, soy Carla. ¿Qué día y a qué hora te viene mejor para la cita?`);
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

      if (
        TELEGRAM_EDGE_ROUTER_ENABLED &&
        process.env.SUPABASE_URL &&
        (!intent?.route || intent.route === 'unknown' || Number(intent.confidence || 0) < INTENT_CONFIDENCE_THRESHOLD)
      ) {
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

      const sharedAgentReply = String(
        agentConversation?.data?.reply_text ||
        agentConversation?.data?.message ||
        ''
      ).trim() || 'Mensaje recibido. Tu fisioterapeuta revisara tus sintomas y te pautara el siguiente ejercicio.';

      // Always create intake for tracking
      await createIntakeMessage({
        patientId: link.paciente_id,
        professionalId,
        messageText: text,
        historySnapshot,
        redFlagResult,
      });

      if (redFlagResult.tiene_alertas_rojas) {
        return await reply('âš ï¸ He detectado señales de alerta. Contacta con tu fisioterapeuta hoy mismo o con urgencias si empeoras.');
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
        const { slotStart, slotEnd } = parseNaturalAppointmentSlots(text);

        // If no slot could be parsed, let Carla ask naturally for date/time.
        if (!slotStart) {
          const carlaAsk = await callCarlaAgent(text, 'El paciente quiere pedir cita pero no ha indicado fecha u hora concreta. Pregúntale de forma natural qué día y a qué hora le viene mejor.');
          return await reply(carlaAsk || 'Claro, dime qué día y a qué hora te viene mejor y compruebo disponibilidad.');
        }

        const motivo = await extractMotivoFromText(text);
        const appointment = await triggerAppointmentWorkflow({
          req,
          patientId: link.paciente_id,
          professionalId,
          chatId: chat_id,
          username,
          messageText: motivo || text,
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
          const w1Status = appointment.status || '';
          let carlaContext;
          if (w1Status === 'confirmed') {
            carlaContext = `La cita ha sido CONFIRMADA. Slot: ${slotStart} hasta ${slotEnd}. Dile que la cita queda confirmada, la fecha y hora, y que procure llegar puntual.`;
          } else if (w1Status === 'slot_not_available') {
            carlaContext = `El horario solicitado (${slotStart}) está OCUPADO. Pídele que proponga otra franja horaria disponible en el horario de la clínica.`;
          } else {
            carlaContext = appointment.messageToPatient || 'La solicitud de cita ha sido procesada.';
          }
          const carlaReply = await callCarlaAgent(text, carlaContext);
          return await reply(carlaReply || appointment.messageToPatient);
        }

        const carlaError = await callCarlaAgent(text, 'Ha habido un problema técnico al gestionar la reserva. Disculpate brevemente y dile que lo intente de nuevo en unos minutos.');
        return await reply(carlaError || 'Ha habido un problema al gestionar tu cita. Inténtalo de nuevo en un momento.');
      }

      // Default: use Carla for any other patient message.
      if (agentMode === 'patient_appointments') {
        const carlaDefault = await callCarlaAgent(text);
        return await reply(carlaDefault || truncateTelegramMessage(sharedAgentReply));
      }

      return await reply(truncateTelegramMessage(sharedAgentReply));
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

      return await reply('ðŸ“… He recibido tu solicitud de cita. Nuestro equipo la revisará y te confirmará disponibilidad lo antes posible.');
    }

    return await reply(`No reconozco ese comando.\n\n${getHelpMessage()}`);
  } catch (err) {
    next(err);
  }
});

export default router;



