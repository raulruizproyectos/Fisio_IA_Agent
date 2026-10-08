import test from 'node:test';
import assert from 'node:assert/strict';
import { readAppointmentCalendarEvidence, confirmAppointmentCalendarEvidence } from '../src/lib/appointment-calendar-check.js';

const row = { id: 'appointment-a', estado: 'confirmada', calendar_sync_operation_id: 'operation-a', calendar_sync_calendar_id: 'clinic-calendar', calendar_sync_in_flight: false };
const expected = { summary: 'Cita fisioterapia - Fixture', description: 'Paciente: Fixture\nCRM Appointment ID: appointment-a\nCRM Sync Operation: operation-a\nMotivo: Sesión', start: { dateTime: '2040-01-01T09:00Z' }, end: { dateTime: '2040-01-01T10:00Z' } };
const event = { id: 'event-a', status: 'confirmed', ...expected };

test('recupera una única alta/cambio con referencia, versión y datos exactos; no acepta coincidencias ambiguas', () => {
  assert.deepEqual(confirmAppointmentCalendarEvidence(row, [event], expected), { eventId: 'event-a' });
  assert.deepEqual(confirmAppointmentCalendarEvidence({ ...row, google_calendar_event_id: 'event-a' }, [event], expected), { eventId: 'event-a' });
  for (const events of [[], [event, { ...event, id: 'duplicate' }], [{ ...event, status: 'cancelled' }],
    [{ ...event, description: expected.description.replace('operation-a', 'old-operation') }],
    [{ ...event, summary: 'Otro paciente' }], [{ ...event, start: { dateTime: '2040-01-01T08:00Z' } }],
    [{ ...event, recurringEventId: 'series' }], [{ ...event, description: expected.description + '\nCRM Appointment ID: another' }]]) {
    assert.equal(confirmAppointmentCalendarEvidence(row, events, expected), null);
  }
  assert.equal(confirmAppointmentCalendarEvidence({ ...row, calendar_sync_in_flight: true }, [event], expected), null);
  const legacy = { ...row, calendar_sync_operation_id: null, calendar_sync_calendar_id: null };
  const oldExpected = { ...expected, description: expected.description.replace('\nCRM Sync Operation: operation-a', '') };
  assert.deepEqual(confirmAppointmentCalendarEvidence(legacy, [{ ...event, ...oldExpected }], oldExpected), { eventId: 'event-a' });
});

test('cancelación requiere tombstone del ID vinculado; vacío, evento activo o petición en curso conservan bloqueo', () => {
  const cancelled = { ...row, estado: 'cancelada', google_calendar_event_id: 'event-a' };
  const tombstone = { id: 'event-a', status: 'cancelled' };
  assert.deepEqual(confirmAppointmentCalendarEvidence(cancelled, [tombstone], null), { eventId: null });
  for (const events of [[], [event], [{ ...tombstone, id: 'another' }], [{ ...tombstone, recurringEventId: 'series' }]]) assert.equal(confirmAppointmentCalendarEvidence(cancelled, events, null), null);
  assert.equal(confirmAppointmentCalendarEvidence({ ...cancelled, calendar_sync_calendar_id: null }, [tombstone], null), null);
  assert.equal(confirmAppointmentCalendarEvidence({ ...cancelled, calendar_sync_in_flight: true }, [tombstone], null), null);
  assert.equal(confirmAppointmentCalendarEvidence({ ...cancelled, google_calendar_event_id: null }, [{ ...tombstone, description: expected.description }], null), null);
});

test('lee todas las páginas del calendario de la clínica sin acotar rango ni perder cancelaciones', async () => {
  const calls = [];
  const client = { events: { async list(params, options) {
    calls.push(params); assert.equal(params.calendarId, 'clinic-calendar'); assert.equal(params.q, row.id);
    assert.equal(params.timeMin, undefined); assert.equal(params.showDeleted, true); assert.equal(options.retry, false);
    return { data: params.pageToken ? { items: [{ ...event, id: 'duplicate' }] } : { items: [event], nextPageToken: 'page-2' } };
  } } };
  const events = await readAppointmentCalendarEvidence(client, 'clinic-calendar', row);
  assert.equal(calls.length, 2); assert.equal(events.length, 2); assert.equal(confirmAppointmentCalendarEvidence(row, events, expected), null);
});

test('lecturas incompletas, W5, calendario distinto y errores de get no prueban ausencia', async () => {
  await assert.rejects(readAppointmentCalendarEvidence(null, 'clinic-calendar', row), /W5/);
  await assert.rejects(readAppointmentCalendarEvidence({}, 'other-calendar', row), /cambiado/);
  for (const data of [{}, { items: [null] }, ...[1, 0, false, null, '', 'loop'].map(nextPageToken => ({ items: [event], nextPageToken }))]) {
    await assert.rejects(readAppointmentCalendarEvidence({ events: { list: async () => ({ data }) } }, 'clinic-calendar', row));
  }
  for (const status of [404, 410, 403, 500, 'timeout']) {
    await assert.rejects(readAppointmentCalendarEvidence({ events: { get: async () => { throw Object.assign(new Error('Fixture read failure'), { response: { status } }); } } }, 'clinic-calendar', { ...row, google_calendar_event_id: 'event-a' }));
  }
  await assert.rejects(readAppointmentCalendarEvidence({ events: { get: async () => ({ data: { id: 'other' } }) } }, 'clinic-calendar', { ...row, google_calendar_event_id: 'event-a' }));
});
