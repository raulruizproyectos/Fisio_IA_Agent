import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-server-key';
delete process.env.N8N_AGENT_WEBHOOK_URL;
const [{ default: agent }, { default: notes }, { default: exercises }, { runWithRequestContext }, { authorizeRequest }] = await Promise.all([
  import('../src/routes/agent.js'), import('../src/routes/clinical-notes.js'), import('../src/routes/exercises.js'), import('../src/lib/supabase.js'), import('../src/middleware/security.js'),
]);
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
async function invoke(router, path, body, db = { from() { assert.fail('Invalid input must not reach SQL'); } }, auth = { profile_id: 'server-profile', clinic_id: 'server-clinic' }) {
  const handler = router.stack.find(layer => layer.route?.path === path && layer.route.methods.post).route.stack[0].handle;
  const res = response();
  await runWithRequestContext({ supabase: db, auth }, () => handler({ body, auth, get() { return null; } }, res, error => { throw error; }));
  return res;
}

test('copiloto toma identidad/canal/rol de sesión y rechaza texto o pacientes inválidos', async () => {
  const res = await invoke(agent, '/message', { text: 'Hola', profesional_id: 'forged', role: 'patient', channel: 'telegram' });
  assert.equal(res.body.data.received.profesional_id, 'server-profile');
  assert.equal(res.body.data.received.channel, 'web'); assert.equal(res.body.data.role, 'professional');
  for (const text of [{}, [], 'x'.repeat(12001), '']) assert.equal((await invoke(agent, '/message', { text })).statusCode, 400);
  assert.equal((await invoke(agent, '/message', { text: 'Hola', paciente_id: 'invalid' })).statusCode, 400);
  const hidden = { from() { return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: null }) }; } };
  assert.equal((await invoke(agent, '/message', { text: 'Hola', paciente_id: '00000000-0000-4000-8000-000000000001' }, hidden)).statusCode, 404);
});

test('ejercicios validan síntomas antes de pagar y derivan el profesional de la sesión', async () => {
  for (const path of ['/recommend', '/recommend/async']) {
    for (const symptoms of [{}, [], '', 'x'.repeat(12001)]) {
      assert.equal((await invoke(exercises, path, { symptoms })).statusCode, 400);
    }
  }
  const profile = '00000000-0000-4000-8000-000000000011', filters = [];
  const db = { from(table) {
    assert.equal(table, 'crm_perfiles');
    return { select() { return this; }, eq(key, value) { filters.push([key, value]); return this; }, maybeSingle: async () => ({ data: { id: profile } }) };
  } };
  const res = await invoke(exercises, '/recommend', { symptoms: 'Dolor', fisioterapeuta_id: '00000000-0000-4000-8000-000000000012' }, db, { profile_id: profile, clinic_id: 'server-clinic' });
  assert.equal(res.statusCode, 400); // No patient selected: no provider call.
  assert.deepEqual(filters, [['id', profile]]);
});

test('audio/síntesis rechazan entradas inválidas y pacientes sin acceso antes de pagar al proveedor', async () => {
  for (const body of [{ audio_base64: {} }, { audio_base64: 'invalid?' }, { audio_base64: 'YQ==', mime_type: 'application/javascript' }, { audio_base64: 'YQ==', filename: '../secret.txt' }]) {
    assert.equal((await invoke(notes, '/voice/transcribe', body)).statusCode, 400);
  }
  for (const text of [{}, [], 'x'.repeat(12001), '']) assert.equal((await invoke(notes, '/voice/synthesize', { text })).statusCode, 400);
  assert.equal((await invoke(notes, '/voice/synthesize', { text: 'Session', paciente_id: 'invalid' })).statusCode, 400);
  const hidden = { from() { return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: null }) }; } };
  assert.equal((await invoke(notes, '/voice/synthesize', { text: 'Session', paciente_id: '00000000-0000-4000-8000-000000000001' }, hidden)).statusCode, 404);
});

test('todas las rutas declaradas rechazan falta de sesión excepto las excepciones públicas exactas', async () => {
  const mounts = { patients: ['pacientes', 'patients'], professional: ['professional', 'profesional'], agent: ['agent', 'agente'], exercises: ['exercises', 'ejercicios'], payments: ['pagos'], 'clinical-notes': ['notas-clinicas'], reminders: ['cron/recordatorios'], invoices: ['facturas'], documents: ['documentos'], bonos: ['bonos'], telegram: ['telegram'], whatsapp: ['whatsapp'] };
  const publicRoutes = new Set(['get /public-booking/config', 'get /public-booking/slots', 'post /public-booking/appointments', 'post /public-booking/recovery']);
  let count = 0;
  for (const [file, prefixes] of Object.entries(mounts)) {
    const code = readFileSync(new URL(`../src/routes/${file}.js`, import.meta.url), 'utf8');
    for (const match of code.matchAll(/router\.(get|post|put|patch|delete)\('([^']+)'/g)) {
      const [, method, route] = match;
      if (file === 'professional' && publicRoutes.has(`${method} ${route}`)) continue;
      for (const prefix of prefixes) {
        const res = response();
        await authorizeRequest({ method, path: `/api/${prefix}${route}`, get() { return null; } }, res, () => assert.fail(`${method} ${prefix}${route} permitted without authentication`));
        assert.ok([401, 503].includes(res.statusCode)); count++;
      }
    }
  }
  assert.ok(count > 80, 'Inventory must cover the complete router set and aliases');
});
