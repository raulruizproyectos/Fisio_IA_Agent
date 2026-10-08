import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
const { default: router } = await import('../src/routes/payments.js');
const { runWithRequestContext } = await import('../src/lib/supabase.js');

async function invoke(method, path, body, db, query = {}) {
  const handler = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await runWithRequestContext({ supabase: db }, () => handler({ body, query, params: { id: 'missing' } }, res, error => { throw error; }));
  return res;
}

test('alta y edición de pagos rechazan importes inválidos antes de escribir', async () => {
  const db = { from() { assert.fail('El pago inválido no debe llegar a la base'); } };
  for (const importe of ['abc', 'NaN', 'Infinity', Infinity, NaN, -1, 0, null, true, {}, 0.001, 1000000, '1e3']) {
    for (const method of ['post', 'patch']) {
      const res = await invoke(method, method === 'post' ? '/' : '/:id', { paciente_id: 'patient-a', importe, metodo_pago: 'efectivo' }, db);
      assert.equal(res.statusCode, 400, `${method} ${String(importe)}`);
    }
  }
  for (const body of [{ fecha: '2026-02-30' }, { fecha: null }, { fecha: 'wrong' }, { metodo_pago: '' }, { paciente_id: null }]) {
    assert.equal((await invoke('patch', '/:id', body, db)).statusCode, 400);
  }
});

test('un pago válido conserva céntimos y editar uno inexistente responde 404', async () => {
  let written;
  const db = { from() { return {
    insert(row) { written = row; return this; }, update(row) { written = row; return this; }, eq() { return this; }, select() { return this; },
    async single() { return { data: written }; }, async maybeSingle() { return { data: null }; },
  }; } };
  const created = await invoke('post', '/', { paciente_id: 'patient-a', importe: '50.05', metodo_pago: 'tarjeta', fecha: '2028-02-29' }, db);
  assert.equal(created.statusCode, 201);
  assert.equal(written.importe, 50.05);
  assert.equal((await invoke('patch', '/:id', { importe: '50.05' }, db)).statusCode, 404);
});

test('resumen y gestoría suman importes en céntimos sin residuos decimales', async () => {
  const db = { from() { return {
    select() { return this; }, gte() { return this; }, lt() { return this; }, order() { return this; }, limit() { return this; },
    then(resolve) { return Promise.resolve({ data: [0.1, 0.2].map(importe => ({ paciente_id: 'patient-a', fecha: '2026-10-07', importe, metodo_pago: 'efectivo' })) }).then(resolve); },
  }; } };
  const summary = await invoke('get', '/resumen', {}, db, { anio: '2026' });
  assert.equal(summary.body.total_anual, 0.3);
  assert.equal(summary.body.resumen[9].efectivo, 0.3);
  const accounting = await invoke('get', '/gestoria', {}, db, { anio: '2026' });
  assert.equal(accounting.body.gran_total.total, 0.3);
  assert.equal(accounting.body.pacientes[0].total_anual, 0.3);
});
