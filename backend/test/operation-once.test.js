import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';

const { writeOnce } = await import('../src/lib/operation-once.js');
const { runWithRequestContext } = await import('../src/lib/supabase.js');

const KEY = '7b1f2c4e-8a3d-4f6b-9c2e-1d5a7b9c3e4f';
const request = (key = KEY) => ({ get: (name) => (name.toLowerCase() === 'idempotency-key' ? key : undefined) });

function harness(claim) {
  const calls = [];
  const db = { rpc: async (name, args) => {
    calls.push(name);
    if (name === 'claim_clinic_operation') return claim;
    return { data: null, error: null };
  } };
  const run = (fn) => runWithRequestContext({ supabase: db }, fn);
  return { calls, run };
}

test('sin clave el cobro se escribe como antes', async () => {
  const { calls, run } = harness({ data: { state: 'claimed' }, error: null });
  let writes = 0;
  const result = await run(() => writeOnce(request(''), 'payment', {}, async () => { writes++; return { data: { id: 'p1' }, error: null }; }));
  assert.equal(writes, 1); assert.equal(result.data.id, 'p1'); assert.deepEqual(calls, []);
});

test('primera vez: reclama, escribe y cierra el recibo', async () => {
  const { calls, run } = harness({ data: { state: 'claimed' }, error: null });
  const result = await run(() => writeOnce(request(), 'payment', { importe: 45 }, async () => ({ data: { id: 'p1' }, error: null })));
  assert.equal(result.data.id, 'p1');
  assert.deepEqual(calls, ['claim_clinic_operation', 'finish_clinic_operation']);
});

test('un reintento tras éxito devuelve el mismo cobro sin escribir otro', async () => {
  const { run } = harness({ data: { state: 'replay', result: { id: 'p1' } }, error: null });
  let writes = 0;
  const result = await run(() => writeOnce(request(), 'payment', {}, async () => { writes++; return { data: {}, error: null }; }));
  assert.equal(writes, 0); assert.equal(result.data.id, 'p1'); assert.equal(result.replayed, true);
});

test('si la primera petición quedó en duda, el reintento se bloquea', async () => {
  const { run } = harness({ data: { state: 'pending' }, error: null });
  let writes = 0;
  const result = await run(() => writeOnce(request(), 'invoice', {}, async () => { writes++; return { data: {}, error: null }; }));
  assert.equal(writes, 0); assert.equal(result.error.code, 'PT409'); assert.match(result.error.message, /Revisa la lista/);
});

test('un fallo seguro de la base de datos libera el recibo; uno de red lo conserva', async () => {
  let h = harness({ data: { state: 'claimed' }, error: null });
  await h.run(() => writeOnce(request(), 'bono_use', {}, async () => ({ data: null, error: { code: 'PT409', message: 'Bono agotado' } })));
  assert.deepEqual(h.calls, ['claim_clinic_operation', 'release_clinic_operation']);
  h = harness({ data: { state: 'claimed' }, error: null });
  await h.run(() => writeOnce(request(), 'bono_use', {}, async () => ({ data: null, error: { code: '', message: 'TypeError: fetch failed' } })));
  assert.deepEqual(h.calls, ['claim_clinic_operation']);
});

test('antes de aplicar la migración se comporta como antes', async () => {
  const { run } = harness({ data: null, error: { code: 'PGRST202', message: 'function not found' } });
  let writes = 0;
  await run(() => writeOnce(request(), 'payment', {}, async () => { writes++; return { data: { id: 'p1' }, error: null }; }));
  assert.equal(writes, 1);
});

test('una clave que no es UUID se rechaza sin escribir', async () => {
  const { run } = harness({ data: { state: 'claimed' }, error: null });
  let writes = 0;
  const result = await run(() => writeOnce(request('abc'), 'payment', {}, async () => { writes++; return { data: {}, error: null }; }));
  assert.equal(writes, 0); assert.equal(result.error.code, 'PT400');
});
