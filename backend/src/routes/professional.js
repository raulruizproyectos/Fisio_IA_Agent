import { Router } from 'express';
import { google } from 'googleapis';
import { supabase } from '../index.js';

const router = Router();

function pickValue(obj, ...keys) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== '') {
      return obj[key];
    }
  }
  return null;
}

function isMissingTableError(error, tableName) {
  const msg = String(error?.message || '');
  return msg.includes(`Could not find the table 'public.${tableName}'`);
}

const APPOINTMENT_SELECT = `
  id,
  paciente_id,
  fisioterapeuta_id,
  inicio_en,
  fin_en,
  estado,
  canal_origen,
  motivo,
  google_calendar_event_id,
  request_id,
  created_at,
  updated_at,
  crm_pacientes(nombre, apellidos)
`;

const APPOINTMENT_ALLOWED_STATUSES = ['pendiente', 'confirmada', 'cancelada', 'completada', 'no_show', 'reprogramada'];
const APPOINTMENT_ACTIVE_STATUSES = ['pendiente', 'confirmada', 'reprogramada'];
const APPOINTMENT_ALLOWED_CHANNELS = ['telegram', 'crm_web', 'manual', 'n8n'];
const VIDEO_WORKFLOWS_ENABLED = process.env.ENABLE_VIDEO_WORKFLOWS === 'true';
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID?.trim() || '';
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL?.trim() || '';
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
const GOOGLE_CALENDAR_TIMEZONE = process.env.GOOGLE_CALENDAR_TIMEZONE?.trim() || 'Europe/Madrid';
const GOOGLE_CALENDAR_REQUIRED = String(process.env.GOOGLE_CALENDAR_REQUIRED || 'false').toLowerCase() === 'true';
const W5_CALENDAR_READER_URL = process.env.W5_CALENDAR_READER_URL?.trim() || 'https://n8n-n8n.b5xbaf.easypanel.host/webhook/fisio/w5/calendar-events';
const W6_CALENDAR_WRITER_URL = process.env.W6_CALENDAR_WRITER_URL?.trim() || 'https://n8n-n8n.b5xbaf.easypanel.host/webhook/fisio/w6/calendar-write';
const CALENDAR_BACKGROUND_SYNC_STALE_MS = 6 * 60 * 1000;
const CALENDAR_BACKGROUND_SYNC_INTERVAL_MS = 2 * 60 * 1000;
const calendarBackgroundSyncState = {
  status: 'idle',
  running: false,
  source: 'w6_calendar_sync',
  trigger: null,
  last_run_at: null,
  last_success_at: null,
  last_error_at: null,
  error: null,
  summary: null,
  window: null,
  professional_id: null,
};

function rejectVideoFeatureIfDisabled(res) {
  if (VIDEO_WORKFLOWS_ENABLED) return false;
  res.status(410).json({
    error: 'La funcionalidad de video está desactivada en este entorno.',
    feature: 'video_workflows',
    status: 'disabled',
  });
  return true;
}

function parseIsoTimestamp(rawValue) {
  if (!rawValue) return null;
  const date = new Date(String(rawValue));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function attachCalendarSyncMeta(row, overrides = {}) {
  const baseState = row?.google_calendar_event_id ? 'linked' : 'crm_only';
  const baseOrigin = baseState === 'crm_only' ? 'crm' : 'google_calendar';
  return {
    ...row,
    calendar_sync_state: overrides.calendar_sync_state || baseState,
    calendar_origin: overrides.calendar_origin || baseOrigin,
  };
}

function normalizeAppointmentRow(row) {
  const fullName = [row?.crm_pacientes?.nombre, row?.crm_pacientes?.apellidos].filter(Boolean).join(' ').trim();
  return attachCalendarSyncMeta({
    ...row,
    nombre_paciente: fullName || null,
  });
}

function splitFullName(fullName = '') {
  const value = String(fullName || '').trim();
  if (!value) return { nombre: 'Paciente', apellidos: null };
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { nombre: parts[0], apellidos: null };
  return {
    nombre: parts[0],
    apellidos: parts.slice(1).join(' '),
  };
}

function toIsoDateOnly(value) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function calendarDirectEnabled() {
  return Boolean(GOOGLE_CALENDAR_ID && GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY);
}

function calendarW5Enabled() {
  return Boolean(W5_CALENDAR_READER_URL);
}

function calendarW6Enabled() {
  return Boolean(W6_CALENDAR_WRITER_URL);
}

// Returns true when Calendar sync is available via ANY method (direct JWT, W5/n8n OAuth2 read, W6/n8n OAuth2 write)
function calendarIntegrationEnabled() {
  if (!GOOGLE_CALENDAR_ID) return false;
  return calendarDirectEnabled() || calendarW5Enabled() || calendarW6Enabled();
}

function buildCalendarBackgroundSyncStatus() {
  const now = Date.now();
  const lastRunAt = calendarBackgroundSyncState.last_run_at ? new Date(calendarBackgroundSyncState.last_run_at).getTime() : null;
  const lastSuccessAt = calendarBackgroundSyncState.last_success_at ? new Date(calendarBackgroundSyncState.last_success_at).getTime() : null;
  const lastErrorAt = calendarBackgroundSyncState.last_error_at ? new Date(calendarBackgroundSyncState.last_error_at).getTime() : null;
  const ageMs = Number.isFinite(lastSuccessAt) ? Math.max(0, now - lastSuccessAt) : null;
  const lastErrorAgeMs = Number.isFinite(lastErrorAt) ? Math.max(0, now - lastErrorAt) : null;
  const nextExpectedAt = Number.isFinite(lastRunAt)
    ? new Date(lastRunAt + CALENDAR_BACKGROUND_SYNC_INTERVAL_MS).toISOString()
    : null;
  let uiStatus = 'idle';

  if (calendarBackgroundSyncState.running) {
    uiStatus = 'syncing';
  } else if (calendarBackgroundSyncState.status === 'error') {
    uiStatus = 'error';
  } else if (lastSuccessAt) {
    uiStatus = ageMs !== null && ageMs <= CALENDAR_BACKGROUND_SYNC_STALE_MS ? 'healthy' : 'stale';
  }

  const mode = calendarDirectEnabled() ? 'direct' : calendarW5Enabled() ? 'w5' : 'none';

  return {
    enabled: calendarIntegrationEnabled(),
    mode,
    calendar_id: GOOGLE_CALENDAR_ID || null,
    source: calendarBackgroundSyncState.source,
    trigger: calendarBackgroundSyncState.trigger,
    status: calendarBackgroundSyncState.status,
    ui_status: uiStatus,
    running: calendarBackgroundSyncState.running,
    last_run_at: calendarBackgroundSyncState.last_run_at,
    last_success_at: calendarBackgroundSyncState.last_success_at,
    last_error_at: calendarBackgroundSyncState.last_error_at,
    age_ms: ageMs,
    last_error_age_ms: lastErrorAgeMs,
    error: calendarBackgroundSyncState.error,
    summary: calendarBackgroundSyncState.summary,
    window: calendarBackgroundSyncState.window,
    professional_id: calendarBackgroundSyncState.professional_id,
    stale_after_ms: CALENDAR_BACKGROUND_SYNC_STALE_MS,
    expected_interval_ms: CALENDAR_BACKGROUND_SYNC_INTERVAL_MS,
    next_expected_at: nextExpectedAt,
  };
}

function markCalendarBackgroundSyncStart({ professionalId, fromAt, toAt, trigger = 'background' }) {
  calendarBackgroundSyncState.status = 'syncing';
  calendarBackgroundSyncState.running = true;
  calendarBackgroundSyncState.trigger = trigger;
  calendarBackgroundSyncState.last_run_at = new Date().toISOString();
  calendarBackgroundSyncState.error = null;
  calendarBackgroundSyncState.window = { desde: fromAt, hasta: toAt };
  calendarBackgroundSyncState.professional_id = professionalId || null;
}

function markCalendarBackgroundSyncSuccess({ professionalId, fromAt, toAt, trigger = 'background', summary = null }) {
  const nowIso = new Date().toISOString();
  calendarBackgroundSyncState.status = 'ok';
  calendarBackgroundSyncState.running = false;
  calendarBackgroundSyncState.trigger = trigger;
  calendarBackgroundSyncState.last_run_at = nowIso;
  calendarBackgroundSyncState.last_success_at = nowIso;
  calendarBackgroundSyncState.error = null;
  calendarBackgroundSyncState.summary = summary;
  calendarBackgroundSyncState.window = { desde: fromAt, hasta: toAt };
  calendarBackgroundSyncState.professional_id = professionalId || null;
}

function markCalendarBackgroundSyncError({ professionalId, fromAt, toAt, trigger = 'background', error = null }) {
  const nowIso = new Date().toISOString();
  calendarBackgroundSyncState.status = 'error';
  calendarBackgroundSyncState.running = false;
  calendarBackgroundSyncState.trigger = trigger;
  calendarBackgroundSyncState.last_run_at = nowIso;
  calendarBackgroundSyncState.last_error_at = nowIso;
  calendarBackgroundSyncState.error = error ? String(error.message || error) : 'unknown_error';
  calendarBackgroundSyncState.window = { desde: fromAt, hasta: toAt };
  calendarBackgroundSyncState.professional_id = professionalId || null;
}

function buildCalendarSyncResult(partial = {}) {
  return {
    enabled: calendarIntegrationEnabled(),
    required: GOOGLE_CALENDAR_REQUIRED,
    status: partial.status || 'skipped',
    event_id: partial.event_id || null,
    action: partial.action || null,
    error: partial.error || null,
  };
}

function getGoogleCalendarClient() {
  if (!calendarDirectEnabled()) return null;
  const auth = new google.auth.JWT({
    email: GOOGLE_CLIENT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

function formatCalendarNameParts(patientName, patientPhone, professionalName) {
  const cleanPatient = String(patientName || '').trim() || 'Paciente';
  const cleanProfessional = String(professionalName || '').trim() || 'Fisioterapeuta';
  const cleanPhone = String(patientPhone || '').trim();
  return {
    summary: `Cita fisioterapia - ${cleanPatient}`,
    description: [
      `Paciente: ${cleanPatient}`,
      cleanPhone ? `Tel: ${cleanPhone}` : null,
      `Fisioterapeuta: ${cleanProfessional}`,
    ].filter(Boolean).join('\n'),
  };
}

async function fetchCalendarContext({ patientId, professionalId }) {
  const [patientResp, professionalResp] = await Promise.all([
    supabase
      .from('crm_pacientes')
      .select('nombre, apellidos, telefono')
      .eq('id', patientId)
      .maybeSingle(),
    supabase
      .from('crm_perfiles')
      .select('nombre_completo')
      .eq('id', professionalId)
      .maybeSingle(),
  ]);

  if (patientResp.error) throw patientResp.error;
  if (professionalResp.error) throw professionalResp.error;

  let patientName = [patientResp.data?.nombre, patientResp.data?.apellidos].filter(Boolean).join(' ').trim() || null;
  let patientPhone = patientResp.data?.telefono || null;

  // Fallback to legacy pacientes table (Telegram auto-onboarded patients)
  if (!patientName) {
    const { data: legacy } = await supabase
      .from('pacientes')
      .select('nombre_completo, phone')
      .eq('id', patientId)
      .maybeSingle();
    patientName = legacy?.nombre_completo || null;
    patientPhone = patientPhone || legacy?.phone || null;
  }

  const professionalName = professionalResp.data?.nombre_completo || null;
  return { patientName, patientPhone, professionalName };
}

function buildCalendarEventPayload({
  patientName,
  patientPhone,
  professionalName,
  startAt,
  endAt,
  reason,
  appointmentId,
}) {
  const nameParts = formatCalendarNameParts(patientName, patientPhone, professionalName);
  const extraReason = String(reason || '').trim();
  const description = [
    nameParts.description,
    extraReason ? `Motivo: ${extraReason}` : null,
    appointmentId ? `CRM Appointment ID: ${appointmentId}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    summary: nameParts.summary,
    description,
    start: {
      dateTime: new Date(startAt).toISOString(),
      timeZone: GOOGLE_CALENDAR_TIMEZONE,
    },
    end: {
      dateTime: new Date(endAt).toISOString(),
      timeZone: GOOGLE_CALENDAR_TIMEZONE,
    },
  };
}

function getCalendarErrorMessage(error) {
  const status = error?.response?.status;
  const message =
    error?.response?.data?.error?.message ||
    error?.message ||
    'google_calendar_sync_failed';
  return status ? `google_calendar_${status}: ${message}` : String(message);
}

async function syncAppointmentViaW6({ action, eventId, payload }) {
  if (!calendarW6Enabled()) {
    return buildCalendarSyncResult({ status: 'skipped', action, event_id: eventId || null });
  }
  try {
    const body = {
      action,
      event_id: eventId || undefined,
      calendar_id: GOOGLE_CALENDAR_ID,
      summary: payload?.summary || 'Cita fisioterapia',
      description: payload?.description || '',
      start: payload?.start?.dateTime || null,
      end: payload?.end?.dateTime || null,
    };
    const res = await fetch(W6_CALENDAR_WRITER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return buildCalendarSyncResult({ status: 'error', action, event_id: eventId || null, error: `W6 responded ${res.status}` });
    }
    const data = await res.json();
    return buildCalendarSyncResult({
      status: data?.ok ? 'synced' : 'error',
      action,
      event_id: data?.event_id || eventId || null,
    });
  } catch (error) {
    return buildCalendarSyncResult({ status: 'error', action, event_id: eventId || null, error: String(error?.message || error) });
  }
}

async function syncAppointmentToGoogleCalendar({
  action,
  eventId,
  payload,
}) {
  if (!calendarIntegrationEnabled()) {
    return buildCalendarSyncResult({ status: 'skipped', action, event_id: eventId || null });
  }

  // Try direct mode (Service Account JWT) first
  const calendarClient = getGoogleCalendarClient();
  if (calendarClient) {
    try {
      if (action === 'create') {
        const created = await calendarClient.events.insert({
          calendarId: GOOGLE_CALENDAR_ID,
          requestBody: payload,
          sendUpdates: 'none',
        });
        return buildCalendarSyncResult({
          status: 'synced',
          action,
          event_id: created.data?.id || null,
        });
      }

      if (action === 'update' && eventId) {
        await calendarClient.events.patch({
          calendarId: GOOGLE_CALENDAR_ID,
          eventId,
          requestBody: payload,
          sendUpdates: 'none',
        });
        return buildCalendarSyncResult({
          status: 'synced',
          action,
          event_id: eventId,
        });
      }

      if (action === 'cancel' && eventId) {
        try {
          await calendarClient.events.delete({
            calendarId: GOOGLE_CALENDAR_ID,
            eventId,
            sendUpdates: 'none',
          });
        } catch (error) {
          const status = error?.response?.status;
          if (status !== 404) throw error;
        }
        return buildCalendarSyncResult({
          status: 'synced',
          action,
          event_id: eventId,
        });
      }

      return buildCalendarSyncResult({ status: 'skipped', action, event_id: eventId || null });
    } catch (error) {
      // Fall through to W6 if direct mode fails
    }
  }

  // Fallback: use W6 (n8n OAuth2 writer)
  return syncAppointmentViaW6({ action, eventId, payload });
}

async function resolveCrmPatientId(rawPatientId) {
  if (!rawPatientId) return null;

  const crmPatient = await supabase
    .from('crm_pacientes')
    .select('id')
    .eq('id', rawPatientId)
    .maybeSingle();

  if (crmPatient.error) throw crmPatient.error;
  if (crmPatient.data?.id) return crmPatient.data.id;

  const legacyPatient = await supabase
    .from('pacientes')
    .select('id, nombre_completo, email, phone, fecha_nacimiento')
    .eq('id', rawPatientId)
    .maybeSingle();

  if (legacyPatient.error) throw legacyPatient.error;
  if (!legacyPatient.data) return null;

  const migrationObservation = `auto_migrated_from_legacy_patient:${legacyPatient.data.id}`;

  const existingByObservation = await supabase
    .from('crm_pacientes')
    .select('id')
    .eq('observaciones', migrationObservation)
    .maybeSingle();

  if (existingByObservation.error) throw existingByObservation.error;
  if (existingByObservation.data?.id) return existingByObservation.data.id;

  if (legacyPatient.data.email) {
    const existingByEmail = await supabase
      .from('crm_pacientes')
      .select('id')
      .eq('email', legacyPatient.data.email)
      .maybeSingle();

    if (existingByEmail.error) throw existingByEmail.error;
    if (existingByEmail.data?.id) return existingByEmail.data.id;
  }

  const { nombre, apellidos } = splitFullName(legacyPatient.data.nombre_completo);
  let migratedMatchQuery = supabase
    .from('crm_pacientes')
    .select('id, observaciones')
    .eq('nombre', nombre)
    .order('created_at', { ascending: true })
    .limit(5);

  migratedMatchQuery = apellidos ? migratedMatchQuery.eq('apellidos', apellidos) : migratedMatchQuery.is('apellidos', null);
  migratedMatchQuery = legacyPatient.data.phone
    ? migratedMatchQuery.eq('telefono', legacyPatient.data.phone)
    : migratedMatchQuery.is('telefono', null);
  migratedMatchQuery = legacyPatient.data.fecha_nacimiento
    ? migratedMatchQuery.eq('fecha_nacimiento', legacyPatient.data.fecha_nacimiento)
    : migratedMatchQuery.is('fecha_nacimiento', null);

  const migratedMatch = await migratedMatchQuery;
  if (migratedMatch.error) throw migratedMatch.error;

  const reusableMigrated = (migratedMatch.data || []).find((row) => {
    const note = String(row?.observaciones || '');
    return note === 'auto_migrated_from_legacy_patient' || note.startsWith('auto_migrated_from_legacy_patient:');
  });

  if (reusableMigrated?.id) {
    if (reusableMigrated.observaciones !== migrationObservation) {
      await supabase
        .from('crm_pacientes')
        .update({ observaciones: migrationObservation })
        .eq('id', reusableMigrated.id);
    }
    return reusableMigrated.id;
  }

  const inserted = await supabase
    .from('crm_pacientes')
    .insert({
      nombre,
      apellidos,
      telefono: legacyPatient.data.phone || null,
      email: legacyPatient.data.email || null,
      fecha_nacimiento: legacyPatient.data.fecha_nacimiento || null,
      observaciones: migrationObservation,
      activo: true,
    })
    .select('id')
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data?.id || null;
}

async function resolveCrmProfessionalId(rawProfessionalId) {
  if (!rawProfessionalId) return null;

  const crmProfile = await supabase
    .from('crm_perfiles')
    .select('id')
    .eq('id', rawProfessionalId)
    .maybeSingle();

  if (crmProfile.error) throw crmProfile.error;
  if (crmProfile.data?.id) return crmProfile.data.id;

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
      .select('id')
      .eq('auth_user_id', legacyProfessional.data.id_usuario_auth)
      .maybeSingle();

    if (byAuth.error) throw byAuth.error;
    if (byAuth.data?.id) return byAuth.data.id;
  }

  if (legacyProfessional.data.email) {
    const byEmail = await supabase
      .from('crm_perfiles')
      .select('id')
      .eq('email', legacyProfessional.data.email)
      .maybeSingle();

    if (byEmail.error) throw byEmail.error;
    if (byEmail.data?.id) return byEmail.data.id;
  }

  if (!legacyProfessional.data.id_usuario_auth) return null;

  const inserted = await supabase
    .from('crm_perfiles')
    .insert({
      auth_user_id: legacyProfessional.data.id_usuario_auth,
      rol: 'fisioterapeuta',
      nombre_completo: legacyProfessional.data.nombre_completo || null,
      email: legacyProfessional.data.email || null,
      activo: true,
    })
    .select('id')
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data?.id || null;
}

async function getDefaultCrmProfessionalId() {
  const configuredId = process.env.DEFAULT_PROFESSIONAL_ID?.trim();
  if (configuredId) {
    const resolvedConfigured = await resolveCrmProfessionalId(configuredId);
    if (resolvedConfigured) return resolvedConfigured;
  }

  const crmProfile = await supabase
    .from('crm_perfiles')
    .select('id')
    .eq('activo', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (crmProfile.error) throw crmProfile.error;
  if (crmProfile.data?.id) return crmProfile.data.id;

  const legacyProfessional = await supabase
    .from('profesionales')
    .select('id')
    .order('creado_en', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (legacyProfessional.error) throw legacyProfessional.error;
  if (!legacyProfessional.data?.id) {
    throw new Error('No hay profesionales disponibles en CRM/legacy para sincronizar agenda.');
  }

  const resolvedLegacy = await resolveCrmProfessionalId(legacyProfessional.data.id);
  if (!resolvedLegacy) {
    throw new Error('No se pudo resolver el profesional por defecto al modelo CRM.');
  }

  return resolvedLegacy;
}

async function findAppointmentConflicts({ professionalId, startAt, endAt, excludeId = null }) {
  let query = supabase
    .from('crm_citas')
    .select('id, inicio_en, fin_en, estado, paciente_id')
    .eq('fisioterapeuta_id', professionalId)
    .in('estado', APPOINTMENT_ACTIVE_STATUSES)
    .lt('inicio_en', endAt)
    .gt('fin_en', startAt);

  if (excludeId) query = query.neq('id', excludeId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

router.get('/intakes/pending', async (req, res, next) => {
  try {
    const professionalId = pickValue(req.query, 'profesional_id', 'professional_id');
    if (!professionalId) {
      return res.status(400).json({ error: 'profesional_id es obligatorio (o professional_id)' });
    }

    const { data, error } = await supabase
      .from('mensajes_ingesta_paciente')
      .select('id, paciente_id, profesional_id, texto_mensaje, tiene_alertas_rojas, alertas_rojas, estado, creado_en')
      .eq('profesional_id', professionalId)
      .eq('estado', 'pendiente_revision')
      .order('creado_en', { ascending: true });

    if (error) {
      if (isMissingTableError(error, 'mensajes_ingesta_paciente')) {
        return res.status(400).json({
          error: 'Falta tabla mensajes_ingesta_paciente. Ejecuta la migracion SQL de seguimiento.',
        });
      }
      throw error;
    }

    res.json({ data: data || [] });
  } catch (err) {
    if (
      isMissingTableError(err, 'crm_citas') ||
      isMissingTableError(err, 'crm_pacientes') ||
      isMissingTableError(err, 'crm_perfiles') ||
      isMissingTableError(err, 'pacientes') ||
      isMissingTableError(err, 'profesionales')
    ) {
      return res.status(400).json({ error: 'Faltan tablas de CRM/legacy para resolver citas. Ejecuta migraciones pendientes.' });
    }
    next(err);
  }
});

function normalizeCalendarPatientName(summary = '') {
  return String(summary || '')
    .replace(/^cita fisioterapia\s*[-:]\s*/i, '')
    .trim();
}

function isManagedCalendarAppointment(event) {
  return Boolean(String(event?.summary || '').trim().toLowerCase().includes('cita fisioterapia'));
}

function isCalendarBusyEvent(event) {
  if (!event?.inicio_en) return false;
  if (String(event?.status || '').trim().toLowerCase() === 'cancelled') return false;
  if (String(event?.transparency || '').trim().toLowerCase() === 'transparent') return false;
  return true;
}

function normalizeCalendarEvent(rawEvent) {
  const eventId = String(rawEvent?.google_calendar_event_id || rawEvent?.id || '').trim();
  if (!eventId) return null;

  const startRaw = rawEvent?.inicio_en || rawEvent?.start?.dateTime || rawEvent?.start?.date || null;
  const endRaw = rawEvent?.fin_en || rawEvent?.end?.dateTime || rawEvent?.end?.date || null;
  const startAt = parseIsoTimestamp(startRaw);
  const endAt = parseIsoTimestamp(endRaw);

  if (!startAt) return null;

  return {
    google_calendar_event_id: eventId,
    summary: String(rawEvent?.summary || '').trim(),
    inicio_en: startAt,
    fin_en: endAt,
    description: rawEvent?.description ? String(rawEvent.description) : null,
    status: String(rawEvent?.status || '').trim() || 'confirmed',
    transparency: String(rawEvent?.transparency || '').trim() || null,
  };
}

function extractCalendarDescriptionField(description = '', label = '') {
  const safeDescription = String(description || '');
  const safeLabel = String(label || '').trim();
  if (!safeDescription || !safeLabel) return null;
  const match = safeDescription.match(new RegExp(`(?:^|\\n)${safeLabel}:\\s*(.+)$`, 'im'));
  return match?.[1]?.trim() || null;
}

function normalizeComparableName(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeComparablePhone(value = '') {
  return String(value || '').replace(/\D+/g, '');
}

async function findCrmPatientIdForCalendarEvent(event) {
  const calendarPatientName = normalizeCalendarPatientName(event?.summary);
  if (!calendarPatientName) return null;

  const targetName = normalizeComparableName(calendarPatientName);
  if (!targetName) return null;

  const phoneHint = normalizeComparablePhone(extractCalendarDescriptionField(event?.description, 'Tel'));

  const { data: crmPatients, error: crmPatientsError } = await supabase
    .from('crm_pacientes')
    .select('id, nombre, apellidos, telefono, activo')
    .limit(500);

  if (crmPatientsError) throw crmPatientsError;

  let matches = (crmPatients || [])
    .filter((patient) => patient?.activo !== false)
    .filter((patient) => {
      const fullName = [patient?.nombre, patient?.apellidos].filter(Boolean).join(' ').trim();
      return normalizeComparableName(fullName) === targetName;
    });

  if (phoneHint) {
    const phoneMatches = matches.filter(
      (patient) => normalizeComparablePhone(patient?.telefono) === phoneHint
    );
    if (phoneMatches.length === 1) return phoneMatches[0].id;
    if (phoneMatches.length > 1) return null;
  }

  if (matches.length === 1) return matches[0].id;
  if (matches.length > 1) return null;

  const { data: legacyPatients, error: legacyPatientsError } = await supabase
    .from('pacientes')
    .select('id, nombre_completo, phone')
    .limit(500);

  if (legacyPatientsError) throw legacyPatientsError;

  let legacyMatches = (legacyPatients || []).filter(
    (patient) => normalizeComparableName(patient?.nombre_completo) === targetName
  );

  if (phoneHint) {
    const legacyPhoneMatches = legacyMatches.filter(
      (patient) => normalizeComparablePhone(patient?.phone) === phoneHint
    );
    if (legacyPhoneMatches.length === 1) {
      return resolveCrmPatientId(legacyPhoneMatches[0].id);
    }
    if (legacyPhoneMatches.length > 1) return null;
  }

  if (legacyMatches.length === 1) {
    return resolveCrmPatientId(legacyMatches[0].id);
  }

  return null;
}

async function persistCalendarBackfillAppointment({ event, professionalId }) {
  if (!event?.google_calendar_event_id || !event?.inicio_en || !event?.fin_en) return null;

  const patientId = await findCrmPatientIdForCalendarEvent(event);
  if (!patientId) return null;

  const insertPayload = {
    paciente_id: patientId,
    fisioterapeuta_id: professionalId,
    inicio_en: event.inicio_en,
    fin_en: event.fin_en,
    estado: 'confirmada',
    canal_origen: 'manual',
    motivo: event.description || null,
    google_calendar_event_id: event.google_calendar_event_id,
  };

  const { data, error } = await supabase
    .from('crm_citas')
    .insert(insertPayload)
    .select(APPOINTMENT_SELECT)
    .single();

  if (!error && data) {
    return attachCalendarSyncMeta(normalizeAppointmentRow(data), {
      calendar_sync_state: 'backfilled',
    });
  }

  if (error?.code === '23505') {
    const { data: existing, error: existingError } = await supabase
      .from('crm_citas')
      .select(APPOINTMENT_SELECT)
      .eq('google_calendar_event_id', event.google_calendar_event_id)
      .maybeSingle();

    if (existingError) throw existingError;
    return existing
      ? attachCalendarSyncMeta(normalizeAppointmentRow(existing), {
        calendar_sync_state: 'backfilled',
      })
      : null;
  }

  if (error) throw error;
  return null;
}

async function fetchCalendarEventsDirect(timeMin, timeMax) {
  const calendarClient = getGoogleCalendarClient();
  if (!calendarClient) return [];

  const response = await calendarClient.events.list({
    calendarId: GOOGLE_CALENDAR_ID,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    showDeleted: false,
    maxResults: 2500,
  });

  return (response.data?.items || [])
    .map(normalizeCalendarEvent)
    .filter(Boolean)
    .filter((event) => Boolean(event?.inicio_en));
}

async function fetchCalendarAppointmentsDirect(timeMin, timeMax) {
  const events = await fetchCalendarEventsDirect(timeMin, timeMax);
  return events.filter(isManagedCalendarAppointment);
}

async function fetchCalendarEventById(eventId) {
  if (!eventId || !calendarIntegrationEnabled()) return null;
  const calendarClient = getGoogleCalendarClient();
  if (!calendarClient) return null;

  try {
    const response = await calendarClient.events.get({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId,
    });
    return normalizeCalendarEvent(response.data);
  } catch (error) {
    const status = error?.response?.status;
    if (status === 404) return null;
    throw error;
  }
}

function normalizeCalendarEventCollection(rawEvents = []) {
  return (Array.isArray(rawEvents) ? rawEvents : []).map(normalizeCalendarEvent).filter(Boolean);
}

async function fetchCalendarReaderPayloadViaW5(timeMin, timeMax) {
  try {
    const res = await fetch(W5_CALENDAR_READER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_min: timeMin, time_max: timeMax }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchCalendarAppointmentsViaW5(timeMin, timeMax) {
  const data = await fetchCalendarReaderPayloadViaW5(timeMin, timeMax);
  return normalizeCalendarEventCollection(data?.events).filter(isManagedCalendarAppointment);
}

async function fetchCalendarBusyEventsViaW5(timeMin, timeMax) {
  const data = await fetchCalendarReaderPayloadViaW5(timeMin, timeMax);
  const rawBusyEvents = Array.isArray(data?.busy_events) ? data.busy_events : data?.events;
  return normalizeCalendarEventCollection(rawBusyEvents).filter(isCalendarBusyEvent);
}

async function fetchCalendarAppointments(timeMin, timeMax) {
  if (calendarDirectEnabled()) {
    try {
      return await fetchCalendarAppointmentsDirect(timeMin, timeMax);
    } catch {
      // Fall back to W5 reader if direct Calendar listing is temporarily unavailable.
    }
  }
  if (calendarW5Enabled()) {
    return fetchCalendarAppointmentsViaW5(timeMin, timeMax);
  }
  return [];
}

async function fetchCalendarBusyEvents(timeMin, timeMax) {
  if (calendarDirectEnabled()) {
    try {
      const events = await fetchCalendarEventsDirect(timeMin, timeMax);
      return events.filter(isCalendarBusyEvent);
    } catch {
      // Fall back to W5 reader if direct Calendar listing is temporarily unavailable.
    }
  }
  if (calendarW5Enabled()) {
    return fetchCalendarBusyEventsViaW5(timeMin, timeMax);
  }
  return [];
}

function buildCalendarBusyConflict(event) {
  return {
    source: 'google_calendar',
    google_calendar_event_id: event.google_calendar_event_id,
    inicio_en: event.inicio_en,
    fin_en: event.fin_en,
    summary: event.summary || null,
    description: event.description || null,
    conflict_type: isManagedCalendarAppointment(event) ? 'managed_appointment' : 'external_busy',
  };
}

async function findCalendarBusyConflicts({ startAt, endAt, excludeEventId = null }) {
  if (!calendarIntegrationEnabled()) return [];
  const events = await fetchCalendarBusyEvents(startAt, endAt);
  const startMs = new Date(startAt).getTime();
  const endMs = new Date(endAt).getTime();

  return events
    .filter((event) => event?.google_calendar_event_id !== excludeEventId)
    .filter((event) => {
      const eventStartMs = new Date(event?.inicio_en || '').getTime();
      const eventEndMs = new Date(event?.fin_en || event?.inicio_en || '').getTime();
      if (Number.isNaN(eventStartMs) || Number.isNaN(eventEndMs)) return false;
      return eventStartMs < endMs && eventEndMs > startMs;
    })
    .map(buildCalendarBusyConflict);
}

function buildAppointmentConflictPayload(localConflicts = [], calendarConflicts = []) {
  const merged = [
    ...localConflicts.map((conflict) => ({ ...conflict, source: 'crm' })),
    ...calendarConflicts,
  ];

  let error = 'Conflicto de agenda: ya existe una cita activa en ese rango horario';
  if (calendarConflicts.length && localConflicts.length) {
    error = 'Conflicto de agenda: el rango coincide con citas CRM y con bloques ocupados de Google Calendar';
  } else if (calendarConflicts.length) {
    error = 'Conflicto de agenda: el rango horario esta ocupado en Google Calendar';
  }

  return {
    available: false,
    error,
    status_code: 409,
    conflicts: merged,
    local_conflicts: localConflicts,
    calendar_conflicts: calendarConflicts,
  };
}

async function resolveAppointmentAvailability({
  professionalId,
  startAt,
  endAt,
  excludeId = null,
  excludeEventId = null,
}) {
  const localConflicts = await findAppointmentConflicts({
    professionalId,
    startAt,
    endAt,
    excludeId,
  });
  const calendarConflicts = await findCalendarBusyConflicts({
    startAt,
    endAt,
    excludeEventId,
  });

  if (!localConflicts.length && !calendarConflicts.length) {
    return {
      available: true,
      conflicts: [],
      local_conflicts: [],
      calendar_conflicts: [],
    };
  }

  return buildAppointmentConflictPayload(localConflicts, calendarConflicts);
}

function buildCalendarSyntheticAppointment(event, professionalId) {
  return attachCalendarSyncMeta({
    id: `cal_${event.google_calendar_event_id}`,
    google_calendar_event_id: event.google_calendar_event_id,
    inicio_en: event.inicio_en,
    fin_en: event.fin_en,
    estado: 'confirmada',
    canal_origen: 'manual',
    motivo: event.description || null,
    nombre_paciente: normalizeCalendarPatientName(event.summary) || null,
    paciente_id: null,
    fisioterapeuta_id: professionalId,
  }, {
    calendar_sync_state: 'calendar_only',
  });
}

function isAppointmentInsideWindow(appointment, fromAt, toAt) {
  const startTime = new Date(appointment?.inicio_en || '').getTime();
  if (Number.isNaN(startTime)) return false;
  if (fromAt && startTime < new Date(fromAt).getTime()) return false;
  if (toAt && startTime > new Date(toAt).getTime()) return false;
  return true;
}

async function reconcileAppointmentsWithCalendar({
  professionalId,
  rows,
  calendarEvents,
  fromAt,
  toAt,
}) {
  const summary = {
    enabled: true,
    source: calendarDirectEnabled() ? 'google_api' : 'w5_reader',
    fetched: calendarEvents.length,
    updated: 0,
    cancelled: 0,
    synthetic: 0,
    persisted: 0,
    restored: 0,
  };

  const calendarById = new Map(
    calendarEvents
      .filter((event) => event?.google_calendar_event_id)
      .map((event) => [event.google_calendar_event_id, event])
  );

  const rowById = new Map(rows.map((row) => [row.id, { ...row }]));

  for (const row of rowById.values()) {
    const calendarEventId = row.google_calendar_event_id;
    if (!calendarEventId) continue;

    let calendarEvent = calendarById.get(calendarEventId) || null;
    if (!calendarEvent && calendarIntegrationEnabled()) {
      calendarEvent = await fetchCalendarEventById(calendarEventId);
    }

    if (!calendarEvent || calendarEvent.status === 'cancelled') {
      if (!['cancelada', 'completada', 'no_show'].includes(row.estado)) {
        const { error } = await supabase
          .from('crm_citas')
          .update({ estado: 'cancelada' })
          .eq('id', row.id);
        if (error) throw error;
        row.estado = 'cancelada';
        summary.cancelled += 1;
      }
      continue;
    }

    const desired = {};
    if (row.inicio_en !== calendarEvent.inicio_en) desired.inicio_en = calendarEvent.inicio_en;
    if ((row.fin_en || null) !== (calendarEvent.fin_en || null)) desired.fin_en = calendarEvent.fin_en;
    if ((row.motivo || null) !== (calendarEvent.description || null)) desired.motivo = calendarEvent.description || null;
    if (row.estado === 'cancelada') desired.estado = 'confirmada';

    if (Object.keys(desired).length) {
      const { error } = await supabase
        .from('crm_citas')
        .update(desired)
        .eq('id', row.id);
      if (error) throw error;
      Object.assign(row, desired);
      summary.updated += 1;
      if (desired.estado === 'confirmada') summary.restored += 1;
    }
  }

  const knownCalendarIds = new Set(
    [...rowById.values()].map((row) => row.google_calendar_event_id).filter(Boolean)
  );

  const calendarOnlyRows = [];
  for (const event of calendarEvents) {
    if (!event || event.status === 'cancelled') continue;
    if (knownCalendarIds.has(event.google_calendar_event_id)) continue;

    const persistedRow = await persistCalendarBackfillAppointment({
      event,
      professionalId,
    });

    if (persistedRow) {
      rowById.set(persistedRow.id, persistedRow);
      knownCalendarIds.add(event.google_calendar_event_id);
      summary.persisted += 1;
      continue;
    }

    calendarOnlyRows.push(buildCalendarSyntheticAppointment(event, professionalId));
  }

  summary.synthetic = calendarOnlyRows.length;

  const merged = [...rowById.values(), ...calendarOnlyRows]
    .filter((appointment) => isAppointmentInsideWindow(appointment, fromAt, toAt))
    .sort((a, b) => new Date(a.inicio_en).getTime() - new Date(b.inicio_en).getTime());

  return { rows: merged, calendar_sync: summary };
}

router.get('/appointments', async (req, res, next) => {
  try {
    const professionalIdRaw = pickValue(req.query, 'fisioterapeuta_id', 'professional_id', 'profesional_id');
    if (!professionalIdRaw) {
      return res.status(400).json({ error: 'fisioterapeuta_id/professional_id es obligatorio' });
    }

    const professionalId = await resolveCrmProfessionalId(professionalIdRaw);
    if (!professionalId) {
      return res.status(400).json({ error: 'No se pudo resolver fisioterapeuta_id al modelo CRM (crm_perfiles)' });
    }

    const patientIdRaw = pickValue(req.query, 'paciente_id', 'patient_id');
    const patientId = patientIdRaw ? await resolveCrmPatientId(patientIdRaw) : null;
    if (patientIdRaw && !patientId) {
      return res.status(400).json({ error: 'No se pudo resolver paciente_id al modelo CRM (crm_pacientes)' });
    }

    const statusFilter = pickValue(req.query, 'estado', 'status');
    const fromAt = parseIsoTimestamp(pickValue(req.query, 'desde', 'from'));
    const toAt = parseIsoTimestamp(pickValue(req.query, 'hasta', 'to'));
    const limitRaw = Number.parseInt(String(req.query?.limit || '30'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30;

    if (pickValue(req.query, 'desde', 'from') && !fromAt) {
      return res.status(400).json({ error: 'Formato de fecha invalido en desde/from' });
    }
    if (pickValue(req.query, 'hasta', 'to') && !toAt) {
      return res.status(400).json({ error: 'Formato de fecha invalido en hasta/to' });
    }

    let query = supabase
      .from('crm_citas')
      .select(APPOINTMENT_SELECT)
      .eq('fisioterapeuta_id', professionalId)
      .order('inicio_en', { ascending: true })
      .limit(limit);

    if (patientId) query = query.eq('paciente_id', patientId);
    if (statusFilter) query = query.eq('estado', statusFilter);
    if (fromAt) query = query.gte('inicio_en', fromAt);
    if (toAt) query = query.lte('inicio_en', toAt);

    const shouldCalendarReconcile = !patientId && !statusFilter && fromAt && toAt;

    const [{ data, error }, calendarEvents] = await Promise.all([
      query,
      shouldCalendarReconcile
        ? fetchCalendarAppointments(fromAt, toAt)
        : Promise.resolve([]),
    ]);

    if (error) {
      if (isMissingTableError(error, 'crm_citas')) {
        return res.status(400).json({ error: 'Falta tabla crm_citas. Ejecuta schema_vnext.sql en Supabase.' });
      }
      throw error;
    }

    let supabaseRows = (data || []).map(normalizeAppointmentRow);
    let calendarSyncSummary = null;

    if (shouldCalendarReconcile) {
      const calendarEventIds = calendarEvents
        .map((event) => event?.google_calendar_event_id)
        .filter(Boolean);

      if (calendarEventIds.length) {
        const existingIds = new Set(supabaseRows.map((row) => row.id));
        const { data: linkedRows, error: linkedRowsError } = await supabase
          .from('crm_citas')
          .select(APPOINTMENT_SELECT)
          .eq('fisioterapeuta_id', professionalId)
          .in('google_calendar_event_id', calendarEventIds);

        if (linkedRowsError) {
          if (isMissingTableError(linkedRowsError, 'crm_citas')) {
            return res.status(400).json({ error: 'Falta tabla crm_citas. Ejecuta schema_vnext.sql en Supabase.' });
          }
          throw linkedRowsError;
        }

        for (const row of linkedRows || []) {
          if (existingIds.has(row.id)) continue;
          supabaseRows.push(normalizeAppointmentRow(row));
        }
      }

      const reconciled = await reconcileAppointmentsWithCalendar({
        professionalId,
        rows: supabaseRows,
        calendarEvents,
        fromAt,
        toAt,
      });
      supabaseRows = reconciled.rows;
      calendarSyncSummary = reconciled.calendar_sync;
    } else {
      supabaseRows = [...supabaseRows].sort(
        (a, b) => new Date(a.inicio_en).getTime() - new Date(b.inicio_en).getTime()
      );
    }

    res.json({ data: supabaseRows, calendar_sync: calendarSyncSummary });
  } catch (err) {
    if (
      isMissingTableError(err, 'crm_citas') ||
      isMissingTableError(err, 'crm_pacientes') ||
      isMissingTableError(err, 'crm_perfiles') ||
      isMissingTableError(err, 'pacientes') ||
      isMissingTableError(err, 'profesionales')
    ) {
      return res.status(400).json({ error: 'Faltan tablas de CRM/legacy para crear citas. Ejecuta migraciones pendientes.' });
    }
    next(err);
  }
});

router.get('/appointments/sync-calendar/status', async (_req, res) => {
  res.json({ data: buildCalendarBackgroundSyncStatus() });
});

router.post('/appointments/sync-calendar', async (req, res, next) => {
  let professionalId = null;
  let fromAt = null;
  let toAt = null;
  let trigger = 'background';
  try {
    const professionalIdRaw =
      pickValue(req.body, 'fisioterapeuta_id', 'professional_id', 'profesional_id') ||
      pickValue(req.query, 'fisioterapeuta_id', 'professional_id', 'profesional_id');

    const lookbackRaw = Number.parseInt(
      String(pickValue(req.body, 'lookback_days', 'dias_atras') || pickValue(req.query, 'lookback_days', 'dias_atras') || '7'),
      10
    );
    const lookaheadRaw = Number.parseInt(
      String(pickValue(req.body, 'lookahead_days', 'dias_adelante') || pickValue(req.query, 'lookahead_days', 'dias_adelante') || '30'),
      10
    );

    const lookbackDays = Number.isFinite(lookbackRaw) ? Math.min(Math.max(lookbackRaw, 0), 90) : 7;
    const lookaheadDays = Number.isFinite(lookaheadRaw) ? Math.min(Math.max(lookaheadRaw, 1), 180) : 30;

    const fromRaw = pickValue(req.body, 'desde', 'from') || pickValue(req.query, 'desde', 'from');
    const toRaw = pickValue(req.body, 'hasta', 'to') || pickValue(req.query, 'hasta', 'to');

    const parsedFrom = fromRaw ? parseIsoTimestamp(fromRaw) : null;
    const parsedTo = toRaw ? parseIsoTimestamp(toRaw) : null;

    if (fromRaw && !parsedFrom) {
      return res.status(400).json({ error: 'Formato de fecha invalido en desde/from' });
    }
    if (toRaw && !parsedTo) {
      return res.status(400).json({ error: 'Formato de fecha invalido en hasta/to' });
    }

    fromAt = parsedFrom || new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    toAt = parsedTo || new Date(Date.now() + lookaheadDays * 24 * 60 * 60 * 1000).toISOString();
    trigger = String(pickValue(req.body, 'trigger', 'source') || pickValue(req.query, 'trigger', 'source') || 'background').trim() || 'background';

    professionalId = professionalIdRaw
      ? await resolveCrmProfessionalId(professionalIdRaw)
      : await getDefaultCrmProfessionalId();

    if (!professionalId) {
      return res.status(400).json({ error: 'No se pudo resolver el profesional para sincronizar agenda' });
    }

    markCalendarBackgroundSyncStart({ professionalId, fromAt, toAt, trigger });

    const [{ data, error }, calendarEvents] = await Promise.all([
      supabase
        .from('crm_citas')
        .select(APPOINTMENT_SELECT)
        .eq('fisioterapeuta_id', professionalId)
        .gte('inicio_en', fromAt)
        .lte('inicio_en', toAt)
        .order('inicio_en', { ascending: true })
        .limit(500),
      fetchCalendarAppointments(fromAt, toAt),
    ]);

    if (error) {
      if (isMissingTableError(error, 'crm_citas')) {
        return res.status(400).json({ error: 'Falta tabla crm_citas. Ejecuta schema_vnext.sql en Supabase.' });
      }
      throw error;
    }

    let rows = (data || []).map(normalizeAppointmentRow);
    const calendarEventIds = calendarEvents
      .map((event) => event?.google_calendar_event_id)
      .filter(Boolean);

    if (calendarEventIds.length) {
      const existingIds = new Set(rows.map((row) => row.id));
      const { data: linkedRows, error: linkedRowsError } = await supabase
        .from('crm_citas')
        .select(APPOINTMENT_SELECT)
        .eq('fisioterapeuta_id', professionalId)
        .in('google_calendar_event_id', calendarEventIds);

      if (linkedRowsError) {
        if (isMissingTableError(linkedRowsError, 'crm_citas')) {
          return res.status(400).json({ error: 'Falta tabla crm_citas. Ejecuta schema_vnext.sql en Supabase.' });
        }
        throw linkedRowsError;
      }

      for (const row of linkedRows || []) {
        if (existingIds.has(row.id)) continue;
        rows.push(normalizeAppointmentRow(row));
      }
    }

    const reconciled = await reconcileAppointmentsWithCalendar({
      professionalId,
      rows,
      calendarEvents,
      fromAt,
      toAt,
    });

    markCalendarBackgroundSyncSuccess({
      professionalId,
      fromAt,
      toAt,
      trigger,
      summary: reconciled.calendar_sync,
    });

    res.json({
      data: {
        professional_id: professionalId,
        desde: fromAt,
        hasta: toAt,
        appointments_considered: reconciled.rows.length,
      },
      calendar_sync: reconciled.calendar_sync,
      sync_status: buildCalendarBackgroundSyncStatus(),
    });
  } catch (err) {
    markCalendarBackgroundSyncError({ professionalId, fromAt, toAt, trigger, error: err });
    if (
      isMissingTableError(err, 'crm_citas') ||
      isMissingTableError(err, 'crm_pacientes') ||
      isMissingTableError(err, 'crm_perfiles') ||
      isMissingTableError(err, 'pacientes') ||
      isMissingTableError(err, 'profesionales')
    ) {
      return res.status(400).json({ error: 'Faltan tablas de CRM/legacy para sincronizar agenda. Ejecuta migraciones pendientes.' });
    }
    next(err);
  }
});

router.post('/appointments/check-availability', async (req, res, next) => {
  try {
    const professionalIdRaw = pickValue(req.body, 'fisioterapeuta_id', 'professional_id', 'profesional_id');
    const startAt = parseIsoTimestamp(pickValue(req.body, 'inicio_en', 'start_at', 'slot_start'));
    const endAt = parseIsoTimestamp(pickValue(req.body, 'fin_en', 'end_at', 'slot_end'));
    const excludeId = pickValue(req.body, 'exclude_appointment_id', 'appointment_id', 'exclude_id');
    const excludeEventId = pickValue(req.body, 'google_calendar_event_id', 'calendar_event_id', 'exclude_event_id');

    if (!professionalIdRaw || !startAt || !endAt) {
      return res.status(400).json({
        error: 'fisioterapeuta_id, inicio_en/start_at y fin_en/end_at son obligatorios',
      });
    }

    const professionalId = await resolveCrmProfessionalId(professionalIdRaw);
    if (!professionalId) {
      return res.status(400).json({ error: 'No se pudo resolver fisioterapeuta_id al modelo CRM (crm_perfiles)' });
    }

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      return res.status(400).json({ error: 'fin_en/end_at debe ser posterior a inicio_en/start_at' });
    }

    const availability = await resolveAppointmentAvailability({
      professionalId,
      startAt,
      endAt,
      excludeId: excludeId || null,
      excludeEventId: excludeEventId || null,
    });

    res.json({
      data: {
        professional_id: professionalId,
        inicio_en: startAt,
        fin_en: endAt,
        ...availability,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/appointments', async (req, res, next) => {
  try {
    const slot = req.body?.slot || {};
    const patientIdRaw = pickValue(req.body, 'paciente_id', 'patient_id');
    const professionalIdRaw = pickValue(req.body, 'fisioterapeuta_id', 'professional_id', 'profesional_id');
    const startAt = parseIsoTimestamp(pickValue(req.body, 'inicio_en', 'start_at', 'slot_start') || pickValue(slot, 'inicio_en', 'start_at', 'slot_start'));
    const endAt = parseIsoTimestamp(pickValue(req.body, 'fin_en', 'end_at', 'slot_end') || pickValue(slot, 'fin_en', 'end_at', 'slot_end'));
    const status = pickValue(req.body, 'estado', 'status') || 'pendiente';
    const channel = pickValue(req.body, 'canal_origen', 'source', 'channel') || 'crm_web';
    const reason = pickValue(req.body, 'motivo', 'reason', 'notes');
    const requestId = pickValue(req.body, 'request_id');
    const googleCalendarEventId = pickValue(req.body, 'google_calendar_event_id', 'calendar_event_id');

    if (!patientIdRaw || !professionalIdRaw || !startAt || !endAt) {
      return res.status(400).json({
        error: 'paciente_id, fisioterapeuta_id, inicio_en/start_at y fin_en/end_at son obligatorios',
      });
    }

    const patientId = await resolveCrmPatientId(patientIdRaw);
    const professionalId = await resolveCrmProfessionalId(professionalIdRaw);

    if (!patientId) {
      return res.status(400).json({ error: 'No se pudo resolver paciente_id al modelo CRM (crm_pacientes)' });
    }

    if (!professionalId) {
      return res.status(400).json({ error: 'No se pudo resolver fisioterapeuta_id al modelo CRM (crm_perfiles)' });
    }

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      return res.status(400).json({ error: 'fin_en/end_at debe ser posterior a inicio_en/start_at' });
    }

    if (!APPOINTMENT_ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `estado/status invalido. Usa: ${APPOINTMENT_ALLOWED_STATUSES.join(', ')}` });
    }

    if (!APPOINTMENT_ALLOWED_CHANNELS.includes(channel)) {
      return res.status(400).json({ error: `canal_origen/source invalido. Usa: ${APPOINTMENT_ALLOWED_CHANNELS.join(', ')}` });
    }

    const availability = await resolveAppointmentAvailability({
      professionalId,
      startAt,
      endAt,
      excludeEventId: googleCalendarEventId || null,
    });

    if (!availability.available) {
      return res.status(409).json(availability);
    }

    let effectiveCalendarEventId = googleCalendarEventId || null;
    let calendarSync = buildCalendarSyncResult({ status: 'skipped', action: 'create', event_id: effectiveCalendarEventId });
    if (!effectiveCalendarEventId && calendarIntegrationEnabled()) {
      const context = await fetchCalendarContext({ patientId, professionalId });
      const calendarEventPayload = buildCalendarEventPayload({
        patientName: context.patientName,
        patientPhone: context.patientPhone,
        professionalName: context.professionalName,
        startAt,
        endAt,
        reason,
        appointmentId: requestId || null,
      });
      calendarSync = await syncAppointmentToGoogleCalendar({
        action: 'create',
        eventId: null,
        payload: calendarEventPayload,
      });
      if (calendarSync.status === 'synced' && calendarSync.event_id) {
        effectiveCalendarEventId = calendarSync.event_id;
      }
      if (GOOGLE_CALENDAR_REQUIRED && calendarSync.status === 'error') {
        return res.status(502).json({
          error: 'No se pudo crear evento en Google Calendar',
          calendar_sync: calendarSync,
        });
      }
    }

    const { data, error } = await supabase
      .from('crm_citas')
      .insert({
        paciente_id: patientId,
        fisioterapeuta_id: professionalId,
        inicio_en: startAt,
        fin_en: endAt,
        estado: status,
        canal_origen: channel,
        motivo: reason || null,
        request_id: requestId || null,
        google_calendar_event_id: effectiveCalendarEventId,
      })
      .select(APPOINTMENT_SELECT)
      .single();

    if (error) {
      if (isMissingTableError(error, 'crm_citas')) {
        return res.status(400).json({
          error: 'Falta tabla crm_citas. Ejecuta schema_vnext.sql en Supabase.',
        });
      }
      throw error;
    }

    res.status(201).json({
      data: normalizeAppointmentRow(data),
      calendar_sync: calendarSync,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/appointments/:appointmentId', async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const { data: current, error: currentError } = await supabase
      .from('crm_citas')
      .select('id, paciente_id, fisioterapeuta_id, inicio_en, fin_en, estado, motivo, google_calendar_event_id, request_id')
      .eq('id', appointmentId)
      .maybeSingle();

    if (currentError) {
      if (isMissingTableError(currentError, 'crm_citas')) {
        return res.status(400).json({
          error: 'Falta tabla crm_citas. Ejecuta schema_vnext.sql en Supabase.',
        });
      }
      throw currentError;
    }

    if (!current) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const nextStatus = pickValue(req.body, 'estado', 'status');
    const nextStartRaw = pickValue(req.body, 'inicio_en', 'start_at', 'slot_start');
    const nextEndRaw = pickValue(req.body, 'fin_en', 'end_at', 'slot_end');
    const nextReason = pickValue(req.body, 'motivo', 'reason', 'notes');
    const nextCalendarEventId = pickValue(req.body, 'google_calendar_event_id', 'calendar_event_id');

    const nextStartAt = nextStartRaw ? parseIsoTimestamp(nextStartRaw) : current.inicio_en;
    const nextEndAt = nextEndRaw ? parseIsoTimestamp(nextEndRaw) : current.fin_en;

    if (nextStartRaw && !nextStartAt) {
      return res.status(400).json({ error: 'Formato invalido en inicio_en/start_at' });
    }

    if (nextEndRaw && !nextEndAt) {
      return res.status(400).json({ error: 'Formato invalido en fin_en/end_at' });
    }

    if ((nextStartRaw && !nextEndRaw) || (!nextStartRaw && nextEndRaw)) {
      return res.status(400).json({ error: 'Para mover cita debes enviar inicio_en/start_at y fin_en/end_at' });
    }

    if (nextStatus && !APPOINTMENT_ALLOWED_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: `estado/status invalido. Usa: ${APPOINTMENT_ALLOWED_STATUSES.join(', ')}` });
    }

    if (!nextStatus && !nextStartRaw && !nextEndRaw && nextReason === null && nextCalendarEventId === null) {
      return res.status(400).json({ error: 'No hay cambios para aplicar' });
    }

    if (new Date(nextEndAt).getTime() <= new Date(nextStartAt).getTime()) {
      return res.status(400).json({ error: 'fin_en/end_at debe ser posterior a inicio_en/start_at' });
    }

    const effectiveStatus = nextStatus || current.estado;
    const shouldCheckConflicts = APPOINTMENT_ACTIVE_STATUSES.includes(effectiveStatus);
    if (shouldCheckConflicts) {
      const availability = await resolveAppointmentAvailability({
        professionalId: current.fisioterapeuta_id,
        startAt: nextStartAt,
        endAt: nextEndAt,
        excludeId: current.id,
        excludeEventId: nextCalendarEventId !== null
          ? (nextCalendarEventId || null)
          : (current.google_calendar_event_id || null),
      });

      if (!availability.available) {
        return res.status(409).json(availability);
      }
    }

    const updatePayload = {
      inicio_en: nextStartAt,
      fin_en: nextEndAt,
    };

    if (nextStatus) updatePayload.estado = nextStatus;
    if (nextReason !== null) updatePayload.motivo = nextReason || null;
    if (nextCalendarEventId !== null) updatePayload.google_calendar_event_id = nextCalendarEventId || null;

    const effectiveReason = nextReason !== null ? (nextReason || null) : current.motivo || null;
    let effectiveCalendarEventId =
      nextCalendarEventId !== null
        ? (nextCalendarEventId || null)
        : (current.google_calendar_event_id || null);
    let calendarSync = buildCalendarSyncResult({
      status: 'skipped',
      action: 'update',
      event_id: effectiveCalendarEventId,
    });

    if (calendarIntegrationEnabled()) {
      const cancelStates = new Set(['cancelada', 'no_show']);
      const shouldCancelInCalendar = cancelStates.has(effectiveStatus);

      if (shouldCancelInCalendar && effectiveCalendarEventId) {
        calendarSync = await syncAppointmentToGoogleCalendar({
          action: 'cancel',
          eventId: effectiveCalendarEventId,
          payload: null,
        });
        if (calendarSync.status === 'synced') {
          effectiveCalendarEventId = null;
          updatePayload.google_calendar_event_id = null;
        }
      } else {
        const context = await fetchCalendarContext({
          patientId: current.paciente_id,
          professionalId: current.fisioterapeuta_id,
        });
        const calendarEventPayload = buildCalendarEventPayload({
          patientName: context.patientName,
          patientPhone: context.patientPhone,
          professionalName: context.professionalName,
          startAt: nextStartAt,
          endAt: nextEndAt,
          reason: effectiveReason,
          appointmentId: current.request_id || current.id,
        });

        if (effectiveCalendarEventId) {
          calendarSync = await syncAppointmentToGoogleCalendar({
            action: 'update',
            eventId: effectiveCalendarEventId,
            payload: calendarEventPayload,
          });
        } else {
          calendarSync = await syncAppointmentToGoogleCalendar({
            action: 'create',
            eventId: null,
            payload: calendarEventPayload,
          });
          if (calendarSync.status === 'synced' && calendarSync.event_id) {
            effectiveCalendarEventId = calendarSync.event_id;
            updatePayload.google_calendar_event_id = effectiveCalendarEventId;
          }
        }
      }

      if (GOOGLE_CALENDAR_REQUIRED && calendarSync.status === 'error') {
        return res.status(502).json({
          error: 'No se pudo sincronizar evento en Google Calendar',
          calendar_sync: calendarSync,
        });
      }
    }

    const { data, error } = await supabase
      .from('crm_citas')
      .update(updatePayload)
      .eq('id', current.id)
      .select(APPOINTMENT_SELECT)
      .single();

    if (error) throw error;

    res.json({
      data: normalizeAppointmentRow(data),
      calendar_sync: calendarSync,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/program-templates', async (req, res, next) => {
  try {
    const professionalId = pickValue(req.query, 'profesional_id', 'professional_id');
    if (!professionalId) {
      return res.status(400).json({ error: 'profesional_id es obligatorio (o professional_id)' });
    }

    const limitRaw = Number.parseInt(String(req.query?.limit || '30'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30;

    const { data: plans, error: plansError } = await supabase
      .from('planes')
      .select('id, profesional_id, paciente_id, titulo, estado, fecha_inicio, fecha_fin, notas, creado_en, actualizado_en')
      .eq('profesional_id', professionalId)
      .order('creado_en', { ascending: false })
      .limit(400);

    if (plansError) {
      if (isMissingTableError(plansError, 'planes')) {
        return res.status(400).json({
          error: 'Falta tabla planes. Ejecuta schema.sql / migraciones legacy.',
        });
      }
      throw plansError;
    }

    const safePlans = plans || [];
    if (!safePlans.length) {
      return res.json({ data: [] });
    }

    const planIds = safePlans.map((plan) => plan.id);
    const patientIds = [...new Set(safePlans.map((plan) => plan.paciente_id).filter(Boolean))];

    const [itemsResp, patientsResp] = await Promise.all([
      supabase
        .from('items_plan')
        .select('plan_id, id')
        .in('plan_id', planIds),
      patientIds.length
        ? supabase
            .from('pacientes')
            .select('id, nombre_completo')
            .in('id', patientIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (itemsResp.error) {
      if (isMissingTableError(itemsResp.error, 'items_plan')) {
        return res.status(400).json({
          error: 'Falta tabla items_plan. Ejecuta schema.sql / migraciones legacy.',
        });
      }
      throw itemsResp.error;
    }

    if (patientsResp.error) {
      if (isMissingTableError(patientsResp.error, 'pacientes')) {
        return res.status(400).json({
          error: 'Falta tabla pacientes. Ejecuta schema.sql / migraciones legacy.',
        });
      }
      throw patientsResp.error;
    }

    const itemCountByPlan = new Map();
    for (const row of itemsResp.data || []) {
      const current = itemCountByPlan.get(row.plan_id) || 0;
      itemCountByPlan.set(row.plan_id, current + 1);
    }

    const patientNameById = new Map((patientsResp.data || []).map((p) => [p.id, p.nombre_completo]));
    const templateByKey = new Map();

    for (const plan of safePlans) {
      const title = String(plan.titulo || '').trim();
      if (!title) continue;

      const key = title.toLowerCase();
      const itemCount = itemCountByPlan.get(plan.id) || 0;
      const createdAt = plan.actualizado_en || plan.creado_en || null;
      const currentTemplate = templateByKey.get(key);

      if (!currentTemplate) {
        templateByKey.set(key, {
          template_key: key,
          template_title: title,
          source_plan_id: plan.id,
          usage_count: 1,
          exercises_count: itemCount,
          source_patient_id: plan.paciente_id || null,
          source_patient_name: patientNameById.get(plan.paciente_id) || null,
          source_status: plan.estado || null,
          source_notes: plan.notas || null,
          source_period_start: plan.fecha_inicio || null,
          source_period_end: plan.fecha_fin || null,
          last_used_at: createdAt,
        });
        continue;
      }

      currentTemplate.usage_count += 1;

      const currentTs = new Date(currentTemplate.last_used_at || 0).getTime();
      const nextTs = new Date(createdAt || 0).getTime();
      if (nextTs > currentTs) {
        currentTemplate.source_plan_id = plan.id;
        currentTemplate.exercises_count = itemCount;
        currentTemplate.source_patient_id = plan.paciente_id || null;
        currentTemplate.source_patient_name = patientNameById.get(plan.paciente_id) || null;
        currentTemplate.source_status = plan.estado || null;
        currentTemplate.source_notes = plan.notas || null;
        currentTemplate.source_period_start = plan.fecha_inicio || null;
        currentTemplate.source_period_end = plan.fecha_fin || null;
        currentTemplate.last_used_at = createdAt;
      }
    }

    const templates = [...templateByKey.values()]
      .sort((a, b) => {
        const byUsage = (b.usage_count || 0) - (a.usage_count || 0);
        if (byUsage !== 0) return byUsage;
        return new Date(b.last_used_at || 0).getTime() - new Date(a.last_used_at || 0).getTime();
      })
      .slice(0, limit);

    res.json({ data: templates });
  } catch (err) {
    if (
      isMissingTableError(err, 'planes') ||
      isMissingTableError(err, 'items_plan') ||
      isMissingTableError(err, 'pacientes')
    ) {
      return res.status(400).json({ error: 'Faltan tablas legacy para plantillas (planes/items_plan/pacientes).' });
    }
    next(err);
  }
});

router.post('/program-templates/clone', async (req, res, next) => {
  try {
    const sourcePlanId = pickValue(req.body, 'source_plan_id', 'plan_id');
    const targetPatientId = pickValue(req.body, 'paciente_id', 'patient_id');
    const professionalId = pickValue(req.body, 'profesional_id', 'professional_id');
    const titleOverride = pickValue(req.body, 'titulo', 'title');
    const notesOverride = pickValue(req.body, 'notas', 'notes');

    if (!sourcePlanId || !targetPatientId) {
      return res.status(400).json({
        error: 'source_plan_id y paciente_id/patient_id son obligatorios',
      });
    }

    const { data: sourcePlan, error: sourcePlanError } = await supabase
      .from('planes')
      .select('id, profesional_id, paciente_id, titulo, estado, fecha_inicio, fecha_fin, notas')
      .eq('id', sourcePlanId)
      .maybeSingle();

    if (sourcePlanError) {
      if (isMissingTableError(sourcePlanError, 'planes')) {
        return res.status(400).json({
          error: 'Falta tabla planes. Ejecuta schema.sql / migraciones legacy.',
        });
      }
      throw sourcePlanError;
    }

    if (!sourcePlan) {
      return res.status(404).json({ error: 'Plan origen no encontrado' });
    }

    const effectiveProfessionalId = professionalId || sourcePlan.profesional_id;
    if (!effectiveProfessionalId) {
      return res.status(400).json({ error: 'No se pudo determinar profesional_id para clonar el plan' });
    }

    const { data: patient, error: patientError } = await supabase
      .from('pacientes')
      .select('id, profesional_id, nombre_completo')
      .eq('id', targetPatientId)
      .maybeSingle();

    if (patientError) {
      if (isMissingTableError(patientError, 'pacientes')) {
        return res.status(400).json({
          error: 'Falta tabla pacientes. Ejecuta schema.sql / migraciones legacy.',
        });
      }
      throw patientError;
    }

    if (!patient) {
      return res.status(404).json({ error: 'Paciente destino no encontrado' });
    }

    if (patient.profesional_id !== effectiveProfessionalId) {
      return res.status(409).json({
        error: 'El paciente destino no pertenece al profesional indicado',
      });
    }

    const { data: sourceItems, error: sourceItemsError } = await supabase
      .from('items_plan')
      .select('ejercicio_id, indice_orden, series, repeticiones, duracion_segundos, instrucciones_personalizadas, url_video')
      .eq('plan_id', sourcePlan.id)
      .order('indice_orden', { ascending: true });

    if (sourceItemsError) {
      if (isMissingTableError(sourceItemsError, 'items_plan')) {
        return res.status(400).json({
          error: 'Falta tabla items_plan. Ejecuta schema.sql / migraciones legacy.',
        });
      }
      throw sourceItemsError;
    }

    const clonedTitle = String(titleOverride || sourcePlan.titulo || 'Plan de ejercicios').trim();
    const clonedNotes = notesOverride !== null ? (notesOverride || null) : (sourcePlan.notas || null);

    const { data: newPlan, error: newPlanError } = await supabase
      .from('planes')
      .insert({
        profesional_id: effectiveProfessionalId,
        paciente_id: targetPatientId,
        titulo: clonedTitle,
        estado: 'borrador',
        fecha_inicio: toIsoDateOnly(sourcePlan.fecha_inicio),
        fecha_fin: toIsoDateOnly(sourcePlan.fecha_fin),
        notas: clonedNotes,
      })
      .select('id, profesional_id, paciente_id, titulo, estado, fecha_inicio, fecha_fin, notas, creado_en')
      .single();

    if (newPlanError) throw newPlanError;

    const clonedItems = (sourceItems || []).map((item) => ({
      plan_id: newPlan.id,
      ejercicio_id: item.ejercicio_id,
      indice_orden: item.indice_orden ?? 0,
      series: item.series ?? 3,
      repeticiones: item.repeticiones ?? 10,
      duracion_segundos: item.duracion_segundos ?? null,
      instrucciones_personalizadas: item.instrucciones_personalizadas || null,
      url_video: item.url_video || null,
    }));

    if (clonedItems.length) {
      const { error: insertItemsError } = await supabase.from('items_plan').insert(clonedItems);
      if (insertItemsError) throw insertItemsError;
    }

    res.status(201).json({
      data: {
        ...newPlan,
        cloned_from_plan_id: sourcePlan.id,
        cloned_items_count: clonedItems.length,
        target_patient_name: patient.nombre_completo || null,
      },
    });
  } catch (err) {
    if (
      isMissingTableError(err, 'planes') ||
      isMissingTableError(err, 'items_plan') ||
      isMissingTableError(err, 'pacientes')
    ) {
      return res.status(400).json({ error: 'Faltan tablas legacy para clonar plantillas (planes/items_plan/pacientes).' });
    }
    next(err);
  }
});

router.get('/video-jobs', async (req, res, next) => {
  try {
    if (rejectVideoFeatureIfDisabled(res)) return;
    const professionalId = pickValue(req.query, 'profesional_id', 'professional_id');
    if (!professionalId) {
      return res.status(400).json({ error: 'profesional_id es obligatorio (o professional_id)' });
    }

    const statusFilter = pickValue(req.query, 'estado', 'status');
    const patientIdFilter = pickValue(req.query, 'paciente_id', 'patient_id');
    const limitRaw = Number.parseInt(String(req.query?.limit || '30'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30;

    let query = supabase
      .from('trabajos_video_ejercicio')
      .select(`
        id,
        paciente_id,
        profesional_id,
        ejercicio_id,
        trabajo_padre_id,
        numero_revision,
        estado,
        prescripcion,
        prompt_generacion,
        notas_revision,
        url_salida,
        creado_en,
        actualizado_en
      `)
      .eq('profesional_id', professionalId)
      .order('creado_en', { ascending: false })
      .limit(limit);

    if (statusFilter) query = query.eq('estado', statusFilter);
    if (patientIdFilter) query = query.eq('paciente_id', patientIdFilter);

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error, 'trabajos_video_ejercicio')) {
        return res.status(400).json({
          error: 'Falta tabla trabajos_video_ejercicio. Ejecuta la migracion SQL de seguimiento.',
        });
      }
      throw error;
    }

    const jobs = data || [];
    const patientIds = [...new Set(jobs.map((job) => job.paciente_id).filter(Boolean))];
    const exerciseIds = [...new Set(jobs.map((job) => job.ejercicio_id).filter(Boolean))];

    const [patientsResp, exercisesResp] = await Promise.all([
      patientIds.length
        ? supabase
            .from('pacientes')
            .select('id, nombre_completo')
            .in('id', patientIds)
        : Promise.resolve({ data: [], error: null }),
      exerciseIds.length
        ? supabase
            .from('ejercicios')
            .select('id, nombre')
            .in('id', exerciseIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (patientsResp.error) throw patientsResp.error;
    if (exercisesResp.error) throw exercisesResp.error;

    const patientNameById = new Map((patientsResp.data || []).map((p) => [p.id, p.nombre_completo]));
    const exerciseNameById = new Map((exercisesResp.data || []).map((e) => [e.id, e.nombre]));

    const normalized = jobs.map((job) => ({
      ...job,
      nombre_paciente: patientNameById.get(job.paciente_id) || null,
      nombre_ejercicio: exerciseNameById.get(job.ejercicio_id) || null,
    }));

    res.json({ data: normalized });
  } catch (err) {
    next(err);
  }
});

router.get('/patients/:patientId/history', async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const notesResp = await supabase
      .from('notas_seguimiento_paciente')
      .select('id, texto_nota, fuente, ingesta_vinculada_id, creado_en, profesional_id')
      .eq('paciente_id', patientId)
      .order('creado_en', { ascending: true });

    if (notesResp.error && !isMissingTableError(notesResp.error, 'notas_seguimiento_paciente')) throw notesResp.error;

    res.json({
      data: {
        notas_seguimiento: notesResp.data || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/notes', async (req, res, next) => {
  try {
    const patientId = pickValue(req.body, 'paciente_id', 'patient_id');
    const professionalId = pickValue(req.body, 'profesional_id', 'professional_id');
    const noteText = pickValue(req.body, 'texto_nota', 'note_text');
    const source = pickValue(req.body, 'fuente', 'source') || 'texto';
    const linkedIntakeId = pickValue(req.body, 'ingesta_vinculada_id', 'linked_intake_id');

    if (!patientId || !professionalId || !noteText) {
      return res.status(400).json({
        error: 'paciente_id/professional_id y texto_nota/note_text son obligatorios',
      });
    }

    const { data, error } = await supabase
      .from('notas_seguimiento_paciente')
      .insert({
        paciente_id: patientId,
        profesional_id: professionalId,
        texto_nota: noteText,
        fuente: source,
        ingesta_vinculada_id: linkedIntakeId,
      })
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error, 'notas_seguimiento_paciente')) {
        return res.status(400).json({
          error: 'Falta tabla notas_seguimiento_paciente. Ejecuta la migracion SQL de seguimiento.',
        });
      }
      throw error;
    }

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/video-jobs', async (req, res, next) => {
  try {
    if (rejectVideoFeatureIfDisabled(res)) return;
    const patientId = pickValue(req.body, 'paciente_id', 'patient_id');
    const professionalId = pickValue(req.body, 'profesional_id', 'professional_id');
    const exerciseId = pickValue(req.body, 'ejercicio_id', 'exercise_id');
    const prescription = pickValue(req.body, 'prescripcion', 'prescription');
    const generationPrompt = pickValue(req.body, 'prompt_generacion', 'generation_prompt');

    if (!patientId || !professionalId || !prescription) {
      return res.status(400).json({
        error: 'paciente_id/professional_id y prescripcion/prescription son obligatorios',
      });
    }

    const { data, error } = await supabase
      .from('trabajos_video_ejercicio')
      .insert({
        paciente_id: patientId,
        profesional_id: professionalId,
        ejercicio_id: exerciseId,
        prescripcion: prescription,
        prompt_generacion: generationPrompt,
        estado: 'pendiente_revision',
        numero_revision: 1,
      })
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error, 'trabajos_video_ejercicio')) {
        return res.status(400).json({
          error: 'Falta tabla trabajos_video_ejercicio. Ejecuta la migracion SQL de seguimiento.',
        });
      }
      throw error;
    }

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/video-jobs/:jobId/review', async (req, res, next) => {
  try {
    if (rejectVideoFeatureIfDisabled(res)) return;
    const { jobId } = req.params;
    const aprobado = pickValue(req.body, 'aprobado', 'approved');
    const reviewNotes = pickValue(req.body, 'notas_revision', 'review_notes') || '';
    const revisedPrompt = pickValue(req.body, 'prompt_revisado', 'revised_prompt');

    if (typeof aprobado !== 'boolean') {
      return res.status(400).json({ error: 'aprobado/approved (boolean) es obligatorio' });
    }

    const { data: currentJob, error: currentError } = await supabase
      .from('trabajos_video_ejercicio')
      .select('*')
      .eq('id', jobId)
      .single();

    if (currentError) throw currentError;
    if (!currentJob) return res.status(404).json({ error: 'Video job no encontrado' });

    if (aprobado) {
      const { data: aprobadoJob, error: aprobadoError } = await supabase
        .from('trabajos_video_ejercicio')
        .update({
          estado: 'aprobado',
          notas_revision: reviewNotes || null,
        })
        .eq('id', jobId)
        .select()
        .single();

      if (aprobadoError) throw aprobadoError;
      return res.json({ data: aprobadoJob, next: 'ready_to_send' });
    }

    const { data: rechazadoJob, error: rechazadoError } = await supabase
      .from('trabajos_video_ejercicio')
      .update({
        estado: 'rechazado',
        notas_revision: reviewNotes || null,
      })
      .eq('id', jobId)
      .select()
      .single();

    if (rechazadoError) throw rechazadoError;

    const { data: revisionJob, error: revisionError } = await supabase
      .from('trabajos_video_ejercicio')
      .insert({
        paciente_id: currentJob.paciente_id,
        profesional_id: currentJob.profesional_id,
        ejercicio_id: currentJob.ejercicio_id,
        prescripcion: currentJob.prescripcion,
        prompt_generacion: revisedPrompt || currentJob.prompt_generacion,
        trabajo_padre_id: currentJob.id,
        numero_revision: (currentJob.numero_revision || 1) + 1,
        estado: 'pendiente_revision',
      })
      .select()
      .single();

    if (revisionError) throw revisionError;

    res.json({
      data: {
        trabajo_rechazado: rechazadoJob,
        nuevo_trabajo_revision: revisionJob,
      },
      next: 'render_new_revision',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/video-jobs/:jobId/render', async (req, res, next) => {
  try {
    if (rejectVideoFeatureIfDisabled(res)) return;
    const { jobId } = req.params;
    const outputUrl = pickValue(req.body, 'url_salida', 'output_url');
    const provider = pickValue(req.body, 'proveedor', 'provider') || 'simulado';

    const { data: currentJob, error: currentError } = await supabase
      .from('trabajos_video_ejercicio')
      .select('*')
      .eq('id', jobId)
      .single();

    if (currentError) throw currentError;
    if (!currentJob) return res.status(404).json({ error: 'Video job no encontrado' });

    if (!['pendiente_revision', 'rechazado'].includes(currentJob.estado)) {
      return res.status(400).json({
        error: 'Solo se puede renderizar un video en estado pendiente_revision o rechazado',
      });
    }

    const { error: startError } = await supabase
      .from('trabajos_video_ejercicio')
      .update({ estado: 'renderizando' })
      .eq('id', jobId);

    if (startError) throw startError;

    const finalOutputUrl =
      outputUrl ||
      `https://cdn.fisio-ia.local/videos/${jobId}-r${currentJob.numero_revision || 1}.mp4`;

    const { data: renderedJob, error: finishError } = await supabase
      .from('trabajos_video_ejercicio')
      .update({
        estado: 'pendiente_revision',
        url_salida: finalOutputUrl,
      })
      .eq('id', jobId)
      .select()
      .single();

    if (finishError) throw finishError;

    res.json({
      data: renderedJob,
      render: {
        provider,
        status: 'completed',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/video-jobs/:jobId/send', async (req, res, next) => {
  try {
    if (rejectVideoFeatureIfDisabled(res)) return;
    const { jobId } = req.params;

    const { data, error } = await supabase
      .from('trabajos_video_ejercicio')
      .update({ estado: 'enviado' })
      .eq('id', jobId)
      .eq('estado', 'aprobado')
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(400).json({ error: 'Solo se puede enviar un video en estado aprobado' });
    }

    res.json({ data });
  } catch (err) {
    next(err);
  }
});
export default router;