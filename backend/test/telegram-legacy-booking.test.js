import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.DEFAULT_PROFESSIONAL_ID = 'fixture-professional';
delete process.env.TELEGRAM_LEGACY_BOOKING_ENABLED;

const { default: router } = await import('../src/routes/telegram.js');
const { runWithRequestContext } = await import('../src/lib/supabase.js');
const incoming = router.stack.find(layer => layer.route?.path === '/incoming').route.stack[0].handle;

async function invoke(text) {
  const writes = [];
  const requests = [];
  const db = { from(table) {
    const chain = new Proxy({}, { get(_target, key) {
      if (key === 'then') return resolve => resolve({ data: [], error: null });
      if (['update', 'insert', 'upsert', 'delete'].includes(key)) return payload => { writes.push({ table, payload }); return chain; };
      if (key === 'maybeSingle' || key === 'single') return async () => ({
        data: table === 'vinculos_telegram_pacientes'
          ? { id: 'link-a', paciente_id: 'patient-a', profesional_id: 'fixture-professional', telegram_chat_id: 'chat-a' }
          : null,
        error: null,
      });
      return () => chain;
    } });
    return chain;
  } };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => { requests.push(String(url)); return Response.json({}); };
  const res = { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  try {
    await runWithRequestContext({ supabase: db, auth: { actor_type: 'telegram' } }, () => incoming({
      body: { chat_id: 'chat-a', texto_mensaje: text, agent_mode: 'patient_appointments' }, query: {},
      protocol: 'http', get: () => 'fixture.invalid' }, res, error => { throw error; }));
    return { res, writes, requests };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

for (const text of ['Quiero una cita el lunes a las 10 por dolor de espalda', 'Cancela mi cita de mañana', '/cita 2026-11-10T10:00 2026-11-10T10:45 lumbar']) {
  test(`el bot legacy deriva a la clínica sin reservar ni cancelar: ${text}`, async () => {
    const { res, writes, requests } = await invoke(text);
    assert.match(res.body?.reply_text || '', /no se reservan, cambian ni cancelan citas/);
    assert.equal(requests.filter(url => /appointments|agenda|citas|webhook/i.test(url)).length, 0, requests.join(', '));
    assert.equal(writes.filter(write => write.table === 'crm_citas').length, 0);
    assert.ok(writes.some(write => /intake|mensajes|bandeja/i.test(write.table)), `La clínica debe recibir la petición: ${writes.map(w => w.table).join(', ')}`);
  });
}

async function startWith(link, chatId = 'chat-new') {
  const updates = [];
  const db = { from(table) {
    let op = 'read';
    const chain = new Proxy({}, { get(_target, key) {
      if (key === 'then') return resolve => resolve({ data: [], error: null });
      if (key === 'update') return payload => { op = 'update'; updates.push({ table, payload }); return chain; };
      if (key === 'single') return async () => ({ data: link, error: link ? null : { message: 'not found' } });
      if (key === 'maybeSingle') return async () => ({ data: op === 'update' ? { id: link?.id } : null, error: null });
      return () => chain;
    } });
    return chain;
  } };
  const res = { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  await runWithRequestContext({ supabase: db, auth: { actor_type: 'telegram' } }, () => incoming({
    body: { chat_id: chatId, texto_mensaje: '/start ABC123', agent_mode: 'patient_appointments' }, query: {},
    protocol: 'http', get: () => 'fixture.invalid' }, res, error => { throw error; }));
  return { reply: res.body?.reply_text || '', updates };
}

test('un código de vinculación ya usado por otro chat no mueve el vínculo del paciente', async () => {
  const { reply, updates } = await startWith({ id: 'link-a', paciente_id: 'patient-a', telegram_chat_id: 'chat-original', creado_en: new Date().toISOString() });
  assert.match(reply, /no válido o caducado/);
  assert.equal(updates.length, 0);
});

test('un código caducado no vincula y uno vigente saluda sin ofrecer reservas por chat', async () => {
  const old = await startWith({ id: 'link-a', paciente_id: 'patient-a', telegram_chat_id: null, actualizado_en: '2026-01-01T00:00:00Z' });
  assert.match(old.reply, /no válido o caducado/);
  assert.equal(old.updates.length, 0);
  const fresh = await startWith({ id: 'link-a', paciente_id: 'patient-a', telegram_chat_id: null, actualizado_en: new Date().toISOString(), pacientes: { nombre_completo: 'Ana' } });
  assert.match(fresh.reply, /Hola Ana, ya estás vinculado/);
  assert.equal(fresh.updates.length, 1);
});
