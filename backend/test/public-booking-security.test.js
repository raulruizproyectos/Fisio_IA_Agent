import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.GOOGLE_CALENDAR_TIMEZONE = 'Europe/Madrid';
process.env.PUBLIC_BOOKING_MAX_DAYS_AHEAD = '45';
for (const key of ['GOOGLE_CALENDAR_ID', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'W5_CALENDAR_READER_URL', 'W6_CALENDAR_WRITER_URL', 'PUBLIC_BOOKING_WINDOWS']) delete process.env[key];
const { default: router } = await import('../src/routes/professional.js');
const { runWithRequestContext } = await import('../src/lib/supabase.js');

function fixture(patientOverrides = {}) {
  const writes = [], appointments = [];
  const patient = { id: 'patient-private', email: 'existing@example.invalid', telefono: null, ...patientOverrides };
  const db = { from(table) {
    let operation = 'read', payload, options;
    const filters = [];
    const query = {
      select() { return this; }, eq(key, value) { filters.push([key, value]); return this; },
      in() { return this; }, lt() { return this; }, gt() { return this; }, not() { return this; }, limit() { return this; }, order() { return this; },
      insert(value) { operation = 'insert'; payload = value; return this; },
      update(value) { operation = 'update'; payload = value; return this; },
      upsert(value, upsertOptions) { operation = 'upsert'; payload = value; options = upsertOptions; return this; },
      async single() { return execute(); }, async maybeSingle() { return execute(); },
      then(resolve, reject) { return Promise.resolve(execute()).then(resolve, reject); },
    };
    function execute() {
      if (operation !== 'read') writes.push({ table, operation, payload, options });
      if (table === 'crm_perfiles') return { data: { id: 'profile-a', nombre_completo: 'Profesional ficticio', activo: true, clinica_id: 'clinic-a', crm_clinicas: { id: 'clinic-a', activo: true } } };
      if (table === 'crm_pacientes') {
        const emailFilter = filters.find(([key]) => key === 'email');
        return { data: emailFilter ? (patient.email === emailFilter[1] ? patient : null) : [patient] };
      }
      if (table === 'crm_asignaciones_fisio_paciente') return { data: null };
      assert.equal(table, 'crm_citas');
      if (operation === 'insert') {
        const row = { ...payload, id: randomUUID(), crm_pacientes: { nombre: 'Identidad privada', apellidos: 'No facilitada' } };
        appointments.push(row);
        return { data: row };
      }
      const requestKey = filters.find(([key]) => key === 'request_id')?.[1];
      return { data: requestKey ? appointments.find(row => row.request_id === requestKey) || null : [] };
    }
    return query;
  } };
  return { db, writes, appointments };
}

async function invoke(store, body, { key = randomUUID(), now = '2026-10-16T10:00:00Z', path = '/public-booking/appointments' } = {}) {
  const NativeDate = globalThis.Date;
  globalThis.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return NativeDate.parse(now); }
  };
  const res = { statusCode: 200, headers: {}, set(name, value) { this.headers[name] = value; return this; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  try {
    const handler = router.stack.find(layer => layer.route?.path === path && layer.route.methods.post).route.stack[0].handle;
    await runWithRequestContext({ supabase: store.db }, () => handler({ body, get: () => key }, res, error => { throw error; }));
    return res;
  } finally { globalThis.Date = NativeDate; }
}

const body = { professional_id: 'profile-a', full_name: 'Nombre proporcionado', email: 'existing@example.invalid', phone: '+34600000000', start_at: '2026-10-19T07:00:00Z', end_at: '2026-10-19T08:00:00Z' };
const publicKeys = ['estado', 'fin_en', 'id', 'inicio_en'];

test('alta, repetición y recuperación públicas solo muestran la cita y conservan contactos existentes', async () => {
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = () => assert.fail('No debe contactar servicios externos');
  try {
    const store = fixture(), key = randomUUID();
    const created = await invoke(store, body, { key });
    assert.equal(created.statusCode, 201);
    assert.deepEqual(Object.keys(created.body.data).sort(), publicKeys);
    assert.equal(created.body.booking.professional_name, 'Profesional ficticio');
    assert.equal(store.writes.some(write => write.table === 'crm_pacientes'), false, 'Un formulario sin verificación no modifica contactos de una ficha existente');
    assert.equal(store.appointments[0].paciente_id, 'patient-private');
    const writeCount = store.writes.length;
    const replay = await invoke(store, body, { key, now: '2026-12-20T10:00:00Z' });
    assert.equal(replay.statusCode, 200, 'Se recupera una cita ya guardada aunque haya pasado la ventana');
    assert.equal(replay.body.replayed, true);
    assert.deepEqual(Object.keys(replay.body.data).sort(), publicKeys);
    const recovered = await invoke(store, { professional_id: 'profile-a' }, { key, path: '/public-booking/recovery' });
    assert.equal(recovered.body.state, 'registered');
    assert.deepEqual(Object.keys(recovered.body.data).sort(), publicKeys);
    assert.equal(store.writes.length, writeCount, 'La recuperación no crea citas ni reintenta Calendar');
    assert.ok(!JSON.stringify([created.body, replay.body, recovered.body]).includes('Identidad privada'));
    const phoneMatch = fixture({ email: null, telefono: body.phone });
    const byPhone = await invoke(phoneMatch, body);
    assert.equal(byPhone.statusCode, 201);
    assert.equal(phoneMatch.writes.some(write => write.table === 'crm_pacientes'), false, 'Tampoco se añade email no verificado al coincidir por teléfono');
    assert.deepEqual(Object.keys(byPhone.body.data).sort(), publicKeys);
  } finally { globalThis.fetch = nativeFetch; }
});

test('POST aplica el mismo máximo local de 45 días que GET, incluso al cruzar el cambio de hora', async () => {
  for (const [now, maxStart, outsideStart] of [
    ['2026-10-16T10:00:00Z', '2026-11-30T08:00:00Z', '2026-12-01T08:00:00Z'],
    ['2027-02-20T10:00:00Z', '2027-04-06T07:00:00Z', '2027-04-07T07:00:00Z'],
    ['2027-05-01T10:00:00Z', '2027-06-15T07:00:00Z', '2027-06-16T07:00:00Z'],
  ]) {
    const slot = start => ({ ...body, start_at: start, end_at: new Date(Date.parse(start) + 3600000).toISOString() });
    const store = fixture();
    assert.equal((await invoke(store, slot(maxStart), { now })).statusCode, 201, `Límite inclusivo ${maxStart}`);
    const rejectedStore = fixture();
    assert.equal((await invoke(rejectedStore, slot(outsideStart), { now })).statusCode, 400, `Fuera de ventana ${outsideStart}`);
    assert.equal(rejectedStore.writes.length, 0);
  }
});

test('una reserva pública nunca reactiva una asignación que la clínica terminó', async () => {
  const store = fixture();
  const res = await invoke(store, body);
  assert.equal(res.statusCode, 201);
  const assignment = store.writes.find(write => write.table === 'crm_asignaciones_fisio_paciente');
  assert.ok(assignment, 'first link is still created so the professional sees the appointment');
  assert.equal(assignment.options?.ignoreDuplicates, true);
  assert.equal('desasignado_en' in assignment.payload, false);
});
