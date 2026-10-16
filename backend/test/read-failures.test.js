import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-fixture';
delete process.env.OPENAI_API_KEY;
delete process.env.N8N_AGENT_WEBHOOK_URL;
const [{ default: patients }, { default: documents }, { default: bonos }, { default: invoices }, { default: notes }, { resolveAgentConversation }, { runWithRequestContext }, { default: exercises }] = await Promise.all([
  import('../src/routes/patients.js'), import('../src/routes/documents.js'), import('../src/routes/bonos.js'), import('../src/routes/invoices.js'),
  import('../src/routes/clinical-notes.js'), import('../src/routes/agent.js'), import('../src/lib/supabase.js'),
  import('../src/routes/exercises.js'),
]);
const failure = { code: 'XX000', message: 'Fixture read unavailable' };
function database(results) {
  return { from(table) {
    const result = results[table] || { data: [] };
    return { select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
      insert() { assert.fail('A failed or missing patient lookup must not create a document'); },
      single() { return this; }, maybeSingle() { return this; },
      then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
    };
  } };
}
async function invoke(router, method, path, db, body = {}) {
  const handler = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await runWithRequestContext({ supabase: db }, () => handler({ query: {}, params: { id: 'fixture' }, body }, res, error => { res.error = error; }));
  return res;
}

test('patient lists preserve failures instead of returning an empty or partial list', async () => {
  for (const table of ['crm_pacientes', 'pacientes']) {
    const res = await invoke(patients, 'get', '/', database({ [table]: { error: failure } }));
    assert.equal(res.error, failure);
    assert.equal(res.body, undefined);
  }
  const res = await invoke(patients, 'get', '/', database({ pacientes: { error: { code: 'PGRST205', message: 'Missing legacy table' } } }));
  assert.deepEqual(res.body, { data: [] });
});

test('follow-up and archive do not acknowledge a failed communication write', async t => {
  t.mock.method(console, 'warn', () => {});
  const db = { from(table) { return { select() { return this; }, eq() { return this; },
    async single() { return { data: { id: 'recommendation-a', paciente_id: 'patient-a', estado: 'requiere_revision' } }; },
    async insert() { assert.equal(table, 'crm_comunicaciones'); return { error: failure }; },
  }; } };
  for (const path of ['/recommendations/:recommendationId/follow-up', '/reports/archive']) {
    const res = await invoke(exercises, 'post', path, db, { recommendation_id: 'recommendation-a', note_text: 'Fixture observation' });
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.ok, false);
  }
});

test('consent documents require a successfully read patient before inserting', async () => {
  const failed = await invoke(documents, 'post', '/', database({ crm_pacientes: { error: failure } }), { paciente_id: 'fixture' });
  assert.equal(failed.error, failure);
  const absent = await invoke(documents, 'post', '/', database({ crm_pacientes: { data: null } }), { paciente_id: 'fixture' });
  assert.equal(absent.statusCode, 404);
  for (const tipo of ['__proto__', 'constructor', {}, 'unknown']) {
    const invalid = await invoke(documents, 'post', '/', { from() { assert.fail('Invalid document type must not reach the database'); } }, { paciente_id: 'fixture', tipo });
    assert.equal(invalid.statusCode, 400);
  }
});

test('single-record and PDF lookups distinguish database failure from a missing record', async () => {
  for (const [router, path, table] of [[bonos, '/:id', 'crm_bonos'], [documents, '/:id/pdf', 'crm_documentos'], [invoices, '/:id/pdf', 'crm_facturas']]) {
    const failed = await invoke(router, 'get', path, database({ [table]: { error: failure } }));
    assert.equal(failed.error, failure, `${table} must preserve the failure`);
    const absent = await invoke(router, 'get', path, database({ [table]: { data: null } }));
    assert.equal(absent.statusCode, 404);
  }
});

test('clinical synthesis and Copilot do not turn unavailable notes into an empty clinical history', async () => {
  const db = database({ crm_pacientes: { data: { id: 'fixture', nombre: 'Fixture' } }, crm_notas_clinicas: { error: failure } });
  const res = await invoke(notes, 'post', '/voice/synthesize', db, { paciente_id: '00000000-0000-4000-8000-000000000001', text: 'Sesión ficticia sin dolor' });
  assert.equal(res.error, failure);
  await assert.rejects(runWithRequestContext({ supabase: db }, () => resolveAgentConversation({ patientId: 'fixture', text: 'Evolución' })), error => error === failure);
});

test('Copilot rebuilds its summary from current notes instead of a stale stored summary', async () => {
  const db = database({ crm_pacientes: { data: { id: 'fixture', nombre: 'Fixture', resumen_clinico_longitudinal: 'OBSOLETE_FIXTURE' } },
    crm_notas_clinicas: { data: [{ id: 'note-1', fecha: '2026-10-15', nota: 'Current fixture note', dolor_eva: 0 }] } });
  const result = await runWithRequestContext({ supabase: db }, () => resolveAgentConversation({ patientId: 'fixture', text: 'Resumen' }));
  assert.match(result.data.reply_text, /Current fixture note/);
  assert.ok(!result.data.reply_text.includes('OBSOLETE_FIXTURE'));
});

test('direct Copilot requests have a deadline and safely fall back after cancellation', async t => {
  process.env.OPENAI_API_KEY = 'fixture-not-a-real-key';
  const { resolveAgentConversation: withProvider } = await import('../src/routes/agent.js?deadline-test');
  delete process.env.OPENAI_API_KEY;
  let signal;
  t.mock.method(globalThis, 'fetch', async (_url, options) => { signal = options.signal; throw new DOMException('Fixture aborted', 'AbortError'); });
  t.mock.method(console, 'error', () => {});
  const result = await withProvider({ text: 'Consulta sobre dolor', timeoutMs: 10 });
  assert.ok(signal instanceof AbortSignal);
  assert.equal(result.fallback_used, true);
});

test('Copilot mantiene el límite también mientras lee el cuerpo de n8n', async t => {
  const previous = process.env.N8N_AGENT_WEBHOOK_URL;
  process.env.N8N_AGENT_WEBHOOK_URL = 'https://example.invalid/fixture-agent';
  let signal;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    signal = options.signal;
    return { ok: true, status: 200, headers: new Headers(), text: () => new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve('{}'), 80);
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Fixture timeout', 'AbortError')); }, { once: true });
    }) };
  });
  try {
    const fallback = await resolveAgentConversation({ text: 'Hola', timeoutMs: 10 });
    assert.equal(signal.aborted, true);
    assert.equal(fallback.fallback_used, true);
    assert.equal(fallback.fallback_reason, 'timeout');
  } finally {
    if (previous === undefined) delete process.env.N8N_AGENT_WEBHOOK_URL;
    else process.env.N8N_AGENT_WEBHOOK_URL = previous;
  }
});
