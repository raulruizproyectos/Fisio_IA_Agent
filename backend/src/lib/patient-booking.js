import crypto from 'node:crypto';
import { supabase, serviceSupabase } from './supabase.js';
import { reportError } from './approved-exercise-report.js';
import { getMessagingPilotConfig } from './openwa.js';
import { normalizeAppointmentText, parseNaturalAppointmentSlots } from './appointment-text.js';
import { buildPublicBookingSlots, getPublicBookingBounds, PUBLIC_BOOKING_TIMEZONE, createCrmAppointment } from '../routes/professional.js';

export async function getPilotPatient(patientId, config = getMessagingPilotConfig()) {
  const { data, error } = await supabase.from('crm_pacientes').select('id, nombre, apellidos, telefono, clinica_id, created_by_profile_id')
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
  return { linked: false, expires_at: expires, invitation: `Envía VINCULAR ${code} al canal de pruebas de tu clínica. Al vincular autorizas recibir tus planes de ejercicios y gestionar reservas por este canal.` };
}

export async function resolvePilotLink(canal, chatId, text, config) {
  const code = String(text || '').trim().match(/^\/?vincular\s+([\da-f]{24})$/i)?.[1]?.toUpperCase();
  if (code) {
    const result = await serviceSupabase.from('crm_mensajeria_vinculos').select('*')
      .eq('clinica_id', config.clinicId).eq('canal', canal).eq('codigo_hash', hash(code)).gt('codigo_expira_en', new Date().toISOString()).is('chat_id', null).maybeSingle();
    if (result.error) throw result.error;
    const link = result.data;
    if (!link || (canal === 'whatsapp' && link.telefono + '@c.us' !== chatId)) return { reply: 'Código no válido para este canal o teléfono. Pide una invitación nueva a la clínica.' };
    await getPilotPatient(link.paciente_id, config);
    const update = await serviceSupabase.from('crm_mensajeria_vinculos')
      .update({ chat_id: chatId, consentimiento_en: new Date().toISOString(), baja_en: null, codigo_hash: null, codigo_expira_en: null })
      .eq('id', link.id).eq('codigo_hash', hash(code)).is('chat_id', null).select('*').maybeSingle();
    if (update.error) throw update.error;
    return { link: update.data, reply: update.data ? 'Vinculación completada. ¿Para qué día necesitas cita?' : 'El código ya se ha utilizado.' };
  }
  const result = await serviceSupabase.from('crm_mensajeria_vinculos').select('*')
    .eq('clinica_id', config.clinicId).eq('canal', canal).eq('chat_id', chatId).not('consentimiento_en', 'is', null).is('baja_en', null).maybeSingle();
  if (result.error) throw result.error;
  return { link: result.data, reply: result.data ? null : 'Pide a tu clínica una invitación para vincularte y reservar citas.' };
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

const slotLabel = (slot) => new Intl.DateTimeFormat('es-ES', { timeZone: PUBLIC_BOOKING_TIMEZONE, dateStyle: 'full', timeStyle: 'short' }).format(new Date(slot.start_at));

export async function respondToPatientBooking(link, text, config) {
  const patient = await getPilotPatient(link.paciente_id, config);
  const normalized = normalizeAppointmentText(text);
  const current = link.reserva || {};
  if (/^(baja|stop)$/.test(normalized)) {
    const { data, error } = await serviceSupabase.from('crm_mensajeria_vinculos').update({ chat_id: null, baja_en: new Date().toISOString(), reserva: {}, version: link.version+1 })
      .eq('id', link.id).eq('version', link.version).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw reportError(409, 'Otro mensaje cambió el vínculo; la clínica debe comprobar la baja');
    return 'Has desactivado este canal. No recibirás nuevos planes por aquí. Tus citas registradas se mantienen; contacta con la clínica para gestionarlas.';
  }
  await requirePilotProfessional(patient, config);
  if (current.processing) return 'Tu última confirmación requiere comprobación de la clínica. No repetiré la reserva.';
  const validState = current.expires_at && Date.parse(current.expires_at) > Date.now() ? current : {};
  const save = async (reserva) => {
    const result = await serviceSupabase.from('crm_mensajeria_vinculos').update({ reserva, version: link.version + 1 })
      .eq('id', link.id).eq('version', link.version).select('id').maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw reportError(409, 'Otro mensaje cambió la reserva; consulta otra vez antes de confirmar');
  };
  if (/^(confirmar|confirmo|si|si,? confirmo)$/.test(normalized) && validState.selection) {
    const selected = validState.selection;
    if (Date.parse(selected.start_at) <= Date.now()) { await save({}); return 'Ese horario ya ha pasado. Dime otra fecha para consultar los huecos.'; }
    await save({ ...validState, processing: true });
    try {
      const result = await createCrmAppointment({ patientId: patient.id, professionalId: config.professionalId,
        startAt: selected.start_at, endAt: selected.end_at, status: 'confirmada', channel: link.canal,
        reason: 'Reserva de paciente por mensajería', requestId: validState.request_id });
      const finish = await serviceSupabase.from('crm_mensajeria_vinculos').update({ reserva: { appointment_id: result.data.id } })
        .eq('id', link.id).eq('version', link.version + 1);
      if (finish.error) return `Cita registrada para ${slotLabel(selected)}. La clínica debe comprobar el registro del chat; no repitas la reserva.`;
      return `Cita confirmada para ${slotLabel(selected)}. Para cambiarla o cancelarla, contacta con la clínica.`;
    } catch (error) {
      if (error.status === 409 && error.responsePayload?.code !== 'duplicate_request') {
        const reset = await serviceSupabase.from('crm_mensajeria_vinculos').update({ reserva: {} }).eq('id', link.id).eq('version', link.version + 1);
        if (reset.error) throw reset.error;
        return 'Ese horario acaba de ocuparse. Dime de nuevo el día y te mostraré los huecos disponibles.';
      }
      return 'No puedo confirmar el resultado de la reserva. La clínica debe comprobarlo antes de intentarlo de nuevo.';
    }
  }
  if (/^(cancelar|reiniciar)$/.test(normalized)) { await save({}); return 'He descartado la selección pendiente. Para cancelar una cita registrada, contacta con la clínica.'; }
  const choice = /^(?:opcion\s+)?(\d{1,2})$/.exec(normalized);
  if (choice && validState.slots?.[Number(choice[1]) - 1]) {
    const selection = validState.slots[Number(choice[1]) - 1];
    await save({ ...validState, selection, request_id: crypto.randomUUID() });
    return `Has elegido ${slotLabel(selection)}. Responde CONFIRMAR para reservar o CANCELAR para descartarlo.`;
  }
  const exactDate = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
  const parsed = parseNaturalAppointmentSlots(text);
  const parsedDate = parsed.slotStart?.slice(0,10) || (parsed.parsedYear ? `${parsed.parsedYear}-${String(parsed.parsedMonth).padStart(2,'0')}-${String(parsed.parsedDay).padStart(2,'0')}` : null);
  const date = exactDate || parsedDate || (parsed.missingDay ? validState.date : null);
  const { today, maxDate } = getPublicBookingBounds();
  if (!date || date < today || date > maxDate) return `Dime qué día necesitas cita: por ejemplo «mañana», «el lunes» o una fecha entre ${today} y ${maxDate}.`;
  const slots = await buildPublicBookingSlots({ professionalId: config.professionalId, dateOnly: date });
  if (!slots.length) { await save({}); return 'No quedan huecos disponibles ese día. Dime otra fecha.'; }
  const desiredClock = normalized.match(/(?:a\s+las?\s+)?\b(\d{1,2}):(\d{2})\b/);
  const clock = desiredClock ? desiredClock[1].padStart(2,'0') + ':' + desiredClock[2] : parsed.slotStart?.slice(11,16)
    || (parsed.missingDay ? String(parsed.parsedHour).padStart(2,'0') + ':' + String(parsed.parsedMinutes).padStart(2,'0') : null);
  const selection = clock ? slots.find(slot => slot.start_local === clock) : null;
  await save({ date, slots, selection: selection || null, expires_at: new Date(Date.now() + 10*60*1000).toISOString(), request_id: crypto.randomUUID() });
  if (selection) return `Hay un hueco el ${slotLabel(selection)}. Responde CONFIRMAR para reservar o CANCELAR para descartarlo.`;
  return `Horarios para ${date}:\n${slots.map((slot, index) => `${index+1}. ${slot.start_local}`).join('\n')}\nResponde con el número de la opción.`;
}
