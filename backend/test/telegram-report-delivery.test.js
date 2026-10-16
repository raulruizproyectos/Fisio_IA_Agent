import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.TELEGRAM_PATIENT_BOT_TOKEN = 'fixture-bot-token';
delete process.env.TELEGRAM_PILOT_BOOKING_ENABLED;

const { default: router } = await import('../src/routes/telegram.js');
const { serviceSupabase, runWithRequestContext } = await import('../src/lib/supabase.js');
const handler = router.stack.find(layer => layer.route?.path === '/patient-report/send').route.stack[0].handle;

async function withDelivery(fn) {
  const ledger = new Map();
  const sent = [];
  const reads = [];
  const state = { clinicId: 'clinic-a', visible: true, patientVisible: true, legacyPatient: false, claimError: false, lostClaimAck: false, finishError: false,
    documentError: false, documentAck: true, introError: false, recommendationStateError: false };
  const report = { id: 'rec-a', paciente_id: 'patient-a', fisioterapeuta_id: 'profile-a', estado: 'aprobada', report_version: 1,
    reviewed_at: '2026-10-15T10:00:00Z', reviewed_by_profile_id: 'profile-a', crm_pacientes: { nombre: 'Fixture' },
    report_snapshot: { exercises: [{ exercise_id: 'ex-a', nombre: 'Fixture exercise' }], message_to_patient: 'Approved introduction' } };
  const userDb = { from(table) {
    const filters = [];
    const result = () => {
      if (table === 'crm_recomendaciones') return { data: state.visible && filters.every(([key, value]) => report[key] === value) ? report : null };
      if (table === 'crm_pacientes') return { data: state.patientVisible ? [{ id: 'patient-a', nombre: 'Fixture', clinica_id: state.clinicId }] : [] };
      if (table === 'pacientes') return { data: state.legacyPatient ? [{ id: 'patient-a', profesional_id: 'profile-a', nombre_completo: 'Legacy fixture' }] : [] };
      if (table === 'vinculos_telegram_pacientes') return { data: { telegram_chat_id: 'linked-patient-chat' } };
      return { data: [] };
    };
    return { select(fields) { reads.push({ table, fields }); return this; }, eq(key, value) { filters.push([key, value]); return this; },
      in() { return this; }, limit() { return this; }, insert() { return this; }, async maybeSingle() { return result(); }, then(resolve) { resolve(result()); } };
  } };
  const previousFrom = serviceSupabase.from;
  serviceSupabase.from = table => {
    let payload; let inserting = false; let id;
    const result = () => {
      if (table === 'crm_mensajeria_eventos') {
        if (inserting) {
          if (ledger.has(payload.id)) return { error: { code: '23505' } };
          if (state.claimError) return { error: { message: 'Synthetic claim failure' } };
          const row = { estado: 'procesando', ...payload }; ledger.set(row.id, row);
          if (state.lostClaimAck) return { error: { message: 'Synthetic lost claim acknowledgement' } };
          return { data: row };
        }
        if (state.finishError) return { error: { message: 'Synthetic receipt failure' } };
        Object.assign(ledger.get(id), payload);
        return { data: ledger.get(id) };
      }
      if (table === 'crm_recomendaciones') {
        if (state.recommendationStateError) return { error: { message: 'Synthetic state failure' } };
        Object.assign(report, payload); return { data: { id: report.id } };
      }
      return { data: null };
    };
    return { insert(value) { payload = value; inserting = true; return this; }, update(value) { payload = value; return this; },
      eq(key, value) { if (key === 'id') id = value; return this; }, in() { return this; }, select() { return this; },
      async single() { return result(); }, async maybeSingle() { return result(); }, then(resolve) { resolve(result()); } };
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const operation = String(url).split('/').at(-1);
    assert.ok(['sendMessage', 'sendDocument'].includes(operation), 'Fixture must never call another service');
    sent.push({ operation, options });
    if (operation === 'sendMessage' && state.introError) throw new DOMException('Lost introduction acknowledgement', 'TimeoutError');
    if (operation === 'sendDocument' && state.documentError) throw new DOMException('Lost document acknowledgement', 'TimeoutError');
    return Response.json({ ok: true, result: operation === 'sendDocument' && !state.documentAck ? {} : { message_id: sent.length } });
  };
  const invoke = async (extra = {}, auth = { profile_id: 'profile-a', clinic_id: 'clinic-a' }) => {
    const res = { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
    await runWithRequestContext({ supabase: userDb, auth }, () => handler({ body: { patient_id: 'patient-a', recommendation_id: 'rec-a', ...extra }, query: {}, auth }, res));
    return res;
  };
  try { await fn({ invoke, state, ledger, sent, report, reads }); }
  finally { globalThis.fetch = originalFetch; serviceSupabase.from = previousFrom; }
}

test('repetir o llamar concurrentemente al mismo plan y versión envía un único documento', async () => withDelivery(async ({ invoke, ledger, sent }) => {
  const responses = await Promise.all([invoke(), invoke()]);
  assert.deepEqual(responses.map(res => res.statusCode).sort(), [200, 409]);
  assert.equal((await invoke()).statusCode, 409);
  assert.equal(sent.filter(item => item.operation === 'sendDocument').length, 1);
  assert.equal(sent.filter(item => item.operation === 'sendMessage').length, 1);
  assert.equal(ledger.size, 1);
  assert.equal([...ledger.values()][0].estado, 'procesado');
}));

test('acuse perdido del documento queda incierto y bloquea otro envío', async () => withDelivery(async ({ invoke, state, ledger, sent, report }) => {
  state.documentError = true;
  const unknown = await invoke();
  assert.equal(unknown.statusCode, 503);
  assert.equal(unknown.body.code, 'TELEGRAM_DELIVERY_UNCERTAIN');
  assert.match(unknown.body.error, /No repitas el envío/);
  assert.equal(report.estado, 'aprobada');
  assert.equal([...ledger.values()][0].estado, 'revision_manual');
  state.documentError = false;
  assert.equal((await invoke()).statusCode, 409);
  assert.equal(sent.filter(item => item.operation === 'sendDocument').length, 1);
}));

test('acuse perdido de la introducción también bloquea la operación entera', async () => withDelivery(async ({ invoke, state, sent }) => {
  state.introError = true;
  assert.equal((await invoke()).statusCode, 503);
  state.introError = false;
  assert.equal((await invoke()).statusCode, 409);
  assert.deepEqual(sent.map(item => item.operation), ['sendMessage']);
}));

test('ok sin message_id no confirma entrega ni permite repetirla', async () => withDelivery(async ({ invoke, state, report, ledger, sent }) => {
  state.documentAck = false;
  assert.equal((await invoke()).statusCode, 503);
  assert.equal(report.estado, 'aprobada');
  assert.equal([...ledger.values()][0].estado, 'revision_manual');
  assert.equal((await invoke()).statusCode, 409);
  assert.equal(sent.filter(item => item.operation === 'sendDocument').length, 1);
}));

test('sin claim persistido no se intenta enviar y el error de DB no se oculta como éxito', async () => withDelivery(async ({ invoke, state, ledger, sent }) => {
  state.claimError = true;
  const res = await invoke();
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'TELEGRAM_DELIVERY_CLAIM_FAILED');
  assert.equal(ledger.size, 0);
  assert.equal(sent.length, 0);
}));

test('acuse perdido del claim conserva el bloqueo existente sin realizar envíos', async () => withDelivery(async ({ invoke, state, ledger, sent }) => {
  state.lostClaimAck = true;
  assert.equal((await invoke()).statusCode, 503);
  assert.equal(ledger.size, 1);
  state.lostClaimAck = false;
  assert.equal((await invoke()).statusCode, 409);
  assert.equal(sent.length, 0);
}));

test('si falla registrar el recibo tras Telegram, no se devuelve éxito y otro POST queda bloqueado', async () => withDelivery(async ({ invoke, state, sent, report }) => {
  state.finishError = true;
  const res = await invoke();
  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /No repitas el envío/);
  assert.equal(report.estado, 'aprobada');
  state.finishError = false;
  assert.equal((await invoke()).statusCode, 409);
  assert.equal(sent.filter(item => item.operation === 'sendDocument').length, 1);
}));

test('la clínica procede del paciente leído por RLS y un cuerpo forjado no puede cambiarla', async () => withDelivery(async ({ invoke, ledger, reads }) => {
  assert.equal((await invoke({ clinica_id: 'forged-clinic', clinic_id: 'forged-clinic' })).statusCode, 200);
  assert.equal([...ledger.values()][0].clinica_id, 'clinic-a');
  assert.ok(reads.some(read => read.table === 'crm_pacientes' && read.fields.includes('clinica_id')));
}));

test('una clínica diferente a la sesión o un paciente invisible no llegan al ledger privilegiado', async () => withDelivery(async ({ invoke, state, ledger, sent }) => {
  assert.equal((await invoke({}, { profile_id: 'other-profile', clinic_id: 'other-clinic' })).statusCode, 403);
  state.patientVisible = false;
  assert.equal((await invoke()).statusCode, 404);
  state.visible = false;
  assert.equal((await invoke()).statusCode, 404);
  assert.equal(ledger.size, 0);
  assert.equal(sent.length, 0);
}));

test('sin clínica verificable se rechaza antes de enviar', async () => withDelivery(async ({ invoke, state, ledger, sent }) => {
  state.clinicId = null;
  assert.equal((await invoke()).statusCode, 503);
  assert.equal(ledger.size, 0);
  assert.equal(sent.length, 0);
}));

test('dry-run no reclama ni envía; la versión nueva conserva su propio recibo', async () => withDelivery(async ({ invoke, ledger, sent, report }) => {
  const preview = await invoke({ dry_run: true });
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.body.dry_run, true);
  assert.equal(ledger.size, 0);
  assert.equal(sent.length, 0);
  assert.equal((await invoke()).statusCode, 200);
  report.report_version = 2;
  assert.equal((await invoke()).statusCode, 200);
  assert.equal(ledger.size, 2);
  assert.equal(sent.filter(item => item.operation === 'sendDocument').length, 2);
}));

test('el documento usa timeout y el éxito exige un recibo válido antes de marcar enviada', async () => withDelivery(async ({ invoke, sent, report }) => {
  assert.equal((await invoke()).statusCode, 200);
  assert.ok(sent.find(item => item.operation === 'sendDocument').options.signal instanceof AbortSignal);
  assert.equal(report.estado, 'enviada');
}));

test('un duplicado legado no sustituye la clínica canónica del paciente del informe aprobado', async () => withDelivery(async ({ invoke, state, ledger }) => {
  state.legacyPatient = true;
  assert.equal((await invoke()).statusCode, 200);
  assert.equal([...ledger.values()][0].clinica_id, 'clinic-a');
}));
