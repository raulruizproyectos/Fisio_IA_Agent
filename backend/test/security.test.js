import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.INTERNAL_API_KEY = 'internal-secret';
process.env.TELEGRAM_WEBHOOK_SECRET = 'telegram-secret';

const { authorizeRequest, requestIdentity, secureEqual } = await import('../src/middleware/security.js');

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
