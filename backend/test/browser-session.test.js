import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';

Object.assign(process.env, { NODE_ENV: 'development', FRONTEND_URL: 'http://localhost:4321',
  SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'fixture-anon', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service' });
const { default: authRouter } = await import('../src/routes/auth.js');
const { authorizeRequest } = await import('../src/middleware/security.js');
const { getRequestContext } = await import('../src/lib/supabase.js');
const profile = { id: 'server-profile', auth_user_id: 'server-user', rol: 'admin', activo: true,
  clinica_id: 'server-clinic', crm_clinicas: { id: 'server-clinic', activo: true, nombre: 'Clínica ficticia' } };
const session = { access_token: 'valid-access', refresh_token: 'valid-refresh', expires_in: 3600 };
let serverNumber = 0;

async function withServer(t, run) {
  const ip = `10.42.0.${++serverNumber}`;
  const state = { calls: [], profile, writes: 0, denied: false, fail: false, incomplete: false, delay: false };
  const nativeFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input);
    if (url.hostname === '127.0.0.1') return nativeFetch(input, options);
    assert.equal(url.origin, 'https://example.supabase.co', 'No external provider can be reached');
    const body = options.body ? JSON.parse(options.body) : null;
    const headers = new Headers(options.headers);
    state.calls.push({ path: url.pathname, query: url.search, body, headers });
    const json = (value, status = 200) => Response.json(value, { status });
    if (state.fail) return json({ message: 'private provider diagnostics' }, 503);
    if (url.pathname === '/auth/v1/user' && options.method === 'GET') {
      if (state.userIncomplete) return json({});
      if (headers.get('authorization') !== 'Bearer valid-access') return json({ message: 'expired', code: 'bad_jwt' }, 401);
      return json({ id: 'server-user', email: 'fixture@example.invalid' });
    }
    if (url.pathname === '/rest/v1/crm_perfiles') {
      assert.equal(headers.get('authorization'), 'Bearer valid-access');
      assert.equal(url.searchParams.get('auth_user_id'), 'eq.server-user');
      return json(state.denied ? [] : [state.profile]);
    }
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'password' && body.password === 'wrong') return json({ message: 'bad credentials' }, 400);
      if (url.searchParams.get('grant_type') === 'refresh_token') {
        if (body.refresh_token !== 'valid-refresh') return json({ message: 'bad refresh' }, 400);
        if (state.delay) await new Promise(resolve => setTimeout(resolve, 30));
      }
      if (url.searchParams.get('grant_type') === 'pkce') {
        const challenge = crypto.createHash('sha256').update(body.code_verifier).digest('base64url');
        if (challenge !== state.challenge || body.auth_code !== 'fixture-recovery-code') return json({ message: 'bad verifier' }, 400);
      }
      return json(state.incomplete ? { access_token: 'valid-access' } : session);
    }
    if (url.pathname === '/auth/v1/recover') { state.challenge = body.code_challenge; return json({}); }
    if (url.pathname === '/auth/v1/user' && options.method === 'PUT') {
      assert.equal(headers.get('authorization'), 'Bearer valid-access');
      if (body.password === 'provider-denied-fixture') return json({ message: 'private password policy details' }, 422);
      state.writes++; return json({ id: 'server-user' });
    }
    if (url.pathname === '/auth/v1/logout') {
      if (headers.get('authorization') !== 'Bearer valid-access') return json({ message: 'expired' }, 401);
      return new Response(null, { status: 204 });
    }
    assert.fail('Unknown provider route');
  });
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use(authorizeRequest);
  app.all('/api/protected', (req, res) => {
    assert.equal(getRequestContext().auth.clinic_id, 'server-clinic');
    if (req.method === 'POST') state.writes++;
    res.json(req.auth);
  });
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: 'Solicitud no válida' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const request = (path, { body = {}, headers = {}, method = 'POST', cookie } = {}) => nativeFetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method, headers: { origin: process.env.FRONTEND_URL, 'X-Fisio-CSRF': '1', 'Content-Type': 'application/json', 'x-forwarded-for': ip, ...(cookie ? { cookie } : {}), ...headers },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
  });
  try { await run(request, state); }
  finally { await new Promise(resolve => server.close(resolve)); t.mock.restoreAll(); }
}

const cookieHeader = response => response.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
const credentials = { email: 'fixture@example.invalid', password: 'local-fixture-only' };
const validCookie = 'fisio-access=valid-access; fisio-refresh=valid-refresh';

test('login publica cookies HttpOnly y devuelve solo el perfil autorizado por Auth/RLS', t => withServer(t, async (request, state) => {
  const response = await request('/api/auth/login', { body: credentials });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.user_id, 'server-user'); assert.equal(data.clinic_id, 'server-clinic');
  assert.ok(!('access_token' in data)); assert.ok(!('refresh_token' in data));
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  for (const cookie of response.headers.getSetCookie()) {
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.match(cookie, /Path=\//); assert.doesNotMatch(cookie, /Domain=/);
  }
  const loaded = await request('/api/protected', { method: 'GET', cookie: cookieHeader(response) });
  assert.equal(loaded.status, 200); assert.equal((await loaded.json()).profile_id, 'server-profile');
  assert.ok(state.calls.some(call => call.path === '/auth/v1/user'));
}));

test('cookie profesional exige origen exacto y cabecera CSRF para escribir; Bearer sigue validándose', t => withServer(t, async (request, state) => {
  for (const headers of [{ origin: '' }, { origin: 'https://evil.example' }, { 'X-Fisio-CSRF': '' }, { 'sec-fetch-site': 'cross-site' }]) {
    const response = await request('/api/protected', { cookie: validCookie, headers });
    assert.equal(response.status, 403);
    assert.equal((await request('/api/protected', { method: 'GET', cookie: validCookie, headers })).status, 403);
  }
  assert.equal(state.writes, 0); assert.equal(state.calls.length, 0);
  assert.equal((await request('/api/protected', { cookie: validCookie })).status, 200);
  assert.equal((await request('/api/protected', { method: 'GET', cookie: validCookie, headers: { origin: '', 'sec-fetch-site': 'same-origin' } })).status, 200);
  assert.equal((await request('/api/protected', { headers: { authorization: 'Bearer valid-access', origin: '', 'X-Fisio-CSRF': '' } })).status, 200);
  assert.equal(state.writes, 2);
}));

test('producción exige HTTPS y cookies __Host- Secure sin Domain', async t => {
  process.env.NODE_ENV = 'production'; process.env.FRONTEND_URL = 'https://clinic.example';
  try { await withServer(t, async (request, state) => {
    assert.equal((await request('/api/auth/login', { body: credentials })).status, 503);
    assert.equal(state.calls.length, 0);
    const response = await request('/api/auth/login', { body: credentials, headers: { 'x-forwarded-proto': 'https' } });
    assert.equal(response.status, 200);
    for (const cookie of response.headers.getSetCookie()) { assert.match(cookie, /^__Host-fisio-/); assert.match(cookie, /; Secure/); assert.match(cookie, /; HttpOnly/); assert.doesNotMatch(cookie, /Domain=/); }
  }); } finally { process.env.NODE_ENV = 'development'; process.env.FRONTEND_URL = 'http://localhost:4321'; }
});

test('inputs e identidad adulterados y cookies ambiguas se rechazan antes de escribir', t => withServer(t, async (request, state) => {
  for (const body of [null, [], { ...credentials, user_id: 'victim' }, { email: credentials.email, password: {} }, { ...credentials, email: 'invalid' }]) {
    assert.equal((await request('/api/auth/login', { body })).status, 400);
  }
  for (const cookie of ['fisio-access=valid-access; fisio-access=another', 'fisio-access=%ZZ', 'fisio-access=bad+token', 'fisio-access=' + 'x'.repeat(3501)]) {
    assert.equal((await request('/api/protected', { method: 'GET', cookie })).status, 401);
  }
  assert.equal(state.calls.length, 0); assert.equal(state.writes, 0);
}));

test('denegación de clínica, perfil desactivado o identidad distinta no publica sesión', t => withServer(t, async (request, state) => {
  for (const item of [{ ...profile, activo: false }, { ...profile, auth_user_id: 'victim' }, { ...profile, crm_clinicas: { ...profile.crm_clinicas, activo: false } }]) {
    state.profile = item;
    const response = await request('/api/auth/login', { body: credentials });
    assert.equal(response.status, 403);
    assert.ok(response.headers.getSetCookie().every(cookie => cookie.includes('Max-Age=0')));
  }
}));

test('renovaciones concurrentes comparten una solicitud; GET protegido no renueva ni escribe', t => withServer(t, async (request, state) => {
  const cookie = 'fisio-access=expired; fisio-refresh=valid-refresh';
  assert.equal((await request('/api/protected', { cookie, method: 'GET' })).status, 401);
  assert.equal(state.calls.filter(call => call.path === '/auth/v1/token').length, 0);
  state.delay = true;
  const responses = await Promise.all([request('/api/auth/session', { cookie }), request('/api/auth/session', { cookie })]);
  for (const response of responses) { assert.equal(response.status, 200); assert.match(cookieHeader(response), /fisio-access=valid-access/); }
  assert.equal(state.calls.filter(call => call.query.includes('refresh_token')).length, 1);
  assert.equal(state.writes, 0);
}));

test('fallo o respuesta incompleta de Auth conserva cookies y no repite una mutación incierta', t => withServer(t, async (request, state) => {
  state.fail = true;
  const response = await request('/api/auth/session', { cookie: 'fisio-refresh=valid-refresh' });
  assert.equal(response.status, 503); assert.equal(response.headers.getSetCookie().length, 0);
  assert.doesNotMatch(await response.text(), /private provider/);
  assert.equal(state.calls.length, 1);
  state.fail = false; state.incomplete = true;
  const incomplete = await request('/api/auth/login', { body: credentials });
  assert.equal(incomplete.status, 503); assert.equal(incomplete.headers.getSetCookie().length, 0);
  state.incomplete = false; state.userIncomplete = true;
  const incompleteUser = await request('/api/auth/session', { cookie: validCookie });
  assert.equal(incompleteUser.status, 503); assert.equal(incompleteUser.headers.getSetCookie().length, 0);
}));

test('recuperación PKCE vincula el código al navegador y no expone tokens ni acepta user_id', t => withServer(t, async (request, state) => {
  const reset = await request('/api/auth/reset-request', { body: { email: credentials.email } });
  assert.equal(reset.status, 200);
  const providerRequest = state.calls.find(call => call.path === '/auth/v1/recover');
  assert.equal(providerRequest.body.code_challenge_method, 's256');
  assert.equal(new URLSearchParams(providerRequest.query).get('redirect_to'), 'http://localhost:4321/reset-password');
  const cookie = cookieHeader(reset);
  const missing = await request('/api/auth/recovery', { body: { code: 'fixture-recovery-code' } });
  assert.equal(missing.status, 401);
  const recovered = await request('/api/auth/recovery', { body: { code: 'fixture-recovery-code' }, cookie });
  assert.equal(recovered.status, 200); assert.equal((await recovered.json()).user_id, 'server-user');
  assert.match(cookieHeader(recovered), /fisio-access=valid-access/);
  assert.equal((await request('/api/auth/password', { cookie: validCookie, body: { password: 'new-fixture-only', user_id: 'victim' } })).status, 400);
  for (const password of ['short', 'ñ'.repeat(37)]) assert.equal((await request('/api/auth/password', { cookie: validCookie, body: { password } })).status, 400);
  assert.equal((await request('/api/auth/password', { cookie: validCookie, body: { password: 'new-fixture-only' } })).status, 200);
  assert.equal(state.writes, 1);
  const denied = await request('/api/auth/password', { cookie: validCookie, body: { password: 'provider-denied-fixture' } });
  assert.equal(denied.status, 400); assert.equal(denied.headers.getSetCookie().length, 0);
  assert.doesNotMatch(await denied.text(), /private password/);
}));

test('logout revoca la sesión local y borra cookies; un fallo remoto conserva la sesión visible', t => withServer(t, async (request, state) => {
  state.fail = true;
  const failed = await request('/api/auth/logout', { cookie: validCookie });
  assert.equal(failed.status, 503); assert.equal(failed.headers.getSetCookie().length, 0);
  state.fail = false;
  const response = await request('/api/auth/logout', { cookie: 'fisio-access=expired; fisio-refresh=valid-refresh' });
  assert.equal(response.status, 200);
  assert.ok(response.headers.getSetCookie().every(cookie => cookie.includes('Max-Age=0')));
  assert.ok(state.calls.filter(call => call.path === '/auth/v1/logout').every(call => call.query === '?scope=local'));
  assert.equal((await request('/api/auth/logout', { cookie: 'fisio-refresh=valid-refresh' })).status, 200);
}));

test('login y recuperación tienen límites propios y desconocidos no abren una ruta pública', t => withServer(t, async (request, state) => {
  let blocked = false;
  for (let i = 0; i < 11; i++) {
    const response = await request('/api/auth/login', { body: { ...credentials, password: 'wrong' } });
    if (response.status === 429) { blocked = true; break; }
    assert.equal(response.status, 401);
  }
  assert.equal(blocked, true);
  blocked = false;
  for (let i = 0; i < 6; i++) {
    const response = await request('/api/auth/reset-request', { body: { email: credentials.email } });
    if (response.status === 429) { blocked = true; break; }
    assert.equal(response.status, 200);
  }
  assert.equal(blocked, true);
  const before = state.calls.length;
  assert.equal((await request('/api/auth/register')).status, 401);
  assert.equal((await request('/api/auth/unknown')).status, 401);
  assert.equal(state.calls.length, before);
}));
