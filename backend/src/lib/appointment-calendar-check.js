// Recovery only reads Calendar. Missing resources never authorize another mutation.
const field = (text, name) => {
  const values = String(text || '').split(/\r?\n/)
    .filter(line => line.startsWith(`${name}: `)).map(line => line.slice(name.length + 2).trim());
  return values.length === 1 ? values[0] : null;
};

export async function readAppointmentCalendarEvidence(client, calendarId, row) {
  if (!client) throw new Error('La comprobación requiere lectura directa de Calendar. W5 no acredita lecturas completas ni cancelaciones.');
  if (row.calendar_sync_calendar_id && row.calendar_sync_calendar_id !== calendarId) {
    throw new Error('El calendario configurado ha cambiado. Se conserva el bloqueo de la cita.');
  }
  const options = { retry: false, timeout: 8000 };
  if (row.google_calendar_event_id) {
    const response = await client.events.get({ calendarId, eventId: row.google_calendar_event_id }, options);
    // 404/410, malformed responses and timeouts remain uncertain; require a resource.
    if (response.data?.id !== row.google_calendar_event_id) throw new Error('Calendar no confirmó el evento solicitado.');
    return [response.data];
  }
  const events = [], tokens = new Set();
  const deadline = Date.now() + 20000;
  let pageToken;
  do {
    if (tokens.size >= 20 || Date.now() >= deadline) throw new Error('La lectura de Calendar no se pudo completar.');
    const response = await client.events.list({ calendarId, q: row.id, showDeleted: true,
      singleEvents: false, maxResults: 2500, ...(pageToken ? { pageToken } : {}) }, { ...options, timeout: Math.min(8000, deadline - Date.now()) });
    const data = response.data;
    if (!Array.isArray(data?.items) || data.items.some(event => !event || typeof event.id !== 'string' || !event.id)) {
      throw new Error('Calendar devolvió una lectura incompleta.');
    }
    events.push(...data.items);
    pageToken = data.nextPageToken;
    if (pageToken !== undefined && (typeof pageToken !== 'string' || !pageToken || tokens.has(pageToken))) throw new Error('La paginación de Calendar no se pudo completar.');
    if (pageToken) tokens.add(pageToken);
  } while (pageToken);
  return events;
}

export function confirmAppointmentCalendarEvidence(row, events, expected) {
  if (row.calendar_sync_in_flight) return null;
  const cancelling = ['cancelada', 'no_show'].includes(row.estado);
  const matches = row.google_calendar_event_id
    ? events.filter(event => event.id === row.google_calendar_event_id)
    : events.filter(event => field(event.description, 'CRM Appointment ID') === row.id);
  if (matches.length !== 1) return null;
  const event = matches[0];
  // A tombstone for the exact linked ID in the original calendar is positive deletion evidence.
  // Legacy rows without a persisted target additionally require their CRM reference.
  if (cancelling) return row.google_calendar_event_id && event.status === 'cancelled'
    && !event.recurringEventId && (row.calendar_sync_calendar_id || field(event.description, 'CRM Appointment ID') === row.id)
    ? { eventId: null } : null;
  if (!expected || event.status !== 'confirmed' || event.recurringEventId || event.recurrence?.length
    || field(event.description, 'CRM Appointment ID') !== row.id
    || (row.calendar_sync_operation_id && field(event.description, 'CRM Sync Operation') !== row.calendar_sync_operation_id)
    || event.summary !== expected.summary || event.description !== expected.description
    || !event.start?.dateTime || !event.end?.dateTime
    || Date.parse(event.start.dateTime) !== Date.parse(expected.start.dateTime)
    || Date.parse(event.end.dateTime) !== Date.parse(expected.end.dateTime)) return null;
  return { eventId: event.id };
}
