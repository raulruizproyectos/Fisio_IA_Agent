import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
delete process.env.GOOGLE_CALENDAR_ID;

const { reconcileAppointmentsWithCalendar } = await import('../src/routes/professional.js');
const { runWithRequestContext } = await import('../src/lib/supabase.js');

const row = {
  id: 'appt-1', google_calendar_event_id: 'event-1', estado: 'confirmada', motivo: 'Lumbalgia', updated_at: 'v1',
  calendar_sync_pending: false, inicio_en: '2026-10-20T07:00:00+00:00', fin_en: '2026-10-20T07:45:00+00:00',
};
const event = { google_calendar_event_id: 'event-1', status: 'confirmed', description: 'Lumbalgia',
  inicio_en: '2026-10-20T07:00:00.000Z', fin_en: '2026-10-20T07:45:00.000Z' };

function database(updateResult) {
  const updates = [];
  const chain = (table) => new Proxy({}, { get(_target, key) {
    if (key === 'then') return resolve => resolve({ data: [], error: null });
    if (key === 'update') return (payload) => { updates.push({ table, payload }); return chain(table); };
    if (key === 'maybeSingle') return async () => updateResult;
    return () => chain(table);
  } });
  return { updates, db: { from: chain } };
}

async function reconcile(db, calendarEvent) {
  return runWithRequestContext({ supabase: db }, () => reconcileAppointmentsWithCalendar({
    professionalId: 'prof-1', rows: [row], calendarEvents: [calendarEvent], fromAt: '2026-10-19T00:00:00Z', toAt: '2026-10-26T00:00:00Z',
  }));
}

test('abrir la agenda no reescribe una cita de Calendar con la misma hora en otro formato', async () => {
  const { updates, db } = database({ data: null, error: null });
  await reconcile(db, event);
  assert.deepEqual(updates, []);
});

test('un evento movido sobre otra cita no bloquea el resto de la agenda', async () => {
  const { updates, db } = database({ data: null, error: { code: '23P01', message: 'conflicting key value' } });
  const result = await reconcile(db, { ...event, inicio_en: '2026-10-20T09:00:00.000Z', fin_en: '2026-10-20T09:45:00.000Z' });
  assert.equal(updates.length, 1);
  assert.equal(result.calendar_sync.conflicts, 1);
  assert.equal(result.rows[0].inicio_en, row.inicio_en);
});
