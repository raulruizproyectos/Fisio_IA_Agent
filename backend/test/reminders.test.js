import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/routes/reminders.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace('export default router;', '');

function harness(fetch, supabase = {}) {
  const routes = {};
  const context = vm.createContext({ fetch, supabase, AbortSignal, process: { env: { TELEGRAM_PATIENT_BOT_TOKEN: 'fixture' } },
    Router: () => ({ post: (path, fn) => { routes[path] = fn; }, get() {} }) });
  vm.runInContext(source, context);
  return { context, routes };
}

test('recordatorio confirma JSON Telegram y conserva entregas inciertas sin reenviar', async () => {
  for (const [fetch, expected] of [
    [async () => ({ ok: true, json: async () => ({ ok: true }) }), 'sent'],
    [async () => ({ ok: false, json: async () => ({ ok: false }) }), 'failed'],
    [async () => { throw Error('Lost acknowledgement'); }, 'processing'],
    [async () => ({ ok: true, json: async () => { throw Error('Incomplete response'); } }), 'processing'],
  ]) {
    const { context } = harness(fetch);
    assert.equal(await vm.runInContext("sendTelegramReminder('fixture-chat', 'Fixture')", context), expected);
  }
});

test('una reclamación anterior solo permite reintentar rechazos confirmados, no processing', async () => {
  const filters = []; let calls = 0; let result;
  const db = { from(table) {
    if (table === 'crm_recordatorio_envios') return {
      insert: async () => ({ error: { code: '23505' } }),
      update: () => chain({ data: null, error: null }),
    };
    return chain({ data: table === 'crm_citas' ? [{ id: 'fixture', paciente_id: 'patient', inicio_en: '2040-01-01T09:00Z' }]
      : table === 'vinculos_telegram_pacientes' ? [{ paciente_id: 'patient', telegram_chat_id: 'fixture-chat' }] : [] });
  } };
  function chain(value) {
    const q = { then: (resolve) => Promise.resolve(value).then(resolve), maybeSingle: async () => value,
      select: () => q, in: (key, v) => { filters.push([key, v]); return q; },
      eq: (key, v) => { filters.push([key, v]); return q; }, gte: () => q, lte: () => q, lt: () => q };
    return q;
  }
  const { routes } = harness(async () => { calls++; }, db);
  await routes['/']({}, { json: (value) => { result = value; } }, error => { throw error; });
  assert.equal(calls, 0); assert.equal(result.results[0].status, 'already_processed');
  assert.ok(filters.some(([key, value]) => key === 'estado' && value === 'failed'));
});
