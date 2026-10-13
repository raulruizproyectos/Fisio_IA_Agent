import { serviceSupabase } from './supabase.js';

// Plan B and notices of the booking agent. The backend decides and stores; n8n only transports.
// Rows are written before anyone is told "registrada", and delivery never repeats an uncertain send.

export const CONTACT_REQUEST_REGISTERED = 'Tu petición ha quedado registrada. Te llamaremos por teléfono lo antes posible para confirmarte la cita o proponerte otra fecha si la que pides no está disponible. Si ya nos has llamado, no te preocupes: tendrás respuesta.';
export const CONTACT_REQUEST_ALREADY = 'Tu petición ya estaba registrada. Te llamaremos por teléfono lo antes posible; no hace falta que la repitas.';

const MAX_ATTEMPTS = 5;
const TIMEZONE = 'Europe/Madrid';

const TYPE_LABELS = { reservar: 'reservar cita', cambiar: 'cambiar cita', anular: 'anular cita', otro: 'hablar con la clínica' };
const REASON_LABELS = {
  sin_hueco: 'no hay hueco el día pedido', lectura_fallida: 'el agente no pudo leer la agenda', incierto: 'resultado sin confirmar',
  conflicto: 'cita pendiente de comprobación', otro_profesional: 'cita con otro profesional', telefono_existente: 'teléfono ya registrado en otra ficha',
  no_entendido: 'el agente no entendió la petición', menos_24h: 'faltan menos de 24 h', revisar_paciente_nuevo: 'cita de paciente nuevo por revisar',
  peticion_paciente: 'el paciente pide que le llamen',
};

// "+34600111222"; Spanish 9-digit numbers get +34. Anything else is rejected rather than guessed.
export function normalizeContactPhone(value) {
  const raw = String(value || '').trim().replace(/[\s().-]/g, '').replace(/^00/, '+');
  if (/^[6789]\d{8}$/.test(raw)) return `+34${raw}`;
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw;
  if (/^[1-9]\d{9,14}$/.test(raw)) return `+${raw}`;
  return null;
}

const dateLabel = (dateOnly) => new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
  .format(new Date(`${dateOnly}T12:00:00Z`));
const instantLabel = (iso) => new Intl.DateTimeFormat('es-ES', { timeZone: TIMEZONE, dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso));

const n8nTarget = (variable) => {
  const url = String(process.env[variable] || '').trim();
  const secret = String(process.env.N8N_WEBHOOK_SECRET || '').trim();
  return url && secret ? { url, secret } : null;
};

// Sends one stored row to n8n. `field` is the row's delivery-state column.
// Retried only when it surely was not sent (refused connection, 4xx, or n8n reports {sent:false});
// a timeout, 5xx or an unclear answer becomes "incierto" and is never resent automatically.
async function deliver({ table, field, attemptsField, id, target, payload }) {
  if (!target) return 'pendiente';
  const claim = await serviceSupabase.from(table).update({ [field]: 'enviando' })
    .eq('id', id).in(field, ['pendiente', 'fallido']).lt(attemptsField, MAX_ATTEMPTS).select(`id, ${attemptsField}`).maybeSingle();
  if (claim.error || !claim.data) return null;
  let outcome;
  try {
    const response = await fetch(target.url, { method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': target.secret }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => null);
    if (response.ok && body?.sent === true) outcome = 'enviado';
    else if ((response.status >= 400 && response.status < 500) || (response.ok && body?.sent === false)) outcome = 'fallido';
    else outcome = 'incierto';
  } catch (error) {
    const code = error?.cause?.code;
    outcome = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(code) ? 'fallido' : 'incierto';
  }
  await serviceSupabase.from(table).update({ [field]: outcome, [attemptsField]: (claim.data[attemptsField] || 0) + 1 }).eq('id', id);
  return outcome;
}

async function professionalChatId(professionalId) {
  if (!professionalId) return null;
  const { data } = await serviceSupabase.from('crm_perfiles').select('telegram_chat_id').eq('id', professionalId).maybeSingle();
  return data?.telegram_chat_id || null;
}

// Alert for the clinic: who to call and what they asked. No clinical data.
export async function notifyContactRequest(row, { patientName = null, professionalId = null } = {}) {
  const wanted = [row.fecha_deseada && `el ${dateLabel(row.fecha_deseada)}`, row.hora_deseada && `a las ${row.hora_deseada}`].filter(Boolean).join(' ');
  const text = [
    `Solicitud de llamada (${row.canal === 'telegram' ? 'Telegram' : 'WhatsApp'})`,
    `${patientName || 'Persona sin ficha vinculada'} · ${row.telefono}`,
    `Quiere: ${TYPE_LABELS[row.tipo] || row.tipo}${wanted ? ` ${wanted}` : ''}`,
    `Motivo: ${REASON_LABELS[row.motivo] || row.motivo}`,
    'Gestiónala en el CRM, en Inicio › Solicitudes de contacto.',
  ].join('\n');
  return deliver({ table: 'crm_solicitudes_contacto', field: 'aviso_estado', attemptsField: 'aviso_intentos', id: row.id,
    target: n8nTarget('N8N_CONTACT_REQUEST_WEBHOOK_URL'),
    payload: { kind: 'contact_request', id: row.id, professional_chat_id: await professionalChatId(professionalId), text } }).catch(() => null);
}

// Stores the request before anything is promised. Returns { row, created }; throws when it could not be stored.
export async function registerContactRequest({ clinicId, patientId = null, linkId = null, canal, chatId = null, phone, tipo, motivo,
  date = null, hour = null, appointmentId = null, requestId }) {
  const subject = patientId ? `p:${patientId}` : linkId ? `v:${linkId}` : `c:${canal}:${chatId}`;
  const clave = `${subject}:${motivo}${motivo === 'revisar_paciente_nuevo' && appointmentId ? `:${appointmentId}` : ''}`;
  const payload = { clinica_id: clinicId, paciente_id: patientId, vinculo_id: linkId, canal, chat_id: chatId, telefono: phone, tipo, motivo,
    fecha_deseada: date, hora_deseada: hour, cita_id: appointmentId, clave_abierta: clave, request_id: requestId };
  const inserted = await serviceSupabase.from('crm_solicitudes_contacto').insert(payload).select('*').single();
  if (!inserted.error) return { row: inserted.data, created: true };
  if (inserted.error.code !== '23505') throw inserted.error;
  // Same message retried, or an open request for the same subject and reason: reuse it.
  const existing = await serviceSupabase.from('crm_solicitudes_contacto').select('*').eq('clinica_id', clinicId)
    .eq('clave_abierta', clave).neq('estado', 'resuelta').order('created_at', { ascending: false }).limit(1);
  if (existing.error) throw existing.error;
  const row = existing.data?.[0];
  if (row) return { row, created: false };
  const byRequest = await serviceSupabase.from('crm_solicitudes_contacto').select('*').eq('request_id', requestId).maybeSingle();
  if (byRequest.error || !byRequest.data) throw byRequest.error || new Error('Solicitud no encontrada tras conflicto');
  return { row: byRequest.data, created: false };
}

const ACTIVE = ['pendiente', 'confirmada', 'reprogramada'];

// Which change the clinic made, from the patient's point of view; null when there is nothing to tell.
export function appointmentNoticeKind(before, after) {
  if (!after || Date.parse(after.inicio_en) <= Date.now()) return null;
  if (!before) return ACTIVE.includes(after.estado) ? 'nueva' : null;
  if (after.estado === 'cancelada' && before.estado !== 'cancelada') return 'anulada';
  if (!ACTIVE.includes(after.estado)) return null;
  if (Date.parse(after.inicio_en) !== Date.parse(before.inicio_en)) return 'cambiada';
  if (before.estado === 'pendiente' && after.estado === 'confirmada') return 'confirmada';
  return null;
}

const NOTICE_TEXT = {
  nueva: (when) => `La clínica ha registrado tu cita del ${when}. Te enviaremos un recordatorio el día anterior.`,
  confirmada: (when) => `La clínica ha confirmado tu cita del ${when}. Te enviaremos un recordatorio el día anterior.`,
  cambiada: (when) => `La clínica ha cambiado tu cita al ${when}. Si no te va bien, escribe «Cambiar cita» o «Que me llamen».`,
  anulada: (when) => `La clínica ha anulado tu cita del ${when}. Si quieres otra, escribe «Reservar cita».`,
};

// Called after the CRM (not the agent) creates or changes an appointment. Never throws: the CRM change already happened.
export async function enqueueAppointmentNotice(before, after) {
  try {
    if (process.env.TELEGRAM_PILOT_BOOKING_ENABLED !== 'true') return null;
    const kind = appointmentNoticeKind(before, after);
    if (!kind) return null;
    const link = await serviceSupabase.from('crm_mensajeria_vinculos').select('clinica_id, chat_id').eq('paciente_id', after.paciente_id)
      .eq('canal', 'telegram').not('chat_id', 'is', null).not('consentimiento_en', 'is', null).is('baja_en', null).maybeSingle();
    if (link.error || !link.data) return null;
    const startAt = kind === 'anulada' ? (before?.inicio_en || after.inicio_en) : after.inicio_en;
    const inserted = await serviceSupabase.from('crm_avisos_paciente').insert({ clinica_id: link.data.clinica_id, paciente_id: after.paciente_id,
      cita_id: after.id, canal: 'telegram', chat_id: link.data.chat_id, tipo: kind, inicio_en: startAt,
      clave: `${after.id}:${after.updated_at || startAt}`, texto: NOTICE_TEXT[kind](instantLabel(startAt)) }).select('*').single();
    if (inserted.error) return null;
    return deliverPatientNotice(inserted.data);
  } catch {
    return null;
  }
}

export const deliverPatientNotice = (row) => deliver({ table: 'crm_avisos_paciente', field: 'estado', attemptsField: 'intentos', id: row.id,
  target: n8nTarget('N8N_PATIENT_NOTICE_WEBHOOK_URL'), payload: { kind: 'patient_notice', id: row.id, chat_id: row.chat_id, text: row.texto } }).catch(() => null);

// Retry pass (n8n schedule): only rows that surely were not delivered.
export async function dispatchPendingNotices({ professionalId = null } = {}) {
  const summary = { contact_requests: 0, patient_notices: 0 };
  const requests = await serviceSupabase.from('crm_solicitudes_contacto').select('*, crm_pacientes(nombre, apellidos)')
    .in('aviso_estado', ['pendiente', 'fallido']).lt('aviso_intentos', MAX_ATTEMPTS).neq('estado', 'resuelta').order('created_at', { ascending: true }).limit(20);
  if (requests.error) throw requests.error;
  for (const row of requests.data || []) {
    const name = row.crm_pacientes ? `${row.crm_pacientes.nombre} ${row.crm_pacientes.apellidos || ''}`.trim() : null;
    if (await notifyContactRequest(row, { patientName: name, professionalId }) === 'enviado') summary.contact_requests += 1;
  }
  const notices = await serviceSupabase.from('crm_avisos_paciente').select('*')
    .in('estado', ['pendiente', 'fallido']).lt('intentos', MAX_ATTEMPTS).order('created_at', { ascending: true }).limit(20);
  if (notices.error) throw notices.error;
  for (const row of notices.data || []) {
    if (Date.parse(row.inicio_en) <= Date.now()) continue;
    // The patient may have left the channel (BAJA) since the notice was queued.
    const link = await serviceSupabase.from('crm_mensajeria_vinculos').select('id').eq('paciente_id', row.paciente_id).eq('canal', row.canal)
      .eq('chat_id', row.chat_id).is('baja_en', null).maybeSingle();
    if (link.error || !link.data) continue;
    if (await deliverPatientNotice(row) === 'enviado') summary.patient_notices += 1;
  }
  return summary;
}
