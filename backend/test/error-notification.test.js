import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import {publicHttpErrorMessage} from '../src/lib/public-error.js';

const source = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
const errorHandler = source.slice(source.indexOf('// Error handler'), source.indexOf('// Start'));
function invoke(error) {
  let handler;
  const notifications = [];
  const res = {status(code) {this.statusCode = code; return this;}, json(body) {this.body = body; return this;}};
  runInNewContext(errorHandler, {
    app: {use(callback) {handler = callback;}}, ERROR_WEBHOOK_URL: 'https://notifier.example.invalid',
    process: {env: {N8N_WEBHOOK_SECRET: 'fixture-secret'}}, console: {error() {}}, publicHttpErrorMessage,
    fetch(_url, options) {notifications.push(JSON.parse(options.body)); return Promise.resolve();},
  });
  handler(error, {path: '/api/auth/session', originalUrl: '/api/auth/session?fixture=private', method: 'POST', id: 'fixture'}, res);
  return {res, notifications};
}

test('rechazos esperados 4xx conservan la respuesta sin enviar una alerta crítica', () => {
  for (const status of [400, 401, 403, 404, 409, 429]) {
    const {res, notifications} = invoke({status, message: 'Rechazo ficticio'});
    assert.equal(res.statusCode, status);
    assert.equal(res.body.request_id, 'fixture');
    assert.equal(notifications.length, 0, `HTTP ${status} must not notify a critical outage`);
  }
  const overlap = invoke({code: '23P01'});
  assert.equal(overlap.res.statusCode, 409);
  assert.equal(overlap.notifications.length, 0);
});

test('fallos del servidor conservan una única alerta y ocultan diagnósticos de autenticación', () => {
  for (const status of [500, 503, undefined]) {
    const {res, notifications} = invoke({status, message: 'Private fixture diagnostic'});
    assert.equal(res.statusCode, status || 500);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].severity, 'CRITICAL');
    assert.equal(notifications[0].route, '/api/auth/session');
    assert.equal(notifications[0].message, 'Error en solicitud de autenticación');
  }
});
