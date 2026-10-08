import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { allowedBrowserOrigins, paidApiLimiter, PAID_API_PATHS } from '../src/lib/http-security.js';

test('producción solo admite los dominios HTTPS explícitos; no añade localhost ni staging', () => {
  assert.deepEqual(allowedBrowserOrigins({ NODE_ENV: 'production', FRONTEND_URL: 'https://clinic.example' }), ['https://clinic.example']);
  for (const url of ['http://clinic.example', 'https://clinic.example/path', 'https://user:pass@clinic.example', 'https://clinic.example?x=1']) assert.throws(() => allowedBrowserOrigins({ NODE_ENV: 'production', FRONTEND_URL: url }));
  assert.throws(() => allowedBrowserOrigins({ NODE_ENV: 'production' }));
  assert.ok(allowedBrowserOrigins({ NODE_ENV: 'development' }).includes('http://localhost:4321'));
});

test('los alias IA, copiloto y audio comparten límite por profesional del servidor', async () => {
  const app = express();
  app.use((req, _res, next) => { req.auth = { profile_id: 'server-profile' }; next(); });
  app.use(PAID_API_PATHS, paidApiLimiter({ AI_GENERATION_RATE_LIMIT: '2' }));
  app.use((_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    for (const [i, path] of ['/api/ejercicios/recommend', '/api/agente/message', '/api/notas-clinicas/voice/transcribe', '/api/exercises/recommend/async'].entries()) {
      const response = await fetch(url + path, { method: 'POST', headers: { 'x-forwarded-for': `10.1.0.${i + 1}` } });
      assert.equal(response.status, i < 2 ? 200 : 429);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  assert.throws(() => paidApiLimiter({ AI_GENERATION_RATE_LIMIT: '0' }));
});
