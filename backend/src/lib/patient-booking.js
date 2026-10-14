import crypto from 'node:crypto';
import { supabase, serviceSupabase } from './supabase.js';
import { reportError } from './approved-exercise-report.js';
import { getMessagingPilotConfig } from './openwa.js';
import { normalizeAppointmentText, parseNaturalAppointmentSlots } from './appointment-text.js';
import { buildPublicBookingSlots, getPublicBookingBounds, PUBLIC_BOOKING_TIMEZONE, createCrmAppointment, updateCrmAppointment } from '../routes/professional.js';
import { holidayName } from './clinic-calendar.js';
import { CONTACT_REQUEST_ALREADY, CONTACT_REQUEST_REGISTERED, normalizeContactPhone, notifyContactRequest, registerContactRequest } from './agent-notices.js';
import { bookingAiEnabled, composeReply, interpretMessage, recentReplies, rememberReply, shouldInterpret, URGENT_NOTICE, urgentByKeywords } from './booking-ai.js';

// Channel-neutral booking assistant. Transports (Telegram now, WhatsApp later) only
// deliver text/contact and render `{ text, options, requestContact }`.
export const CHANGE_NOTICE_MS = 24 * 60 * 60 * 1000;
const SELECTION_TTL_MS = 10 * 60 * 1000;
// An unfinished mutation is only declared "not applied" after reading its result this long after it started.
const UNCERTAIN_SETTLE_MS = 5 * 60 * 1000;
const ACTIVE_STATUSES = ['pendiente', 'confirmada', 'reprogramada'];
const MENU = ['Reservar cita', 'Mis citas', 'Cambiar cita', 'Anular cita'];
const CALLBACK = 'Que me llamen';
const CONFIRM_OPTIONS = ['CONFIRMAR', 'NO'];

// Instants, not wall clocks: DST changes cannot shorten or extend the notice. Exactly 24 h is allowed.
export const patientMayChange = (startAt, now = Date.now()) => Date.parse(startAt) - now >= CHANGE_NOTICE_MS;

const reply = (text, options = [], extra = {}) => ({ text, options, ...extra });
// Internal hand-over of a saved conversation state; never rendered or sent to the model.
const NEXT_STATE = Symbol('nextState');
const PARTS = { manana: 'mañana', tarde: 'tarde' };
const inPart = (slot, part) => (part === 'manana' ? slot.start_local < '14:00' : slot.start_local >= '14:00');

export async function getPilotPatient(patientId, config = getMessagingPilotConfig()) {
  const { data, error } = await supabase.from('crm_pacientes').select('id, nombre, apellidos, telefono, clinica_id, created_by_profile_id, origen_alta, revisada_en')
    .eq('id', patientId).eq('clinica_id', config.clinicId).eq('activo', true).maybeSingle();
  if (error) throw error;
  if (!data) throw reportError(404, 'Paciente no disponible en la clínica de pruebas');
  return data;
}

export async function requirePilotProfessional(patient, config) {
  const { data, error } = await supabase.from('crm_perfiles').select('id, clinica_id, crm_clinicas!inner(id, activo)')
    .eq('id', config.professionalId).eq('clinica_id', config.clinicId).eq('activo', true).eq('crm_clinicas.activo', true).maybeSingle();
  if (error) throw error;
  if (!data || data.crm_clinicas?.activo !== true) throw reportError(503, 'Profesional o clínica de pruebas no disponibles');
  if (patient.created_by_profile_id !== data.id) {
    const assignment = await supabase.from('crm_asignaciones_fisio_paciente').select('paciente_id')
      .eq('paciente_id', patient.id).eq('clinica_id', config.clinicId).eq('fisioterapeuta_id', data.id).eq('estado', 'activa').maybeSingle();
    if (assignment.error) throw assignment.error;
    if (!assignment.data) throw reportError(409, 'La clínica debe asignarte al profesional del piloto antes de reservar');
  }
}

export const phoneDigits = (phone) => {
  const text = String(phone || '').replace(/[\s().-]/g, '').replace(/^00/, '+');
  return /^\+[1-9]\d{7,14}$/.test(text) ? text.slice(1) : null;
};
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

export async function createPilotLink(req, canal) {
  const config = getMessagingPilotConfig();
  if (!req.auth?.profile_id || req.auth.clinic_id !== config.clinicId) throw reportError(403, 'Se requiere sesión de la clínica de pruebas');
  const patient = await getPilotPatient(req.params.patientId, config);
  await requirePilotProfessional(patient, config);
  const phone = canal === 'whatsapp' ? phoneDigits(patient.telefono) : null;
  if (canal === 'whatsapp' && !phone) throw reportError(400, 'Guarda el teléfono con prefijo internacional, por ejemplo +34');
  const existing = await serviceSupabase.from('crm_mensajeria_vinculos').select('*').eq('paciente_id', patient.id).eq('canal', canal).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.chat_id && existing.data.consentimiento_en && !existing.data.baja_en) return { linked: true };
  const code = crypto.randomBytes(12).toString('hex').toUpperCase();
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const payload = { clinica_id: config.clinicId, paciente_id: patient.id, canal, telefono: phone,
    codigo_hash: hash(code), codigo_expira_en: expires };
  const result = existing.data
    ? await serviceSupabase.from('crm_mensajeria_vinculos').update(payload).eq('id', existing.data.id).is('chat_id', null).select('id').maybeSingle()
    : await serviceSupabase.from('crm_mensajeria_vinculos').insert(payload).select('id').single();
  if (result.error) throw result.error;
  if (!result.data) throw reportError(409, 'El vínculo cambió; vuelve a consultar su estado');
  const bot = canal === 'telegram' ? String(process.env.TELEGRAM_PATIENT_BOT_USERNAME || '').replace(/^@/, '').trim() : '';
  const deepLink = /^\w{5,32}$/.test(bot) ? `https://t.me/${bot}?start=${code}` : null;
  return { linked: false, expires_at: expires, deep_link: deepLink,
    invitation: `${deepLink ? `Abre ${deepLink} y pulsa Iniciar, o envía` : 'Envía'} VINCULAR ${code} al canal de citas de tu clínica. Caduca en 30 minutos y solo sirve una vez. Al vincular autorizas recibir tus planes de ejercicios y gestionar tus citas por este canal.` };
}

export async function claimMessagingEvent({ canal, sessionId, event, messageId, status = null, chatId = null }, config) {
  const id = hash(JSON.stringify([config.clinicId, canal, sessionId, event, messageId, status]));
  const result = await serviceSupabase.from('crm_mensajeria_eventos').insert({ id, clinica_id: config.clinicId,
    canal, session_id: sessionId, evento: event, message_id: messageId, delivery_status: status, chat_id: chatId }).select('id').single();
  if (result.error?.code === '23505') return null;
  if (result.error) throw result.error;
  return id;
}

export async function finishMessagingEvent(id, estado) {
  const { error } = await serviceSupabase.from('crm_mensajeria_eventos').update({ estado }).eq('id', id);
  if (error) throw error;
}

async function getClinic(config) {
  const { data, error } = await supabase.from('crm_clinicas').select('nombre, telefono, email').eq('id', config.clinicId).maybeSingle();
  if (error) throw error;
  return data || {};
}

// Only configured contact data; never an invented phone number or schedule.
const contactSentence = (clinic) => {
  const ways = [clinic.telefono && `el teléfono ${clinic.telefono}`, clinic.email && `el email ${clinic.email}`].filter(Boolean);
  return ways.length ? `Puedes contactar con la clínica por ${ways.join(' o ')}.` : 'Contacta con la clínica por su vía habitual.';
};
// Last resort when even the request could not be stored: configured contact only, nothing invented.
const lastResort = (clinic) => (clinic.telefono || clinic.email ? ` Si es urgente, ${contactSentence(clinic).charAt(0).toLowerCase()}${contactSentence(clinic).slice(1)}` : '');

// Patients registered by the assistant stay "new" until the clinic reviews their record: their bookings wait for the clinic.
const needsClinicReview = (patient) => patient?.origen_alta === 'asistente_telegram' && !patient.revisada_en;

// Plan B: store the request first, then promise the call. Without a stored row nothing is promised.
async function storeCallback({ clinic, config, link, patient, save, intro = '', pending, phone, keepState = false,
  registered = CONTACT_REQUEST_REGISTERED, already = CONTACT_REQUEST_ALREADY, keyboard = MENU }) {
  const prefix = intro ? `${intro} ` : '';
  try {
    const { row, created } = await registerContactRequest({ clinicId: config.clinicId, patientId: patient?.id || null, linkId: link?.id || null,
      canal: link?.canal || 'telegram', chatId: link?.chat_id || null, phone, tipo: pending.tipo, motivo: pending.motivo,
      date: pending.date || null, hour: pending.hour || null, appointmentId: pending.appointment_id || null, requestId: pending.request_id || crypto.randomUUID() });
    if (!keepState && save) await save({}).catch(() => {});
    if (created) await notifyContactRequest(row, { patientName: patient ? `${patient.nombre} ${patient.apellidos || ''}`.trim() : null, professionalId: config.professionalId });
    return reply(`${prefix}${created ? registered : already}`, keyboard);
  } catch {
    return reply(`${prefix}Ahora no he podido registrar tu petición. Inténtalo de nuevo en unos minutos.${lastResort(clinic)}`, keyboard);
  }
}

async function requestCallback({ clinic, config, link, patient, save, intro = '', tipo, motivo, date = null, hour = null, appointmentId = null, keepState = false }) {
  const pending = { tipo, motivo, date, hour, appointment_id: appointmentId, request_id: crypto.randomUUID() };
  const phone = normalizeContactPhone(patient?.telefono) || normalizeContactPhone(link?.telefono);
  if (phone) return storeCallback({ clinic, config, link, patient, save, intro, pending, phone, keepState });
  if (keepState) return null;
  await save({ awaiting: 'phone', callback: pending, expires_at: new Date(Date.now() + SELECTION_TTL_MS).toISOString() });
  return reply(`${intro ? `${intro} ` : ''}Para que la clínica pueda llamarte, escribe tu número de teléfono.`);
}

// Spoken style: "martes 20 de octubre a las 9:00"; the year only when it is not the current one.
const madridDay = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: PUBLIC_BOOKING_TIMEZONE }).format(new Date(ms));
export const dateLabel = (dateOnly, now = Date.now()) => new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
  ...(dateOnly.slice(0, 4) === madridDay(now).slice(0, 4) ? {} : { year: 'numeric' }) }).format(new Date(`${dateOnly}T12:00:00Z`)).replace(',', '');
// The booking limit may fall on a weekend: "28 de noviembre", without the weekday.
const dayMonthLabel = (dateOnly) => new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(new Date(`${dateOnly}T12:00:00Z`));
export const dateTimeLabel = (iso, now = Date.now()) => `${dateLabel(madridDay(Date.parse(iso)), now)} a las ${new Intl.DateTimeFormat('es-ES',
  { timeZone: PUBLIC_BOOKING_TIMEZONE, hour: 'numeric', minute: '2-digit' }).format(new Date(iso))}`;
const calendarPending = (row) => Boolean(row?.calendar_sync_pending || row?.calendar_sync_state === 'calendar_pending');
const STATUS_LABELS = { pendiente: 'pendiente de confirmar por la clínica', confirmada: 'confirmada', reprogramada: 'cambiada' };
const appointmentLine = (row) => `${dateTimeLabel(row.inicio_en)} (${STATUS_LABELS[row.estado] || row.estado}${calendarPending(row) ? '; calendario pendiente de comprobar' : ''})`;

const APPOINTMENT_FIELDS = 'id, paciente_id, fisioterapeuta_id, inicio_en, fin_en, estado, google_calendar_event_id, calendar_sync_pending, request_id, updated_at';

async function upcomingAppointments(patientId) {
  const { data, error } = await supabase.from('crm_citas').select(APPOINTMENT_FIELDS)
    .eq('paciente_id', patientId).in('estado', ACTIVE_STATUSES).gt('inicio_en', new Date().toISOString())
    .order('inicio_en', { ascending: true }).limit(10);
  if (error) throw error;
  return data || [];
}

async function readOwnAppointment(patientId, appointmentId) {
  const { data, error } = await supabase.from('crm_citas').select(APPOINTMENT_FIELDS)
    .eq('id', appointmentId).eq('paciente_id', patientId).maybeSingle();
  if (error) throw error;
  return data;
}

const linkCodeFrom = (text) => String(text || '').trim().match(/^\/?(?:vincular|start)\s+([\da-f]{24})$/i)?.[1]?.toUpperCase() || null;

async function linkWithCode(canal, chatId, code, config) {
  const result = await serviceSupabase.from('crm_mensajeria_vinculos').select('*')
    .eq('clinica_id', config.clinicId).eq('canal', canal).eq('codigo_hash', hash(code)).gt('codigo_expira_en', new Date().toISOString()).is('chat_id', null).maybeSingle();
  if (result.error) throw result.error;
  const link = result.data;
  if (!link || (canal === 'whatsapp' && link.telefono + '@c.us' !== chatId)) return reply('Código no válido, caducado o ya utilizado. Pide una invitación nueva a la clínica.');
  await getPilotPatient(link.paciente_id, config);
  // An unfinished self-registration of this chat gives way to the clinic's invitation.
  const cleanup = await serviceSupabase.from('crm_mensajeria_vinculos').delete()
    .eq('clinica_id', config.clinicId).eq('canal', canal).eq('chat_id', chatId).is('paciente_id', null);
  if (cleanup.error) throw cleanup.error;
  const update = await serviceSupabase.from('crm_mensajeria_vinculos')
    .update({ chat_id: chatId, consentimiento_en: new Date().toISOString(), baja_en: null, codigo_hash: null, codigo_expira_en: null, reserva: {} })
    .eq('id', link.id).eq('codigo_hash', hash(code)).is('chat_id', null).select('*').maybeSingle();
  if (update.error?.code === '23505') return reply('Este chat ya está vinculado a otra ficha. Pide ayuda a la clínica para revisarlo.');
  if (update.error) throw update.error;
  return update.data ? reply('¡Listo! Ya puedes gestionar tus citas por aquí. ¿En qué te puedo ayudar?', MENU) : reply('El código ya se ha utilizado.');
}

const lastNine = (digits) => String(digits || '').replace(/\D/g, '').slice(-9);

// Links this chat to the record whose phone Telegram has just verified. Returns null when the clinic must handle it.
async function linkVerifiedPatient({ patientId, chatId, digits }, config) {
  let patient;
  try {
    patient = await getPilotPatient(patientId, config);
    await requirePilotProfessional(patient, config);
  } catch { return null; }
  // An unfinished self-registration of this chat gives way to the existing record.
  const cleanup = await serviceSupabase.from('crm_mensajeria_vinculos').delete()
    .eq('clinica_id', config.clinicId).eq('canal', 'telegram').eq('chat_id', chatId).is('paciente_id', null);
  if (cleanup.error) throw cleanup.error;
  const existing = await serviceSupabase.from('crm_mensajeria_vinculos').select('id').eq('paciente_id', patient.id).eq('canal', 'telegram').maybeSingle();
  if (existing.error) throw existing.error;
  // The same verified number on a new Telegram account replaces the old chat; a pending invitation is no longer needed.
  const fields = { chat_id: chatId, telefono: digits, consentimiento_en: new Date().toISOString(), baja_en: null, codigo_hash: null, codigo_expira_en: null, reserva: {} };
  const saved = existing.data
    ? await serviceSupabase.from('crm_mensajeria_vinculos').update(fields).eq('id', existing.data.id).select('id').maybeSingle()
    : await serviceSupabase.from('crm_mensajeria_vinculos').insert({ clinica_id: config.clinicId, paciente_id: patient.id, canal: 'telegram', ...fields }).select('id').single();
  if (saved.error?.code === '23505') return reply('Este chat ya está vinculado a otra ficha. Pide ayuda a la clínica para revisarlo.');
  if (saved.error) throw saved.error;
  if (!saved.data) return null;
  return reply(`Hola, ${patient.nombre}. Te he reconocido por tu teléfono, así que ya puedes gestionar tus citas por aquí. ¿En qué te puedo ayudar?`, MENU);
}

async function registerNewPatient({ link, chatId, fromId, text, contact, clinic }, config) {
  const welcome = `Hola, soy el asistente virtual de citas${clinic.nombre ? ` de ${clinic.nombre}` : ''}.`;
  if (contact) {
    if (!fromId || String(contact.user_id) !== String(fromId)) {
      return reply('Para verificar tu teléfono, compártelo con el botón «Compartir mi teléfono»; no sirve el contacto de otra persona.', [], { requestContact: true });
    }
    const digits = String(contact.phone_number || '').replace(/\D/g, '');
    if (!/^[1-9]\d{7,14}$/.test(digits)) return reply('No he podido leer ese teléfono. Pide ayuda a la clínica.');
    const patients = await supabase.from('crm_pacientes').select('id, telefono, activo').eq('clinica_id', config.clinicId).not('telefono', 'is', null);
    if (patients.error) throw patients.error;
    const matches = (patients.data || []).filter(row => lastNine(row.telefono).length === 9 && lastNine(row.telefono) === lastNine(digits));
    // Telegram verified that this number belongs to this account: a single active record with it is linked directly.
    if (matches.length === 1 && matches[0].activo) {
      const linked = await linkVerifiedPatient({ patientId: matches[0].id, chatId, digits }, config);
      if (linked) return linked;
    }
    // Shared, inactive or unassignable numbers stay with the clinic.
    if (matches.length) {
      // Plan B: the clinic calls this verified number and sorts it out.
      return storeCallback({ clinic, config, link: { canal: 'telegram', chat_id: chatId }, patient: null,
        intro: 'Este teléfono ya figura en la clínica. Para proteger tus datos, la vinculación se hace con un código personal que te dará la clínica.',
        registered: EXISTING_PHONE_REGISTERED, already: EXISTING_PHONE_WAITING, keyboard: [],
        pending: { tipo: 'otro', motivo: 'telefono_existente' }, phone: normalizeContactPhone(digits) });
    }
    const payload = { clinica_id: config.clinicId, canal: 'telegram', chat_id: chatId, telefono: digits, paciente_id: null, reserva: { onboarding: 'name' } };
    const saved = link
      ? await serviceSupabase.from('crm_mensajeria_vinculos').update({ telefono: digits, reserva: { onboarding: 'name' }, version: link.version + 1 })
        .eq('id', link.id).eq('version', link.version).is('paciente_id', null).select('id').maybeSingle()
      : await serviceSupabase.from('crm_mensajeria_vinculos').insert(payload).select('id').single();
    if (saved.error) throw saved.error;
    if (!saved.data) throw reportError(409, 'El alta cambió mientras se procesaba');
    return reply('Gracias, teléfono verificado. ¿Me dices tu nombre y apellidos?');
  }

  if (link?.reserva?.onboarding === 'name') {
    const name = String(text || '').trim().replace(/\s+/g, ' ');
    if (!/^[\p{L}][\p{L}'’. -]{1,79}$/u.test(name) || name.split(' ').length < 2) return reply('Escribe tu nombre y al menos un apellido, por favor.');
    // Claim the registration first so two quick messages cannot create two records.
    const claim = await serviceSupabase.from('crm_mensajeria_vinculos').update({ reserva: { onboarding: 'creating' }, version: link.version + 1 })
      .eq('id', link.id).eq('version', link.version).is('paciente_id', null).select('id').maybeSingle();
    if (claim.error) throw claim.error;
    if (!claim.data) throw reportError(409, 'El alta cambió mientras se procesaba');
    const [nombre, ...apellidos] = name.split(' ');
    const patient = await supabase.from('crm_pacientes').insert({ clinica_id: config.clinicId, nombre, apellidos: apellidos.join(' '),
      telefono: `+${link.telefono}`, created_by_profile_id: config.professionalId, activo: true, origen_alta: 'asistente_telegram',
      observaciones: 'Alta desde el asistente de citas de Telegram con teléfono verificado por Telegram. Revisar posibles duplicados.' })
      .select('id').single();
    if (patient.error) throw patient.error;
    const done = await serviceSupabase.from('crm_mensajeria_vinculos').update({ paciente_id: patient.data.id, consentimiento_en: new Date().toISOString(), reserva: {}, version: link.version + 2 })
      .eq('id', link.id).eq('version', link.version + 1).select('id').maybeSingle();
    if (done.error || !done.data) return reply(`Tu ficha se ha creado, pero la clínica debe completar la vinculación de este chat.${lastResort(clinic)}`);
    return reply(`¡Listo, ${nombre}! Ya puedes gestionar tus citas por aquí. ¿En qué te puedo ayudar?`, MENU);
  }
  if (link?.reserva?.onboarding === 'creating') return reply(`Tu alta está pendiente de revisión por la clínica.${lastResort(clinic)}`);

  // Already asked the clinic for a code from this chat: say so instead of starting over.
  const waiting = await serviceSupabase.from('crm_solicitudes_contacto').select('id').eq('clinica_id', config.clinicId)
    .eq('canal', 'telegram').eq('chat_id', String(chatId)).eq('motivo', 'telefono_existente').neq('estado', 'resuelta').limit(1);
  if (!waiting.error && waiting.data?.length) return reply(`${EXISTING_PHONE_WAITING}${lastResort(clinic)}`);

  // The full welcome on a greeting or a first contact; whoever already got it today gets a short reminder of the button.
  const seen = isGreeting(text) ? null : await serviceSupabase.from('crm_mensajeria_eventos').select('id').eq('clinica_id', config.clinicId)
    .eq('chat_id', String(chatId)).eq('estado', 'procesado').gte('created_at', new Date(Date.now() - 86_400_000).toISOString()).limit(1);
  if (!seen || seen.error || !seen.data?.length) {
    return reply(`${welcome} Para empezar, pulsa «Compartir mi teléfono»: si ya eres paciente te reconoceré por tu número y, si es tu primera vez, te daré de alta. Usaremos este chat solo para gestionar tus citas y enviarte recordatorios.`, [], { requestContact: true });
  }
  return reply('Antes de nada necesito verificar tu teléfono: pulsa el botón «Compartir mi teléfono» de abajo (no hace falta escribirlo).', [], { requestContact: true });
}

const EXISTING_PHONE_REGISTERED = 'Te llamaremos a este número para darte tu código. Cuando lo tengas, envíalo aquí así: VINCULAR y el código.';
const EXISTING_PHONE_WAITING = 'Tu petición ya está registrada: la clínica te llamará para darte tu código. Cuando lo tengas, envíalo aquí así: VINCULAR y el código.';

// First contact ("/start", "hola", empty) gets the full welcome; anything else gets the short reminder.
const isGreeting = (text) => {
  const value = String(text || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return !value || value.startsWith('/start') || /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hi|hello|ey|hey)\b[\s!.,¡?¿]*$/.test(value);
};

export async function handlePatientMessage({ canal, chatId, fromId = null, text = '', contact = null }, config) {
  const code = linkCodeFrom(text);
  if (code) return linkWithCode(canal, chatId, code, config);
  // The model reads the words in parallel with the lookups; it never sees who is writing.
  const understanding = contact ? Promise.resolve(null) : interpretMessage(text, getPublicBookingBounds()).catch(() => null);
  const clinic = await getClinic(config);
  const found = await serviceSupabase.from('crm_mensajeria_vinculos').select('*')
    .eq('clinica_id', config.clinicId).eq('canal', canal).eq('chat_id', chatId).is('baja_en', null).maybeSingle();
  if (found.error) throw found.error;
  const link = found.data;
  const hint = await understanding;
  // Possibly serious symptoms: safety first. No booking flow is pushed and nothing is reworded; the menu stays available.
  if (link?.paciente_id && link.consentimiento_en && !contact && (hint?.urgent === true || urgentByKeywords(text))) {
    return reply(`${URGENT_NOTICE}

Cuando estés bien, si quieres pedir, cambiar o anular una cita, puedes hacerlo aquí.`, MENU);
  }
  let answer;
  if (link?.paciente_id && link.consentimiento_en) answer = await respondToPatientBooking(link, contact ? '' : text, config, clinic, hint);
  else if (canal !== 'telegram') answer = reply('Pide a tu clínica una invitación para vincularte y reservar citas.');
  else answer = await registerNewPatient({ link, chatId, fromId, text, contact, clinic }, config);
  return finishReply(answer, { link, text: contact ? '' : text, hint });
}

// Tone from CRM facts only: "habitual" needs a reviewed record and a past appointment.
async function patientTone(link) {
  if (!link?.paciente_id) return { tone: 'nuevo' };
  const { data: patient, error } = await supabase.from('crm_pacientes').select('nombre, origen_alta, revisada_en').eq('id', link.paciente_id).maybeSingle();
  if (error || !patient || needsClinicReview(patient)) return { tone: 'nuevo' };
  const past = await supabase.from('crm_citas').select('id').eq('paciente_id', link.paciente_id)
    .in('estado', ['completada', 'confirmada', 'reprogramada']).lt('inicio_en', new Date().toISOString()).limit(1);
  return past.error || !past.data?.length ? { tone: 'nuevo' } : { tone: 'habitual', firstName: patient.nombre || null };
}

// The backend's reply is the source of truth: the model may only reword it, and the safety notice is never reworded.
async function finishReply(answer, { link, text, hint }) {
  const result = { ...answer };
  delete result[NEXT_STATE];
  const urgent = Boolean(text) && (hint?.urgent === true || urgentByKeywords(text));
  // Buttons, hours and CONFIRMAR get the backend's own text: rewording them only added filler ("Entiendo tu solicitud").
  const pressed = Boolean(text) && !shouldInterpret(text);
  if (bookingAiEnabled() && result.text && !pressed) {
    const { tone, firstName } = await patientTone(link).catch(() => ({ tone: 'nuevo' }));
    const composed = await composeReply({ base: result.text, tone, firstName, worried: Boolean(hint?.worried || urgent), patientText: text, previous: recentReplies(link?.id) });
    if (composed) result.text = composed;
  }
  if (urgent) result.text = `${URGENT_NOTICE}

${result.text}`;
  rememberReply(link?.id, result.text);
  return result;
}

const intentOf = (t) => {
  if (/^(baja|stop)$/.test(t)) return 'stop';
  if (/^(que me llamen|quiero que me llameis|quiero que me llamen|llamadme|llamame|llamenme)$/.test(t)) return 'callback';
  if (/^otro dia$/.test(t)) return 'other_day';
  if (/^(gracias|muchas gracias|ok|vale|perfecto)$/.test(t)) return 'thanks';
  if (/^(confirmar|confirmo|si|si,? confirmo)$/.test(t)) return 'confirm';
  if (/^(no|cancelar|reiniciar|salir|volver|menu|\/?start|\/?ayuda|ayuda|hola|buenas|buenos dias|buenas tardes|inicio)$/.test(t)) return t === 'cancelar' ? 'discard_or_cancel' : /^(no|reiniciar|salir|volver)$/.test(t) ? 'discard' : 'menu';
  if (/\b(mis citas|ver (mis )?citas|consultar|que citas tengo|mis reservas|cuando tengo)\b/.test(t)) return 'list';
  if (/\b(anular|cancelar (la |mi |una )?cita|desconvocar)\b/.test(t)) return 'cancel';
  if (/\b(cambiar|mover|reprogramar|aplazar|adelantar|retrasar)\b/.test(t)) return 'reschedule';
  if (/\b(reservar|pedir cita|nueva cita|quiero (una )?cita|reserva)\b/.test(t)) return 'book';
  // Asking for availability is booking, not a question about one's own appointments.
  if (/\b(teneis|tienes|tienen|hay|queda|quedan) (algo|algun hueco|hueco|huecos|sitio|disponibilidad)\b|\bdisponibilidad\b/.test(t)) return 'book';
  return null;
};

// `hint` is the model's reading of free text: it may fill an intent, day, time or part of the day that the
// keywords missed, but it can never confirm, unsubscribe or change any rule.
export async function respondToPatientBooking(link, text, config, clinic = null, hint = null) {
  clinic ||= await getClinic(config);
  const patient = await getPilotPatient(link.paciente_id, config);
  const normalized = normalizeAppointmentText(text).trim();
  const keywordIntent = intentOf(normalized);
  // While a day is being asked for, a message that gives one ("ya te he dicho que el jueves por la tarde")
  // continues that flow, whatever the model read in it; only keywords can switch to another action.
  const askingDay = link.reserva?.awaiting === 'date' && Date.parse(link.reserva?.expires_at) > Date.now();
  const givesDay = Boolean(hint?.date || hint?.partOfDay);
  const intent = keywordIntent || (askingDay && givesDay ? null : hint?.intent) || null;
  let version = link.version;
  const save = async (reserva) => {
    const result = await serviceSupabase.from('crm_mensajeria_vinculos').update({ reserva, version: version + 1 })
      .eq('id', link.id).eq('version', version).select('id').maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw reportError(409, 'Otro mensaje cambió la conversación; repite tu última respuesta');
    version += 1;
  };

  if (intent === 'stop') {
    const { data, error } = await serviceSupabase.from('crm_mensajeria_vinculos').update({ chat_id: null, baja_en: new Date().toISOString(), reserva: {}, version: link.version + 1 })
      .eq('id', link.id).eq('version', link.version).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw reportError(409, 'Otro mensaje cambió el vínculo; la clínica debe comprobar la baja');
    return reply(`Has desactivado este canal. No recibirás recordatorios ni planes por aquí. Tus citas registradas se mantienen. ${contactSentence(clinic)}`);
  }
  await requirePilotProfessional(patient, config);

  const state = link.reserva || {};
  const callback = (intro, details) => requestCallback({ clinic, config, link, patient, save, intro, ...details });
  if (state.processing) return recoverProcessing({ state, patient, save, callback: (intro, details) => callback(intro, { ...details, keepState: true }),
    onCreated: (row) => announceCreated({ row, startAt: row.inicio_en, patient, link, config }) });
  const valid = state.expires_at && Date.parse(state.expires_at) > Date.now() ? state : {};
  const keep = async (next) => {
    const stored = { ...next, expires_at: new Date(Date.now() + SELECTION_TTL_MS).toISOString() };
    await save(stored);
    return stored;
  };
  // Whatever the agent cannot complete becomes a stored request for a call (plan B).
  const derive = (intro, details) => callback(intro, details);

  if (valid.awaiting === 'phone' && valid.callback && !intent) {
    const phone = normalizeContactPhone(text);
    if (!phone) return reply('No he reconocido ese número. Escríbelo con sus 9 cifras, por ejemplo 600 123 456.');
    return storeCallback({ clinic, config, link, patient, save, pending: valid.callback, phone });
  }
  if (intent === 'callback') {
    const offer = valid.callback_offer;
    return derive('', offer ? { tipo: offer.tipo, motivo: offer.motivo, date: offer.date, hour: offer.hour, appointmentId: offer.appointment_id }
      : { tipo: 'otro', motivo: 'peticion_paciente' });
  }
  if (intent === 'other_day') {
    await keep(valid.intent === 'reschedule' && valid.appointment ? { intent: 'reschedule', appointment: valid.appointment, awaiting: 'date' } : { intent: 'book', awaiting: 'date' });
    return reply('¿Qué otro día te viene bien?');
  }
  // A "vale" or "gracias" while a confirmation is pending is not consent: the guard below asks for CONFIRMAR.
  if (intent === 'thanks' && valid.awaiting !== 'confirm') return reply('¡De nada! Si necesitas algo más, aquí estoy.', MENU);

  if (intent === 'menu') { await save({}); return reply(`Hola, soy el asistente virtual de citas${clinic.nombre ? ` de ${clinic.nombre}` : ''}. ¿En qué te puedo ayudar?`, MENU); }
  if (intent === 'discard' || (intent === 'discard_or_cancel' && (valid.selection || valid.appointment || valid.slots))) {
    await save({});
    return reply('Vale, lo dejamos aquí. No se ha cambiado ninguna cita. ¿Te ayudo con algo más?', MENU);
  }
  if (intent === 'discard_or_cancel') return reply('¿Quieres anular una cita ya registrada?', ['Anular cita', 'Mis citas']);

  if (intent === 'confirm') {
    if (valid.intent === 'cancel' && valid.appointment && valid.awaiting === 'confirm') return confirmChange({ valid, patient, clinic, save, derive, config });
    if (valid.intent === 'reschedule' && valid.selection && valid.appointment) return confirmChange({ valid, patient, clinic, save, derive, config });
    if (valid.selection && valid.intent !== 'reschedule') return confirmBooking({ valid, patient, save, derive, config, link });
    return reply('Ahora mismo no hay nada pendiente de confirmar. ¿En qué te puedo ayudar?', MENU);
  }

  const exactDate = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
  const parsed = parseNaturalAppointmentSlots(text);
  const parsedDate = parsed.slotStart?.slice(0, 10) || (parsed.parsedYear ? `${parsed.parsedYear}-${String(parsed.parsedMonth).padStart(2, '0')}-${String(parsed.parsedDay).padStart(2, '0')}` : null);
  const textDate = exactDate || parsedDate || hint?.date || null;
  const clock = normalized.match(/^(?:a\s+las?\s+)?(\d{1,2}):(\d{2})$/);
  const wanted = clock ? `${clock[1].padStart(2, '0')}:${clock[2]}` : parsed.slotStart?.slice(11, 16)
    || (parsed.missingDay ? `${String(parsed.parsedHour).padStart(2, '0')}:${String(parsed.parsedMinutes).padStart(2, '0')}` : null)
    || hint?.time || null;
  const partOfDay = normalized.match(/\bpor la (manana|tarde)\b/)?.[1] || hint?.partOfDay || valid.part_of_day || null;

  // Only the literal CONFIRMAR applies a change: "sí, resérvala", "perfecto, gracias" or a reading by the model is not consent.
  if (valid.awaiting === 'confirm' && (valid.selection || valid.intent === 'cancel') && !textDate && !wanted
    && (!intent || intent === 'thanks' || (intent === 'book' && !keywordIntent))) {
    return reply(valid.intent === 'cancel' ? 'Para anular la cita, pulsa CONFIRMAR. Si prefieres mantenerla, pulsa NO.'
      : 'Para confirmarlo, pulsa CONFIRMAR. Si prefieres no hacerlo, pulsa NO.', CONFIRM_OPTIONS);
  }

  let appointments;
  const loadAppointments = async () => {
    try { appointments = await upcomingAppointments(patient.id); return true; } catch { return false; }
  };

  if (intent === 'list') {
    if (!await loadAppointments()) return derive('Ahora no puedo consultar tus citas. No significa que no tengas ninguna.', { tipo: 'otro', motivo: 'lectura_fallida' });
    await save({});
    if (!appointments.length) return reply('No tienes ninguna cita próxima. ¿Quieres que busquemos una?', MENU);
    return reply(`Tus próximas citas:\n${appointments.map((row, index) => `${index + 1}. ${appointmentLine(row)}`).join('\n')}`, MENU);
  }

  if (intent === 'cancel' || intent === 'reschedule') {
    const tipo = intent === 'cancel' ? 'anular' : 'cambiar';
    if (!await loadAppointments()) return derive('Ahora no puedo consultar tus citas para modificarlas.', { tipo, motivo: 'lectura_fallida' });
    const own = appointments.filter(row => row.fisioterapeuta_id === config.professionalId);
    if (!own.length && appointments.length) return derive('Esas citas las gestiona directamente la clínica.', { tipo, motivo: 'otro_profesional', appointmentId: appointments[0].id });
    if (!own.length) { await save({}); return reply('No tienes citas próximas que pueda gestionar por aquí.', MENU); }
    if (own.length === 1) {
      const chosen = await chooseAppointment({ row: own[0], action: intent, keep, derive });
      // "Move my appointment to Friday": the day already given goes straight to the free slots.
      if (intent === 'reschedule' && textDate && chosen[NEXT_STATE]) {
        return respondToPatientBooking({ ...link, version, reserva: chosen[NEXT_STATE] }, '', config, clinic, { date: textDate, time: wanted, partOfDay });
      }
      return chosen;
    }
    await keep({ intent, awaiting: 'pick', choices: own.map(row => row.id) });
    return reply(`¿Qué cita quieres ${intent === 'cancel' ? 'anular' : 'cambiar'}?\n${own.map((row, index) => `${index + 1}. ${appointmentLine(row)}`).join('\n')}`, own.map((_row, index) => String(index + 1)));
  }

  const number = /^(?:opcion\s+)?(\d{1,2})$/.exec(normalized)?.[1];
  if (valid.awaiting === 'pick' && number) {
    const id = valid.choices?.[Number(number) - 1];
    const row = id ? await readOwnAppointment(patient.id, id).catch(() => undefined) : null;
    if (row === undefined) return derive('Ahora no puedo leer esa cita.', { tipo: valid.intent === 'cancel' ? 'anular' : 'cambiar', motivo: 'lectura_fallida', appointmentId: id });
    if (!row || !ACTIVE_STATUSES.includes(row.estado)) { await save({}); return reply('Esa cita ya no está activa. Consulta de nuevo tus citas.', MENU); }
    return chooseAppointment({ row, action: valid.intent, keep, derive });
  }

  const pickTime = clock ? wanted : !textDate ? hint?.time : null;
  const picked = number ? valid.slots?.[Number(number) - 1] : pickTime ? valid.slots?.find(slot => slot.start_local === pickTime) : null;
  if (picked && valid.awaiting === 'slot') {
    await keep({ ...valid, selection: picked, awaiting: 'confirm', request_id: valid.request_id || crypto.randomUUID() });
    return reply(valid.intent === 'reschedule'
      ? `Vas a cambiar tu cita del ${dateTimeLabel(valid.appointment.inicio_en)} al ${dateTimeLabel(picked.start_at)}. ¿Lo confirmas?`
      : `Perfecto, el ${dateTimeLabel(picked.start_at)}. ¿Confirmas la reserva?`, CONFIRM_OPTIONS);
  }

  const date = textDate || (parsed.missingDay ? valid.date : null);
  const flow = intent !== 'book' && valid.intent === 'reschedule' && valid.appointment ? 'reschedule' : 'book';
  if (!date) {
    if (intent === 'book' || valid.awaiting === 'date') {
      await keep(flow === 'reschedule' ? { ...valid, awaiting: 'date', part_of_day: partOfDay } : { intent: 'book', awaiting: 'date', part_of_day: partOfDay });
      // The booking limit is only mentioned when a date falls outside it.
      return reply('¿Qué día te vendría bien? Puedes decirme, por ejemplo, «mañana» o «el lunes».');
    }
    // Second miss in a row: offer the call instead of looping on the menu.
    if (valid.misunderstood) {
      await keep({ ...valid, misunderstood: 2, callback_offer: { tipo: 'otro', motivo: 'no_entendido' } });
      return reply('Perdona, sigo sin entenderte. Puedes usar los botones de abajo o, si lo prefieres, pedir que te llamemos.', [CALLBACK, ...MENU]);
    }
    await keep({ ...valid, misunderstood: 1 });
    return reply('Perdona, no te he entendido bien. ¿Quieres pedir una cita, ver las tuyas, cambiarla o anularla?', MENU);
  }
  const { today, maxDate } = getPublicBookingBounds();
  if (date < today || date > maxDate) return reply(`Solo tengo agenda abierta entre el ${dateLabel(today)} y el ${dayMonthLabel(maxDate)}. ¿Qué otro día te va bien?`);

  const offer = { tipo: flow === 'reschedule' ? 'cambiar' : 'reservar', motivo: 'sin_hueco', date, hour: wanted || null,
    appointment_id: flow === 'reschedule' ? valid.appointment.id : null };
  let slots;
  try {
    slots = await buildPublicBookingSlots({ professionalId: config.professionalId, dateOnly: date,
      excludeId: flow === 'reschedule' ? valid.appointment.id : null, excludeEventId: flow === 'reschedule' ? valid.appointment.google_calendar_event_id || null : null });
  } catch {
    return derive('Ahora no puedo comprobar los huecos, así que no voy a reservar nada por aquí.', { ...offer, motivo: 'lectura_fallida', appointmentId: offer.appointment_id });
  }
  const base = flow === 'reschedule' ? { intent: 'reschedule', appointment: valid.appointment } : { intent: 'book' };
  if (!slots.length) {
    await keep({ ...base, awaiting: 'date', callback_offer: offer });
    const closed = holidayName(date) ? ' La clínica no abre ese día.' : '';
    return reply(`El ${dateLabel(date)} no queda ningún hueco libre.${closed} ¿Miramos otro día? Si lo prefieres, puedes pedir que te llamemos.`, ['Otro día', CALLBACK]);
  }
  const selection = wanted ? slots.find(slot => slot.start_local === wanted) : null;
  // "Thursday afternoon": only that part of the day is offered, unless it is full.
  const inWanted = !wanted && partOfDay ? slots.filter(slot => inPart(slot, partOfDay)) : [];
  const shown = inWanted.length ? inWanted : slots;
  const partNote = !wanted && partOfDay && !inWanted.length ? `Por la ${PARTS[partOfDay]} no quedan huecos ese día. ` : '';
  await keep({ ...base, date, slots: shown, selection: selection || null, awaiting: selection ? 'confirm' : 'slot', request_id: crypto.randomUUID(), callback_offer: offer });
  if (selection) return reply(flow === 'reschedule'
    ? `Tengo libre el ${dateTimeLabel(selection.start_at)}. ¿Confirmas el cambio de tu cita del ${dateTimeLabel(valid.appointment.inicio_en)}?`
    : `Tengo libre el ${dateTimeLabel(selection.start_at)}. ¿Confirmas la reserva?`, CONFIRM_OPTIONS);
  return reply(`${wanted ? `A las ${wanted} no me queda hueco. ` : partNote}Estos son los huecos libres del ${dateLabel(date)}${inWanted.length ? ` por la ${PARTS[partOfDay]}` : ''}:\n${shown.map((slot, index) => `${index + 1}. ${slot.start_local}`).join('\n')}\n¿Cuál te va mejor? Si ninguno te encaja, dime otro día o pide que te llamemos.`,
    [...shown.map(slot => slot.start_local), CALLBACK]);
}

async function chooseAppointment({ row, action, keep, derive }) {
  const tipo = action === 'cancel' ? 'anular' : 'cambiar';
  // Less than 24 h: the request is stored and the clinic calls; the appointment is not touched.
  if (!patientMayChange(row.inicio_en)) return derive(`Quedan menos de 24 horas para tu cita del ${dateTimeLabel(row.inicio_en)}, así que el cambio lo gestiona la clínica; mientras tanto, tu cita sigue como está.`, { tipo, motivo: 'menos_24h', appointmentId: row.id });
  if (row.calendar_sync_pending) return derive(`Tu cita del ${dateTimeLabel(row.inicio_en)} está pendiente de comprobación en la clínica y ahora no puedo modificarla.`, { tipo, motivo: 'conflicto', appointmentId: row.id });
  const appointment = { id: row.id, updated_at: row.updated_at, inicio_en: row.inicio_en, fin_en: row.fin_en, google_calendar_event_id: row.google_calendar_event_id || null };
  if (action === 'cancel') {
    await keep({ intent: 'cancel', appointment, awaiting: 'confirm' });
    return reply(`¿Confirmas que quieres anular tu cita del ${dateTimeLabel(row.inicio_en)}?`, CONFIRM_OPTIONS);
  }
  const next = await keep({ intent: 'reschedule', appointment, awaiting: 'date' });
  return reply(`Vamos a cambiar tu cita del ${dateTimeLabel(row.inicio_en)}. ¿Para qué día la quieres?`, [], { [NEXT_STATE]: next });
}

async function confirmBooking({ valid, patient, save, derive, config, link }) {
  const selected = valid.selection;
  if (Date.parse(selected.start_at) <= Date.now()) { await save({}); return reply('Ese horario ya ha pasado. Dime otra fecha para consultar los huecos.'); }
  let fresh;
  try { fresh = await buildPublicBookingSlots({ professionalId: config.professionalId, dateOnly: valid.date || selected.start_at.slice(0, 10) }); }
  catch { return derive('Ahora no puedo volver a comprobar ese hueco, así que no lo reservo.', { tipo: 'reservar', motivo: 'lectura_fallida', date: valid.date || null, hour: selected.start_local || null }); }
  if (valid.date && !fresh.some(slot => slot.start_at === selected.start_at)) {
    await save({});
    return reply('Ese horario acaba de ocuparse. Dime de nuevo el día y te mostraré los huecos libres.');
  }
  const requestId = valid.request_id || crypto.randomUUID();
  await save({ ...valid, request_id: requestId, processing: { op: 'create', at: new Date().toISOString(), request_id: requestId, start_at: selected.start_at } });
  try {
    const result = await createCrmAppointment({ patientId: patient.id, professionalId: config.professionalId,
      startAt: selected.start_at, endAt: selected.end_at, status: needsClinicReview(patient) ? 'pendiente' : 'confirmada', channel: link.canal,
      reason: 'Reserva de paciente por mensajería', requestId });
    await save({}).catch(() => {});
    return announceCreated({ row: result.data, startAt: selected.start_at, patient, link, config });
  } catch (error) {
    if (error.status === 409 && error.responsePayload?.code !== 'duplicate_request') {
      await save({});
      return reply('Ese horario acaba de ocuparse. Dime de nuevo el día y te mostraré los huecos libres.');
    }
    return recoverProcessing({ state: { processing: { op: 'create', at: new Date().toISOString(), request_id: requestId, start_at: selected.start_at } }, patient, save, immediate: true,
      callback: (intro, details) => derive(intro, { ...details, keepState: true }), onCreated: (row) => announceCreated({ row, startAt: row.inicio_en, patient, link, config }) });
  }
}

const createdReply = (row, startAt) => row?.estado === 'pendiente'
  ? reply(`Solicitud de cita registrada para el ${dateTimeLabel(startAt)}, pendiente de confirmación por la clínica. Te confirmaremos por aquí.`, MENU)
  : calendarPending(row)
    ? reply(`Tu cita del ${dateTimeLabel(startAt)} está registrada en la clínica, pero su calendario aún no la ha confirmado. No la repitas: la clínica lo comprobará.`, MENU)
    : reply(`¡Listo! Cita confirmada para el ${dateTimeLabel(startAt)}. Te enviaremos un recordatorio el día anterior.`, MENU);

// A new patient's booking waits for the clinic: it also appears among the contact requests, with its own alert.
async function announceCreated({ row, startAt, patient, link, config }) {
  if (row?.estado === 'pendiente' && needsClinicReview(patient)) {
    const phone = normalizeContactPhone(patient.telefono) || normalizeContactPhone(link.telefono);
    if (phone) {
      await registerContactRequest({ clinicId: config.clinicId, patientId: patient.id, linkId: link.id, canal: link.canal, chatId: link.chat_id, phone,
        tipo: 'reservar', motivo: 'revisar_paciente_nuevo', appointmentId: row.id, requestId: `cita:${row.id}` })
        .then(({ row: request, created }) => created && notifyContactRequest(request, { patientName: `${patient.nombre} ${patient.apellidos || ''}`.trim(), professionalId: config.professionalId }))
        .catch(() => {});
    }
  }
  return createdReply(row, startAt);
}

async function confirmChange({ valid, patient, save, derive, config }) {
  let current;
  const tipo = valid.intent === 'cancel' ? 'anular' : 'cambiar';
  try { current = await readOwnAppointment(patient.id, valid.appointment.id); } catch { return derive('Ahora no puedo leer tu cita para modificarla.', { tipo, motivo: 'lectura_fallida', appointmentId: valid.appointment.id }); }
  if (!current || !ACTIVE_STATUSES.includes(current.estado) || current.updated_at !== valid.appointment.updated_at || current.fisioterapeuta_id !== config.professionalId) {
    await save({});
    return reply('Tu cita ha cambiado desde que empezamos. Consulta de nuevo tus citas antes de modificarla.', MENU);
  }
  // Re-checked at confirmation: time passes while the patient decides.
  if (!patientMayChange(current.inicio_en)) return derive(`Quedan menos de 24 horas para tu cita del ${dateTimeLabel(current.inicio_en)}, así que el cambio lo gestiona la clínica; mientras tanto, tu cita sigue como está.`, { tipo, motivo: 'menos_24h', appointmentId: current.id });
  const cancel = valid.intent === 'cancel';
  if (!cancel) {
    let fresh;
    try {
      fresh = await buildPublicBookingSlots({ professionalId: config.professionalId, dateOnly: valid.date, excludeId: current.id, excludeEventId: current.google_calendar_event_id || null });
    } catch { return derive('Ahora no puedo volver a comprobar ese hueco, así que no cambio tu cita.', { tipo, motivo: 'lectura_fallida', date: valid.date, hour: valid.selection.start_local || null, appointmentId: current.id }); }
    if (!fresh.some(slot => slot.start_at === valid.selection.start_at)) {
      await save({ intent: 'reschedule', appointment: valid.appointment, awaiting: 'date', expires_at: new Date(Date.now() + SELECTION_TTL_MS).toISOString() });
      return reply('Ese horario acaba de ocuparse. ¿Qué otro día te viene bien?');
    }
  }
  const processing = { op: valid.intent, at: new Date().toISOString(), appointment_id: current.id, expected_updated_at: current.updated_at,
    start_at: cancel ? current.inicio_en : valid.selection.start_at, previous_start_at: current.inicio_en };
  await save({ ...valid, processing });
  try {
    const result = await updateCrmAppointment(current, cancel ? { status: 'cancelada' }
      : { startAt: valid.selection.start_at, endAt: valid.selection.end_at, status: 'reprogramada' });
    await save({}).catch(() => {});
    return changedReply(processing, result.data);
  } catch (error) {
    const code = error.responsePayload?.code;
    if (error.status === 409 && code === 'CALENDAR_CHECK_REQUIRED') return derive('Tu cita está pendiente de comprobación en la clínica y no puedo modificarla ahora.', { tipo, motivo: 'conflicto', appointmentId: current.id });
    if (error.status === 409 && code === 'APPOINTMENT_CHANGED') { await save({}); return reply('Tu cita ha cambiado desde que empezamos. Consulta de nuevo tus citas.', MENU); }
    if (error.status === 409) { await save({ intent: 'reschedule', appointment: valid.appointment, awaiting: 'date', expires_at: new Date(Date.now() + SELECTION_TTL_MS).toISOString() }); return reply('Ese horario acaba de ocuparse. ¿Qué otro día te viene bien?'); }
    return recoverProcessing({ state: { processing }, patient, save, immediate: true, callback: (intro, details) => derive(intro, { ...details, keepState: true }) });
  }
}

const changedReply = (processing, row) => {
  const pending = calendarPending(row) ? ' La clínica aún debe confirmar su calendario; no hace falta repetirlo.' : '';
  return processing.op === 'cancel'
    ? reply(`Hecho: tu cita del ${dateTimeLabel(processing.previous_start_at)} queda anulada.${pending}`, MENU)
    : reply(`Hecho: tu cita ha cambiado al ${dateTimeLabel(processing.start_at)}.${pending}`, MENU);
};

// Never repeats a mutation: the outcome of an interrupted one is read back by its reference.
async function recoverProcessing({ state, patient, save, immediate = false, callback = null, onCreated = null }) {
  const { processing } = state;
  const settled = Date.now() - Date.parse(processing.at) >= UNCERTAIN_SETTLE_MS;
  const intro = 'Aún no tengo confirmación de tu última operación. No la repetiré para evitar duplicados; escríbeme de nuevo en unos minutos y lo comprobaré.';
  // Plan B without touching the pending state: the next message still reads the real outcome.
  const uncertain = async () => {
    const tipo = processing.op === 'create' ? 'reservar' : processing.op === 'cancel' ? 'anular' : 'cambiar';
    const stored = callback && await callback(intro, { tipo, motivo: 'incierto', appointmentId: processing.appointment_id || null }).catch(() => null);
    return stored || reply(`${intro} Si lo prefieres, contacta con la clínica.`);
  };
  try {
    if (processing.op === 'create') {
      const { data, error } = await supabase.from('crm_citas').select(APPOINTMENT_FIELDS).eq('request_id', processing.request_id).eq('paciente_id', patient.id).maybeSingle();
      if (error) throw error;
      if (data) { await save({}).catch(() => {}); return onCreated ? onCreated(data) : createdReply(data, data.inicio_en); }
      if (!settled || immediate) return uncertain();
      await save({});
      return reply('Tu última reserva no llegó a registrarse. Si quieres, elige de nuevo un día.', MENU);
    }
    const row = await readOwnAppointment(patient.id, processing.appointment_id);
    if (!row) { await save({}); return reply('No encuentro esa cita. Consulta de nuevo tus citas o contacta con la clínica.', MENU); }
    const applied = row && row.updated_at !== processing.expected_updated_at
      && (processing.op === 'cancel' ? row.estado === 'cancelada' : Date.parse(row.inicio_en) === Date.parse(processing.start_at));
    if (applied) { await save({}).catch(() => {}); return changedReply(processing, row); }
    if (row && row.updated_at !== processing.expected_updated_at) { await save({}); return reply('Tu cita ha cambiado en la clínica. Consulta de nuevo tus citas.', MENU); }
    if (!settled || immediate) return uncertain();
    await save({});
    return reply(`El cambio no llegó a aplicarse; tu cita sigue el ${dateTimeLabel(processing.previous_start_at)}.`, MENU);
  } catch {
    return uncertain();
  }
}
