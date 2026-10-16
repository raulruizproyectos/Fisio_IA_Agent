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
    select() { return this; }, gte() { return this; }, lt() { return this; }, order() { return this; }, limit() { return this; }, range() { return this; }, abortSignal() { return this; },
    then(resolve) { return Promise.resolve({ count: 2, data: [0.1, 0.2].map((importe, id) => ({ id, paciente_id: 'patient-a', fecha: '2026-10-07', importe, metodo_pago: 'efectivo' })) }).then(resolve); },
  }; } };
  const summary = await invoke('get', '/resumen', {}, db, { anio: '2026' });
  assert.equal(summary.body.total_anual, 0.3);
  assert.equal(summary.body.resumen[9].efectivo, 0.3);
  const accounting = await invoke('get', '/gestoria', {}, db, { anio: '2026' });
  assert.equal(accounting.body.gran_total.total, 0.3);
  assert.equal(accounting.body.pacientes[0].total_anual, 0.3);
});

test('resumen y gestoría leen todas las páginas aunque el servidor aplique un límite menor', async () => {
  const rows = Array.from({ length: 6000 }, (_, id) => ({ id, paciente_id: 'patient-a', fecha: '2026-01-01', importe: 0.01, metodo_pago: 'efectivo' }));
  const db = { from() { let start = 0, end = 4999; return {
    select() { return this; }, gte() { return this; }, lt() { return this; }, order() { return this; }, limit(n) { end = n - 1; return this; },
    range(from, to) { start = from; end = to; return this; }, abortSignal() { return this; },
    then(resolve) { resolve({ count: rows.length, data: rows.slice(start, Math.min(end + 1, start + 173)) }); },
  }; } };
  for (const path of ['/resumen', '/gestoria']) {
    const result = await invoke('get', path, {}, db, { anio: '2026' });
    assert.equal(result.body.total_anual ?? result.body.gran_total.total, 60);
    assert.equal(result.body.total_sesiones ?? result.body.gran_total.sesiones, 6000);
  }
});

test('lecturas financieras incompletas o cambiantes nunca devuelven un total parcial', async () => {
  for (const kind of ['failed-page', 'empty-page', 'changed-count', 'duplicate-page']) {
    let calls = 0;
    const db = { from() { calls++; return {
      select() { return this; }, gte() { return this; }, lt() { return this; }, order() { return this; }, range() { return this; }, abortSignal() { return this; },
      then(resolve) { resolve(calls > 1 && kind === 'failed-page' ? { error: { code: 'XX000' } } : {
        count: calls > 1 && kind === 'changed-count' ? 3 : 2,
        data: calls > 1 && kind === 'empty-page' ? [] : [{ id: 'one', fecha: '2026-01-01', importe: 1, metodo_pago: 'efectivo' }],
      }); },
    }; } };
    const res = await invoke('get', '/resumen', {}, db, { anio: '2026' });
    assert.ok(res.statusCode >= 500, kind);
    assert.equal(res.body.total_anual, undefined);
    assert.equal(calls, 2);
  }
});
