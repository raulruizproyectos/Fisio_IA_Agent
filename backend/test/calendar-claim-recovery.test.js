import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
delete process.env.GOOGLE_CALENDAR_ID;

const { default: router, CALENDAR_CLAIM_STALE_MS } = await import('../src/routes/professional.js');
const { runWithRequestContext } = await import('../src/lib/supabase.js');
const handler = router.stack.find(layer => layer.route?.path === '/appointments/:appointmentId/check-calendar').route.stack[0].handle;
const ID = '5f0c3a1e-2b4d-4c6e-8f1a-3b5d7e9f1a2c';

async function check(since) {
  const row = { id: ID, fisioterapeuta_id: 'prof-a', estado: 'confirmada', updated_at: 'v1', calendar_sync_pending: true,
    calendar_sync_in_flight: true, calendar_sync_in_flight_since: since };
  const updates = [];
  const db = { from() {
    let op = 'read';
    const chain = new Proxy({}, { get(_t, key) {
      if (key === 'update') return (payload) => { op = 'update'; updates.push(payload); return chain; };
      if (key === 'maybeSingle') return async () => ({ data: op === 'update' ? { ...row, calendar_sync_in_flight: false, calendar_sync_in_flight_since: null, updated_at: 'v2' } : row, error: null });
      return () => chain;
    } });
    return chain;
  } };
  const res = { headers: {}, set(k, v) { this.headers[k] = v; return this; }, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  await runWithRequestContext({ supabase: db }, () => handler({ params: { appointmentId: ID }, body: { updated_at: 'v1' },
    auth: { profile_id: 'prof-a', clinic_id: 'clinic-a' } }, res, (error) => { throw error; }));
  return { status: res.body?.calendar_check?.status, updates };
}

test('una sincronización con Calendar reciente sigue bloqueando la cita', async () => {
  const { status, updates } = await check(new Date().toISOString());
  assert.equal(status, 'in_progress');
  assert.equal(updates.length, 0);
});

test('una reserva antigua (proceso caído) se libera y solo se lee Calendar, sin volver a escribir', async () => {
  const { status, updates } = await check(new Date(Date.now() - CALENDAR_CLAIM_STALE_MS - 1000).toISOString());
  assert.deepEqual(updates, [{ calendar_sync_in_flight: false, calendar_sync_in_flight_since: null }]);
  // Without a complete Calendar reader the result stays unproven: the appointment remains blocked.
  assert.equal(status, 'pending');
});

test('una reserva sin hora de inicio se trata como en curso', async () => {
  const { status, updates } = await check(null);
  assert.equal(status, 'in_progress');
  assert.equal(updates.length, 0);
});
