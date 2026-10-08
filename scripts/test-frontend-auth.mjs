// Executes the real frontend module with HTTP doubles; no Supabase SDK or persisted session.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const ts = createRequire(new URL('../frontend/package.json', import.meta.url))('typescript');
const source = await readFile(new URL('../frontend/src/lib/auth.ts', import.meta.url), 'utf8');
assert.doesNotMatch(source, /createClient|persistSession|authClient|access_token|refresh_token/);
for (const [dev, demo] of [[false, true], [true, false], [true, true]]) {
  const redirects = [], calls = [], removed = [];
  let authenticated = false, unavailable = false, failSafeReads = 0, writeFailure = false, logoutFailure = false;
  globalThis.window = {
    location: { hostname: 'localhost', origin: 'http://localhost:4321', search: demo ? '?demo=true' : '', replace: url => redirects.push(url) },
    localStorage: { getItem: () => demo ? 'true' : null, removeItem: key => removed.push(key) },
    __FISIO_RUNTIME_CONFIG__: { PUBLIC_SUPABASE_URL: 'https://test.supabase.co', PUBLIC_BACKEND_URL: 'http://localhost:3001' },
    async fetch(input, init = {}) {
      const url = new URL(input instanceof Request ? input.url : input), method = init.method || (input instanceof Request ? input.method : 'GET');
      calls.push({ url: url.href, method, init });
      if (url.pathname === '/api/auth/session') {
        if (unavailable) return Response.json({ error: 'Local injected failure' }, { status: 503 });
        if (!authenticated) return Response.json({ error: 'Auth required' }, { status: 401 });
        return Response.json({ profile_id: 'profile-a', clinic_id: 'clinic-a', clinic_name: 'Clinica A', role: 'admin' });
      }
      if (url.pathname === '/api/auth/logout') return Response.json(logoutFailure ? { error: 'Local logout failure' } : { ok: true }, { status: logoutFailure ? 503 : 200 });
      if (method === 'GET' && failSafeReads > 0) { failSafeReads--; return Response.json({ code: 'AUTH_SESSION_REQUIRED' }, { status: 401 }); }
      if (method === 'POST' && writeFailure) return Response.json({ code: 'AUTH_SESSION_REQUIRED' }, { status: 401 });
      return Response.json({ ok: true });
    },
  };
  const code = ts.transpileModule(source.replaceAll('import.meta.env', JSON.stringify({ DEV: dev })), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const auth = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64') + '#' + dev + demo);
  assert.deepEqual(removed, ['sb-test-auth-token', 'sb-test-auth-token-user', 'sb-test-auth-token-code-verifier']);
  if (dev && demo) {
    assert.equal((await auth.initializeProtectedApp()).role, 'fisioterapeuta'); assert.equal(calls.length, 0);
    await window.fetch('http://localhost:3001/api/pacientes');
    assert.equal(calls[0].init.headers.get('Authorization'), 'Bearer dev-token');
    assert.equal(calls[0].init.credentials, 'omit');
    continue;
  }
  await assert.rejects(auth.initializeProtectedApp(), /Autenticacion requerida/);
  assert.deepEqual(redirects, ['/login']); assert.equal(calls.length, 1);
  authenticated = true;
  const context = await auth.initializeProtectedApp();
  assert.equal(context.clinicId, 'clinic-a'); assert.equal(context.clinicName, 'Clinica A'); assert.ok(!('session' in context));
  assert.equal(calls[1].init.credentials, 'include'); assert.equal(calls[1].init.headers['X-Fisio-CSRF'], '1');
  await window.fetch(new Request('http://localhost:3001/api/pacientes', { headers: { 'x-existing': 'preserved' } }));
  assert.equal(calls.at(-1).init.headers.get('authorization'), null); assert.equal(calls.at(-1).init.headers.get('x-existing'), 'preserved');
  assert.equal(calls.at(-1).init.credentials, 'include');
  assert.equal(calls.at(-1).init.headers.get('X-Fisio-CSRF'), '1');
  await window.fetch('https://other.invalid/api/pacientes'); assert.equal(calls.at(-1).init.credentials, undefined);
  failSafeReads = 2;
  const previousChecks = calls.filter(call => call.url.endsWith('/auth/session')).length;
  await Promise.all([window.fetch('http://localhost:3001/api/pacientes'), window.fetch('http://localhost:3001/api/pacientes')]);
  assert.equal(calls.filter(call => call.url.endsWith('/auth/session')).length, previousChecks + 1, 'Concurrent reads share refresh');
  let previousWrites = calls.filter(call => call.url.endsWith('/api/pacientes') && call.method === 'POST').length;
  writeFailure = true;
  assert.equal((await window.fetch('http://localhost:3001/api/pacientes', { method: 'POST', body: '{}' })).status, 401);
  assert.equal(calls.filter(call => call.url.endsWith('/api/pacientes') && call.method === 'POST').length, previousWrites + 1, 'A rejected mutation is never replayed');
  assert.equal(calls.at(-1).init.headers.get('X-Fisio-CSRF'), '1');
  previousWrites++;
  unavailable = true;
  assert.equal((await window.fetch('http://localhost:3001/api/pacientes', { method: 'POST', body: '{}' })).status, 503);
  assert.equal(calls.filter(call => call.url.endsWith('/api/pacientes') && call.method === 'POST').length, previousWrites, 'No write starts while Auth cannot be checked');
  unavailable = false;
  logoutFailure = true;
  const beforeLogoutRedirects = redirects.length;
  await assert.rejects(auth.signOut(), /Local logout failure/); assert.equal(redirects.length, beforeLogoutRedirects);
  logoutFailure = false; await auth.signOut(); assert.equal(redirects.at(-1), '/login');
}
delete globalThis.window;
console.log('PASS: cookie credentials, CSRF, server clinic, legacy token removal, concurrent refresh, no mutation replay, logout failure and development isolation.');
