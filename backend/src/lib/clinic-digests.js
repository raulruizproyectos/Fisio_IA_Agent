import { serviceSupabase } from './supabase.js';
import { holidayName } from './clinic-calendar.js';

// Scheduled summaries for the physio (PROPUESTA_PRODUCTO.md §8, items 3, 4, 6 and 7).
// n8n only triggers them and delivers the text through the professional bot; what is included,
// and whether anything is sent at all, is decided here. Only names and times: never clinical data.

const TIMEZONE = 'Europe/Madrid';
const MINUTE = 60_000;
const DAY = 86_400_000;
const ACTIVE_APPOINTMENT = ['pendiente', 'confirmada', 'reprogramada'];
const CLOSED_INVOICE = ['pagada', 'anulada'];

export const DIGEST_KINDS = ['agenda_diaria', 'calendar_pendiente', 'bonos_pagos', 'reactivacion'];
export const CALENDAR_STALE_MINUTES = 15;
export const REACTIVATION_AFTER_DAYS = 21;
export const REACTIVATION_LOOKBACK_DAYS = 90;
export const BONO_EXPIRY_DAYS = 14;

const madridDate = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date(ms));
const timeLabel = (iso) => new Intl.DateTimeFormat('es-ES', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const dayLabel = (dateOnly) => new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
  .format(new Date(`${dateOnly}T12:00:00Z`));
const shortDate = (iso) => new Intl.DateTimeFormat('es-ES', { timeZone: TIMEZONE, day: 'numeric', month: 'short' }).format(new Date(iso));
const euros = (value) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0);

// "Ana P." — enough for the physio to recognise the patient in a Telegram preview.
export function shortName(patient) {
  const first = String(patient?.nombre || '').trim();
  const initial = String(patient?.apellidos || '').trim().charAt(0);
  return [first || 'Paciente', initial && `${initial.toUpperCase()}.`].filter(Boolean).join(' ');
}

const STATE_LABEL = { pendiente: 'pendiente de confirmar', confirmada: 'confirmada', reprogramada: 'reprogramada' };

export function buildDailyAgenda({ today, appointments, openRequests = 0, calendarPending = 0 }) {
  const lines = [`Agenda de hoy, ${dayLabel(today)}: ${appointments.length === 0 ? 'sin citas' : `${appointments.length} ${appointments.length === 1 ? 'cita' : 'citas'}`}`];
  for (const row of appointments) lines.push(`${timeLabel(row.inicio_en)} · ${shortName(row.patient)} · ${STATE_LABEL[row.estado] || row.estado}${row.newPatient ? ' · ficha nueva por revisar' : ''}`);
  const pending = appointments.filter(row => row.estado === 'pendiente').length;
  const notes = [
    pending && `${pending} por confirmar en Agenda`,
    openRequests && `${openRequests} ${openRequests === 1 ? 'solicitud' : 'solicitudes'} de llamada en Inicio`,
    calendarPending && `${calendarPending} sin sincronizar con Google Calendar`,
  ].filter(Boolean);
  if (notes.length) lines.push('', `Pendiente: ${notes.join('; ')}.`);
  return lines.join('\n');
}

export function buildCalendarAlert(appointments) {
  return [
    `Google Calendar: ${appointments.length === 1 ? '1 cita lleva' : `${appointments.length} citas llevan`} más de ${CALENDAR_STALE_MINUTES} min sin sincronizar.`,
    ...appointments.map(row => `${shortDate(row.inicio_en)} ${timeLabel(row.inicio_en)} · ${shortName(row.patient)}`),
    'La cita está guardada en el CRM; revisa que también figure en Calendar.',
  ].join('\n');
}

export function buildBonosPayments({ bonos, invoices }) {
  const lines = ['Resumen semanal de cobros'];
  if (bonos.length) {
    lines.push('', 'Bonos por terminar o caducar:');
    for (const b of bonos) {
      const left = Math.max(0, (b.sesiones_total || 0) - (b.sesiones_usadas || 0));
      lines.push(`${shortName(b.patient)} · ${b.nombre || 'Bono'} · ${left} ${left === 1 ? 'sesión' : 'sesiones'}${b.fecha_caducidad ? ` · caduca ${dayLabel(b.fecha_caducidad)}` : ''}`);
    }
  }
  if (invoices.length) {
    const total = invoices.reduce((sum, f) => sum + (Number(f.importe_total) || 0), 0);
    lines.push('', `Facturas sin cobrar: ${invoices.length} (${euros(total)})`);
    for (const f of invoices) lines.push(`${f.numero || 'Sin número'} · ${shortName(f.patient)} · ${euros(f.importe_total)}`);
  }
  return lines.join('\n');
}

export function buildReactivation(patients) {
  return [
    `Pacientes sin próxima cita (última visita hace más de ${REACTIVATION_AFTER_DAYS} días):`,
    ...patients.map(p => `${shortName(p)} · última ${shortDate(p.lastVisit)}${p.telefono ? ` · ${p.telefono}` : ''}`),
    'Solo para tu revisión: no se ha escrito a ningún paciente.',
  ].join('\n');
}

// Last appointment per patient in the look-back window; keep those with nothing ahead.
export function patientsToReactivate({ appointments, now }) {
  const byPatient = new Map();
  for (const row of appointments) {
    const entry = byPatient.get(row.paciente_id) || { last: 0, future: false, patient: row.patient };
    const start = Date.parse(row.inicio_en);
    if (start > now) entry.future = true; else entry.last = Math.max(entry.last, start);
    byPatient.set(row.paciente_id, entry);
  }
  return [...byPatient.values()]
    .filter(e => !e.future && e.last && now - e.last > REACTIVATION_AFTER_DAYS * DAY && e.patient?.activo !== false)
    .sort((a, b) => a.last - b.last)
    .map(e => ({ ...e.patient, lastVisit: new Date(e.last).toISOString() }));
}

async function professional(professionalId) {
  if (!professionalId) return null;
  const { data, error } = await serviceSupabase.from('crm_perfiles').select('id, clinica_id, telegram_chat_id').eq('id', professionalId).maybeSingle();
  if (error) throw error;
  return data;
}

const PATIENT = 'crm_pacientes!inner(nombre, apellidos, clinica_id, activo, telefono, origen_alta, revisada_en)';
const withPatient = rows => (rows || []).map(({ crm_pacientes: patient, ...row }) => ({ ...row, patient }));

async function query(builder) {
  const { data, error } = await builder;
  if (error) throw error;
  return data || [];
}

// Returns { send, chat_id, text, count }. `send: false` means there is nothing worth a message.
export async function buildDigest(kind, { professionalId = process.env.MESSAGING_PILOT_PROFESSIONAL_ID, now = Date.now() } = {}) {
  if (!DIGEST_KINDS.includes(kind)) throw Object.assign(new Error('Resumen desconocido'), { status: 404 });
  const profile = await professional(String(professionalId || '').trim());
  if (!profile?.telegram_chat_id) return { send: false, reason: 'sin_chat_profesional', count: 0 };
  const clinicId = profile.clinica_id;
  const reply = (text, count) => ({ send: true, chat_id: profile.telegram_chat_id, text, count });

  if (kind === 'agenda_diaria') {
    const today = madridDate(now);
    const holiday = holidayName(today);
    if (holiday) return { send: false, reason: 'festivo', holiday, count: 0 };
    const from = new Date(now - DAY).toISOString();
    const to = new Date(now + 2 * DAY).toISOString();
    const rows = withPatient(await query(serviceSupabase.from('crm_citas').select(`id, inicio_en, estado, calendar_sync_pending, ${PATIENT}`)
      .eq('fisioterapeuta_id', profile.id).eq('crm_pacientes.clinica_id', clinicId).in('estado', ACTIVE_APPOINTMENT)
      .gte('inicio_en', from).lt('inicio_en', to).order('inicio_en')));
    const appointments = rows.filter(r => madridDate(Date.parse(r.inicio_en)) === today)
      .map(r => ({ ...r, newPatient: r.patient?.origen_alta === 'asistente_telegram' && !r.patient?.revisada_en }));
    const requests = await serviceSupabase.from('crm_solicitudes_contacto').select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicId).neq('estado', 'resuelta');
    if (requests.error) throw requests.error;
    const text = buildDailyAgenda({ today, appointments, openRequests: requests.count || 0,
      calendarPending: rows.filter(r => r.calendar_sync_pending).length });
    return reply(text, appointments.length);
  }

  if (kind === 'calendar_pendiente') {
    // Each problem is reported once: when it crosses the threshold during the last hourly window.
    const rows = withPatient(await query(serviceSupabase.from('crm_citas').select(`id, inicio_en, updated_at, ${PATIENT}`)
      .eq('fisioterapeuta_id', profile.id).eq('crm_pacientes.clinica_id', clinicId).eq('calendar_sync_pending', true)
      .lt('updated_at', new Date(now - CALENDAR_STALE_MINUTES * MINUTE).toISOString())
      .gte('updated_at', new Date(now - (CALENDAR_STALE_MINUTES + 60) * MINUTE).toISOString())
      .order('inicio_en')));
    return rows.length ? reply(buildCalendarAlert(rows), rows.length) : { send: false, reason: 'nada_pendiente', count: 0 };
  }

  if (kind === 'bonos_pagos') {
    const soon = madridDate(now + BONO_EXPIRY_DAYS * DAY);
    const bonos = withPatient(await query(serviceSupabase.from('crm_bonos')
      .select(`id, nombre, sesiones_total, sesiones_usadas, fecha_caducidad, ${PATIENT}`)
      .eq('crm_pacientes.clinica_id', clinicId).eq('estado', 'activo')))
      .filter(b => (b.sesiones_total || 0) - (b.sesiones_usadas || 0) <= 1 || (b.fecha_caducidad && b.fecha_caducidad <= soon));
    const invoices = withPatient(await query(serviceSupabase.from('crm_facturas').select(`id, numero, importe_total, ${PATIENT}`)
      .eq('crm_pacientes.clinica_id', clinicId).not('estado', 'in', `(${CLOSED_INVOICE.join(',')})`).order('fecha')));
    const count = bonos.length + invoices.length;
    return count ? reply(buildBonosPayments({ bonos, invoices }), count) : { send: false, reason: 'nada_pendiente', count: 0 };
  }

  // reactivacion
  const rows = withPatient(await query(serviceSupabase.from('crm_citas').select(`paciente_id, inicio_en, ${PATIENT}`)
    .eq('fisioterapeuta_id', profile.id).eq('crm_pacientes.clinica_id', clinicId)
    .in('estado', [...ACTIVE_APPOINTMENT, 'completada'])
    .gte('inicio_en', new Date(now - REACTIVATION_LOOKBACK_DAYS * DAY).toISOString())));
  const patients = patientsToReactivate({ appointments: rows, now });
  return patients.length ? reply(buildReactivation(patients), patients.length) : { send: false, reason: 'nada_pendiente', count: 0 };
}
