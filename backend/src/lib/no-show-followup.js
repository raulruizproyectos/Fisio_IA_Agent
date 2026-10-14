import { serviceSupabase } from './supabase.js';
import { getMessagingPilotConfig } from './openwa.js';
import { claimMessagingEvent, finishMessagingEvent } from './patient-booking.js';

// Follow-up after a no-show (PROPUESTA_PRODUCTO.md §8, item 5), reviewed mode: the daily digest lists
// yesterday's absences with one command each; nothing reaches a patient until the physio taps it.
// The message only carries the first name and the day: never clinical data, never the model.

const TIMEZONE = 'Europe/Madrid';
const DAY = 86_400_000;
export const FOLLOW_UP_SESSION = 'no_show_followup';
export const FOLLOW_UP_MAX_DAYS = 7;
export const FOLLOW_UP_BUTTON = 'Reservar cita';
const ACTIVE_APPOINTMENT = ['pendiente', 'confirmada', 'reprogramada'];
const COMMAND = /^\/seguimiento_([\da-f]{12})(?:@\w+)?$/i;

const madridDate = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date(ms));
const dayLabel = (iso) => new Intl.DateTimeFormat('es-ES', { timeZone: TIMEZONE, weekday: 'long', day: 'numeric', month: 'long' })
  .format(new Date(iso)).replace(',', '');
const shortDate = (iso) => new Intl.DateTimeFormat('es-ES', { timeZone: TIMEZONE, day: 'numeric', month: 'short' }).format(new Date(iso));
const firstName = (patient) => String(patient?.nombre || '').trim();
const label = (patient) => {
  const initial = String(patient?.apellidos || '').trim().charAt(0);
  return [firstName(patient) || 'Paciente', initial && `${initial.toUpperCase()}.`].filter(Boolean).join(' ');
};

// Short and stable: 12 hex characters of the appointment id keep the command tappable in Telegram.
export const followUpCode = (appointmentId) => String(appointmentId).replace(/-/g, '').slice(0, 12).toLowerCase();
export const followUpCommand = (appointmentId) => `/seguimiento_${followUpCode(appointmentId)}`;
export const yesterdayOf = (today) => new Date(Date.parse(`${today}T12:00:00Z`) - DAY).toISOString().slice(0, 10);

export function followUpText({ patient, startAt, now = Date.now() }) {
  const name = firstName(patient);
  const when = madridDate(Date.parse(startAt)) === yesterdayOf(madridDate(now)) ? 'Ayer' : `El ${dayLabel(startAt)}`;
  return `${name ? `Hola, ${name}.` : 'Hola.'} ${when} te echamos de menos en tu cita de fisioterapia. Si quieres, puedes reservar una nueva cita aquí mismo: escribe /reservar o pulsa el botón.`;
}

const activeLink = (link) => Boolean(link?.chat_id && link.consentimiento_en && !link.baja_en);

// One entry per absence; `status` says what the physio can do with it.
export function noShowFollowUps({ noShows, futureAppointments = [], links = [], sentIds = [] }) {
  const next = new Map();
  for (const row of futureAppointments) {
    if (!next.has(row.paciente_id) || row.inicio_en < next.get(row.paciente_id)) next.set(row.paciente_id, row.inicio_en);
  }
  const linked = new Set(links.filter(activeLink).map(link => link.paciente_id));
  const sent = new Set(sentIds);
  return noShows.filter(row => row.patient?.activo !== false).map(row => ({
    ...row,
    nextStart: next.get(row.paciente_id) || null,
    status: sent.has(row.id) ? 'enviado' : next.has(row.paciente_id) ? 'tiene_cita' : linked.has(row.paciente_id) ? 'enviar' : 'sin_telegram',
  }));
}

export function buildNoShowDigest({ day, items }) {
  const timeLabel = (iso) => new Intl.DateTimeFormat('es-ES', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const lines = [`Ausencias de ayer, ${dayLabel(`${day}T12:00:00Z`)}: ${items.length}`];
  for (const row of items) {
    const who = `${timeLabel(row.inicio_en)} · ${label(row.patient)}`;
    if (row.status === 'enviar') lines.push(`${who} → ${followUpCommand(row.id)}`);
    else if (row.status === 'tiene_cita') lines.push(`${who} · ya tiene cita el ${shortDate(row.nextStart)}`);
    else if (row.status === 'enviado') lines.push(`${who} · seguimiento ya enviado`);
    else lines.push(`${who} · sin Telegram vinculado${row.patient?.telefono ? ` · ${row.patient.telefono}` : ''}`);
  }
  const example = items.find(row => row.status === 'enviar');
  lines.push('', example
    ? `Pulsa un comando para enviarle: «${followUpText({ patient: example.patient, startAt: example.inicio_en, now: Date.parse(`${day}T12:00:00Z`) + DAY })}» con el botón «${FOLLOW_UP_BUTTON}». Hasta entonces no se escribe a nadie.`
    : 'No se ha escrito a ningún paciente.');
  return lines.join('\n');
}

async function rows(builder) {
  const { data, error } = await builder;
  if (error) throw error;
  return data || [];
}

const PATIENT = 'crm_pacientes!inner(nombre, apellidos, clinica_id, activo, telefono)';
const withPatient = list => list.map(({ crm_pacientes: patient, ...row }) => ({ ...row, patient }));

// Absences in [from, to) for this professional, with what the follow-up depends on.
export async function loadNoShowFollowUps({ profile, from, to, now = Date.now() }) {
  const noShows = withPatient(await rows(serviceSupabase.from('crm_citas').select(`id, paciente_id, inicio_en, ${PATIENT}`)
    .eq('fisioterapeuta_id', profile.id).eq('crm_pacientes.clinica_id', profile.clinica_id).eq('estado', 'no_show')
    .gte('inicio_en', from).lt('inicio_en', to).order('inicio_en')));
  if (!noShows.length) return [];
  const patientIds = [...new Set(noShows.map(row => row.paciente_id))];
  const [futureAppointments, links, sent] = await Promise.all([
    rows(serviceSupabase.from('crm_citas').select('paciente_id, inicio_en, crm_pacientes!inner(clinica_id)')
      .eq('crm_pacientes.clinica_id', profile.clinica_id).in('paciente_id', patientIds).in('estado', ACTIVE_APPOINTMENT)
      .gt('inicio_en', new Date(now).toISOString())),
    rows(serviceSupabase.from('crm_mensajeria_vinculos').select('paciente_id, chat_id, consentimiento_en, baja_en')
      .eq('clinica_id', profile.clinica_id).eq('canal', 'telegram').in('paciente_id', patientIds)),
    rows(serviceSupabase.from('crm_mensajeria_eventos').select('message_id')
      .eq('clinica_id', profile.clinica_id).eq('session_id', FOLLOW_UP_SESSION).in('message_id', noShows.map(row => row.id))),
  ]);
  return noShowFollowUps({ noShows, futureAppointments, links, sentIds: sent.map(row => row.message_id) });
}

// Runs when the physio taps a command in the professional bot. `send(chatId, text)` delivers through
// the patient bot. Returns the reply for the physio. Each absence is sent at most once.
export async function sendNoShowFollowUp({ chatId, command, send, now = Date.now() }) {
  const config = getMessagingPilotConfig();
  const { data: profile, error } = await serviceSupabase.from('crm_perfiles').select('id, clinica_id, telegram_chat_id')
    .eq('id', config.professionalId).eq('clinica_id', config.clinicId).maybeSingle();
  if (error) throw error;
  if (!profile?.telegram_chat_id || String(profile.telegram_chat_id) !== String(chatId)) return 'Este comando solo está disponible para el fisioterapeuta de la clínica.';
  const code = COMMAND.exec(String(command || '').trim())?.[1]?.toLowerCase();
  if (!code) return 'Comando de seguimiento no válido.';
  const items = (await loadNoShowFollowUps({ profile, from: new Date(now - FOLLOW_UP_MAX_DAYS * DAY).toISOString(), to: new Date(now).toISOString(), now }))
    .filter(row => followUpCode(row.id) === code);
  if (items.length !== 1) return `No encuentro esa ausencia. El seguimiento solo se puede enviar durante ${FOLLOW_UP_MAX_DAYS} días y si la cita sigue marcada como no presentada.`;
  const [item] = items;
  const who = label(item.patient);
  if (item.status === 'enviado') return `Ya enviaste el seguimiento a ${who}; no lo repito.`;
  if (item.status === 'tiene_cita') return `${who} ya tiene cita el ${shortDate(item.nextStart)}; no le escribo.`;
  if (item.status === 'sin_telegram') return `${who} no tiene Telegram vinculado; si quieres, llámale${item.patient?.telefono ? ` al ${item.patient.telefono}` : ''}.`;

  const link = await serviceSupabase.from('crm_mensajeria_vinculos').select('chat_id, consentimiento_en, baja_en')
    .eq('clinica_id', profile.clinica_id).eq('canal', 'telegram').eq('paciente_id', item.paciente_id).maybeSingle();
  if (link.error) throw link.error;
  if (!activeLink(link.data)) return `${who} no tiene Telegram vinculado; si quieres, llámale.`;
  const eventId = await claimMessagingEvent({ canal: 'telegram', sessionId: FOLLOW_UP_SESSION, event: 'followup.sent', messageId: item.id, chatId: link.data.chat_id }, config);
  if (!eventId) return `Ya enviaste el seguimiento a ${who}; no lo repito.`;
  try {
    await send(link.data.chat_id, followUpText({ patient: item.patient, startAt: item.inicio_en, now }));
  } catch {
    try { await finishMessagingEvent(eventId, 'revision_manual'); } catch { /* The claim already prevents a second send. */ }
    return `No he podido confirmar el envío a ${who}; no lo repetiré. Si hace falta, llámale.`;
  }
  try { await finishMessagingEvent(eventId, 'procesado'); } catch { /* Delivered; the claim still blocks a repeat. */ }
  return `Seguimiento enviado a ${who}; si responde, el agente de citas le ayudará a reservar.`;
}
