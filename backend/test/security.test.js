import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.INTERNAL_API_KEY = 'internal-secret';
process.env.TELEGRAM_WEBHOOK_SECRET = 'telegram-secret';

const { authorizeRequest, requestIdentity, secureEqual } = await import('../src/middleware/security.js');
const { serviceSupabase, getRequestContext, runWithRequestContext } = await import('../src/lib/supabase.js');

function request({ method = 'GET', path = '/', headers = {} } = {}) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
  return {
    method,
    path,
    get(name) { return normalized[String(name).toLowerCase()]; },
  };
}

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

test('secureEqual compara secretos sin aceptar valores vacios', () => {
  assert.equal(secureEqual('abc', 'abc'), true);
  assert.equal(secureEqual('abc', 'abd'), false);
  assert.equal(secureEqual('', ''), false);
});

test('health permanece publico', async () => {
  let nextCalled = false;
  await authorizeRequest(request({ path: '/api/health' }), response(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('recuperación pública solo habilita su POST exacto y ambos alias',async()=>{
  for(const prefix of ['professional','profesional']) {
    let called=false;
    await authorizeRequest(request({method:'POST',path:`/api/${prefix}/public-booking/recovery`}),response(),()=>{
      called=true;assert.equal(getRequestContext().supabase,serviceSupabase);
      assert.equal(getRequestContext().auth.actor_type,'public_booking');
    });
    assert.equal(called,true);
  }
  const res=response();
  await authorizeRequest(request({method:'GET',path:'/api/profesional/public-booking/recovery'}),res,()=>assert.fail('GET is not public'));
  assert.equal(res.statusCode,401);
});

test('cron rechaza una clave interna incorrecta', async () => {
  const res = response();
  await authorizeRequest(
    request({ method: 'POST', path: '/api/cron/recordatorios/24h', headers: { 'x-internal-api-key': 'wrong' } }),
    res,
    () => assert.fail('No debe continuar')
  );
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'Proceso interno no autorizado');
});

test('webhook Telegram rechaza un secreto incorrecto', async () => {
  const res = response();
  await authorizeRequest(
    request({ method: 'POST', path: '/api/telegram/incoming', headers: { 'x-telegram-bot-api-secret-token': 'wrong' } }),
    res,
    () => assert.fail('No debe continuar')
  );
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'Webhook no autorizado');
});

test('una clave interna valida habilita el contexto privilegiado', async () => {
  let nextCalled = false;
  await authorizeRequest(
    request({ method: 'POST', path: '/api/exercises/recommend', headers: { 'x-internal-api-key': 'internal-secret' } }),
    response(),
    () => { nextCalled = true; }
  );
  assert.equal(nextCalled, true);
});

test('requestIdentity conserva trazabilidad y limita el identificador', () => {
  const req = request({ headers: { 'x-request-id': 'a'.repeat(180) } });
  const res = response();
  requestIdentity(req, res, () => {});
  assert.equal(req.id.length, 128);
  assert.equal(res.headers['X-Request-Id'], req.id);
});

test('la sesion usa la clinica del perfil y no la enviada por el cliente', async (t) => {
  t.mock.method(serviceSupabase.auth, 'getUser', async () => ({ data: { user: { id: 'user-a' } } }));
  const profile = {
    id: 'profile-a', auth_user_id: 'user-a', rol: 'admin', activo: true,
    clinica_id: 'clinic-a', crm_clinicas: { id: 'clinic-a', nombre: 'Clinica A', activo: true },
  };
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify([profile]), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  }));
  const req = request({ path: '/api/pacientes', headers: { authorization: 'Bearer test-token' } });
  req.body = { clinica_id: 'clinic-b' };
  req.query = { clinica_id: 'clinic-b' };
  await authorizeRequest(req, response(), () => {
    assert.equal(req.auth.clinic_id, 'clinic-a');
    assert.equal(req.auth.clinic_name, 'Clinica A');
    assert.equal(getRequestContext().auth.clinic_id, 'clinic-a');
  });
});

test('perfiles sin clinica o con clinica inactiva no abren el CRM', async (t) => {
  t.mock.method(serviceSupabase.auth, 'getUser', async () => ({ data: { user: { id: 'user-a' } } }));
  for (const clinic of [null, { id: 'clinic-a', activo: false }]) {
    const profile = { id: 'profile-a', rol: 'admin', activo: true, clinica_id: clinic?.id, crm_clinicas: clinic };
    const mock = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify([profile]), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const res = response();
    await authorizeRequest(
      request({ path: '/api/pacientes', headers: { authorization: 'Bearer test-token' } }),
      res,
      () => assert.fail('No debe autorizar una sesion sin clinica activa')
    );
    assert.equal(res.statusCode, 403);
    mock.mock.restore();
  }
});

test('dev-token nunca habilita acceso privilegiado al CRM compartido', async (t) => {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  t.mock.method(serviceSupabase.auth, 'getUser', async () => ({ data: { user: null }, error: new Error('Invalid token') }));
  try {
    const res = response();
    await authorizeRequest(
      request({ path: '/api/pacientes', headers: { authorization: 'Bearer dev-token' } }),
      res,
      () => assert.fail('No debe usar service_role como profesional de desarrollo')
    );
    assert.equal(res.statusCode, 401);
  } finally {
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
  }
});

test('el alta de paciente impone la clinica de la sesion y descarta la del cuerpo', async (t) => {
  const { default: router } = await import('../src/routes/patients.js');
  const handler = router.stack.find((layer) => layer.route?.path === '/' && layer.route.methods.post).route.stack[0].handle;
  const writes = [];
  const db = {
    from(table) {
      return {
        insert(payload) { writes.push({ table, payload }); return this; },
        select() { return this; },
        async single() { return { data: { id: 'patient-a', ...writes[0].payload }, error: null }; },
        then(resolve) { return resolve({error:null}); },
        async upsert(payload) { writes.push({ table, payload }); return { error: null }; },
      };
    },
  };
  t.mock.method(serviceSupabase, 'from', () => ({
    insert() { return this; }, select() { return this; },
    async maybeSingle() { return { data: { id: 1 } }; },
  }));
  const req = request();
  req.auth = { profile_id: 'profile-a', clinic_id: 'clinic-a', role: 'fisioterapeuta' };
  req.body = { nombre_completo: 'Paciente de prueba', clinica_id: 'clinic-b', created_by_profile_id: 'profile-b' };
  const res = response();
  await runWithRequestContext({ supabase: db, auth: req.auth }, () => handler(req, res, (error) => { throw error; }));
  assert.equal(res.statusCode, 201);
  assert.equal(writes[0].payload.clinica_id, 'clinic-a');
  assert.equal(writes[0].payload.created_by_profile_id, 'profile-a');
  assert.equal(writes[1].payload.clinica_id, 'clinic-a');
});

test('la reserva publica exige un profesional y devuelve los datos de su clinica', async () => {
  const { default: router } = await import('../src/routes/professional.js');
  const handler = router.stack.find((layer) => layer.route?.path === '/public-booking/config').route.stack[0].handle;
  const req = request();
  req.query = {};
  const missing = response();
  await runWithRequestContext({ supabase: { from() { assert.fail('No debe elegir un profesional global'); } } },
    () => handler(req, missing, (error) => { throw error; }));
  assert.equal(missing.statusCode, 404);
  const filters = [];
  const db = {
    from() {
      return {
        select() { return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        async maybeSingle() {
          return { data: { id: 'profile-a', activo: true, clinica_id: 'clinic-a',
            crm_clinicas: { id: 'clinic-a', nombre: 'Clinica A', activo: true, telefono: '111' } } };
        },
      };
    },
  };
  req.query = { professional_id: 'profile-a', clinica_id: 'clinic-b' };
  const res = response();
  await runWithRequestContext({ supabase: db }, () => handler(req, res, (error) => { throw error; }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.clinic.name, 'Clinica A');
  assert.equal(res.body.data.professional.clinic_id, 'clinic-a');
  assert.deepEqual(filters, [['id', 'profile-a'], ['crm_clinicas.activo', true]]);
});
