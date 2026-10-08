import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { publicErrorMessage, publicHttpErrorMessage } from '../src/lib/public-error.js';
process.env.NODE_ENV = 'production';
process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-server-key';
const [{ default: payments }, { default: exercises }, { runWithRequestContext }, { respondFinanceError }, { respondReportError, reportError }, { buildReadinessReport }] = await Promise.all([
  import('../src/routes/payments.js'), import('../src/routes/exercises.js'), import('../src/lib/supabase.js'),
  import('../src/lib/finance.js'), import('../src/lib/approved-exercise-report.js'), import('../src/lib/readiness.js'),
]);
const diagnostic = 'PRIVATE_FIXTURE_TRACE: SQL value, credential and provider stack';
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const noDiagnostic = value => assert.ok(!JSON.stringify(value).includes('PRIVATE_FIXTURE_TRACE'), 'Internal diagnostic must never enter the public response');
const dbResult = result => ({ from(table) { const selected = typeof result === 'function' ? result(table) : result; return {
  select() { return this; }, eq() { return this; }, gte() { return this; }, lt() { return this; }, order() { return this; },
  limit() { return this; }, maybeSingle: async () => selected, then(resolve) { return Promise.resolve(selected).then(resolve); },
}; } });
async function invoke(router, method, path, db, req = {}, auth = { profile_id: 'fixture-profile', clinic_id: 'fixture-clinic' }) {
  const handler = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
  const res = response();
  await runWithRequestContext({ supabase: db, auth }, () => handler({ query: {}, body: {}, params: {}, ...req }, res, error => { throw error; }));
  return res;
}

test('producción oculta errores SQL de resumen y gestoría sin convertir fallo en datos vacíos', async () => {
  for (const path of ['/resumen', '/gestoria']) {
    const res = await invoke(payments, 'get', path, dbResult({ error: { code: 'XX000', message: diagnostic } }));
    assert.equal(res.statusCode, 500); noDiagnostic(res.body); assert.ok(res.body.error); assert.equal(res.body.data, undefined);
  }
});

test('finanzas e informes ocultan errores SQL técnicos de 4xx y conservan reglas de negocio', () => {
  for (const code of ['42501', '23514']) {
    const finance = response(); respondFinanceError(finance, { code, message: diagnostic }); noDiagnostic(finance.body);
  }
  const denied = response(); respondReportError(denied, { code: '42501', message: diagnostic }, 'No se pudo procesar el informe');
  assert.equal(denied.statusCode, 403); noDiagnostic(denied.body);
  const clinical = response(); respondReportError(clinical, reportError(409, 'Revisa y aprueba el plan', 'professional_approval_required'), 'Fallo');
  assert.equal(clinical.statusCode, 409); assert.equal(clinical.body.error, 'Revisa y aprueba el plan');
  const conflict = response(); respondFinanceError(conflict, { code: 'PT409', message: 'El bono está agotado' });
  assert.equal(conflict.statusCode, 409); assert.equal(conflict.body.error, 'El bono está agotado');
});

test('poll de ejercicios oculta diagnósticos persistidos de trabajos antiguos', async () => {
  const db = dbResult({ data: { id: 'fixture-job', status: 'error', error_message: diagnostic, error_code: 'async_timeout', fisioterapeuta_id: 'fixture-profile' } });
  const res = await invoke(exercises, 'get', '/recommend/jobs/:jobId', db, { params: { jobId: 'fixture-job' } });
  assert.equal(res.statusCode, 200); assert.equal(res.body.status, 'error'); assert.equal(res.body.code, 'async_timeout'); noDiagnostic(res.body);
});

test('readiness conserva fallo y clasificación sin devolver diagnóstico SQL', async () => {
  for (const rpc of [async () => { throw new Error(diagnostic); }, async () => ({ error: { code: '42501' } })]) {
    const report = await buildReadinessReport({ supabase: { ...dbResult({ error: { code: 'XX000', message: diagnostic } }), rpc }, env: { SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture-server-key' } });
    assert.equal(report.status, 'error'); noDiagnostic(report);
  }
});

test('manejador global oculta diagnósticos incluso en 4xx y conserva conflictos y request_id', () => {
  const code = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  let handler;
  const context = vm.createContext({ app: { use(fn) { handler = fn; } }, ERROR_WEBHOOK_URL: null,
    console: { error() {} }, process, publicHttpErrorMessage });
  vm.runInContext(code.slice(code.indexOf('// Error handler'), code.indexOf('// Start')), context);
  for (const status of [400, 403, 500]) {
    const res = response(); handler({ status, message: diagnostic, stack: diagnostic }, { id: 'fixture-request', path: '/fixture', originalUrl: '/fixture', method: 'POST' }, res);
    assert.equal(res.statusCode, status); assert.equal(res.body.request_id, 'fixture-request'); noDiagnostic(res.body);
  }
  const overlap = response(); handler({ code: '23P01', message: diagnostic }, { id: 'fixture-request' }, overlap);
  assert.equal(overlap.statusCode, 409); assert.equal(overlap.body.code, 'appointment_overlap'); noDiagnostic(overlap.body);
  const business = response(); handler({ status: 409, code: 'PT409', message: 'El guardado ya existe' }, { id: 'fixture-request', path: '/fixture', originalUrl: '/fixture' }, business);
  assert.equal(business.body.error, 'El guardado ya existe');
});

test('Calendar publica aviso seguro sin limpiar bloqueo ni diagnóstico interno', () => {
  const code = readFileSync(new URL('../src/routes/professional.js', import.meta.url), 'utf8');
  const context = vm.createContext({ publicErrorMessage, calendarBackgroundSyncState: {},
    calendarIntegrationEnabled: () => true, calendarDirectEnabled: () => true,
    GOOGLE_CALENDAR_ID: 'fixture-calendar', GOOGLE_CALENDAR_READ_IDS: ['fixture-calendar'], GOOGLE_CALENDAR_REQUIRED: true,
    CALENDAR_BACKGROUND_SYNC_STALE_MS: 60000, CALENDAR_BACKGROUND_SYNC_INTERVAL_MS: 30000 });
  vm.runInContext(code.slice(code.indexOf('function buildCalendarBackgroundSyncStatus()'), code.indexOf('function getGoogleCalendarClient()')), context);
  context.diagnostic = diagnostic;
  vm.runInContext('markCalendarBackgroundSyncError({error: new Error(diagnostic)});', context);
  const status = vm.runInContext('buildCalendarBackgroundSyncStatus()', context);
  assert.equal(status.status, 'error'); noDiagnostic(status); assert.equal(context.calendarBackgroundSyncState.error, diagnostic);
  const result = vm.runInContext('buildCalendarSyncResult({status:"error",action:"update",event_id:"fixture-event",error:diagnostic})', context);
  assert.equal(result.status, 'error'); assert.equal(result.event_id, 'fixture-event'); noDiagnostic(result); assert.match(result.error, /No repitas/);
});

test('diagnóstico del motor no llega a los intentos públicos ni al motivo de fallback', async () => {
  const code = readFileSync(new URL('../src/routes/exercises.js', import.meta.url), 'utf8');
  const context = vm.createContext({ publicErrorMessage, process, AbortSignal, setTimeout,
    EXERCISE_ENGINE_TIMEOUT_MS: 1000, EXERCISE_ENGINE_MAX_ATTEMPTS: 1,
    fetch: async () => Response.json({ error: diagnostic }, { status: 503 }) });
  vm.runInContext(code.slice(code.indexOf('function safeJsonParse('), code.indexOf('export function getRecommendationExercises(')), context);
  const result = await vm.runInContext('callEngineWithRetry({targetUrl:"https://fixture.invalid",payload:{}})', context);
  assert.equal(result.ok, false); assert.equal(result.attempts.length, 1); noDiagnostic(result.attempts);
  assert.equal(publicErrorMessage(result.error, 'engine_unreachable'), 'engine_unreachable');
});

test('poll distingue lectura fallida de trabajo inexistente y no filtra SQL', async () => {
  const failed = await invoke(exercises, 'get', '/recommend/jobs/:jobId', dbResult({ error: { code: 'XX000', message: diagnostic } }), { params: { jobId: 'cold-failed-job' } });
  assert.equal(failed.statusCode, 500); noDiagnostic(failed.body);
  const missing = await invoke(exercises, 'get', '/recommend/jobs/:jobId', dbResult({ data: null }), { params: { jobId: 'cold-missing-job' } });
  assert.equal(missing.statusCode, 404);
});

test('el diagnóstico local sigue disponible en desarrollo y un error 5xx no se expone en producción', () => {
  assert.equal(publicHttpErrorMessage(reportError(503, diagnostic), 503, 'Aviso seguro'), 'Aviso seguro');
  try {
    process.env.NODE_ENV = 'development';
    assert.equal(publicErrorMessage(new Error(diagnostic), 'Aviso seguro'), diagnostic);
  } finally { process.env.NODE_ENV = 'production'; }
});

test('un trabajo en caché no entrega el informe si el paciente dejó de estar autorizado', async () => {
  const job = { id: 'cached-job', status: 'done', paciente_id: 'fixture-patient', fisioterapeuta_id: 'fixture-profile', result_payload: { ok: true, informe_clinico: 'Private fixture report' } };
  const authorized = dbResult(table => ({ data: table === 'crm_async_jobs' ? job : { id: 'fixture-patient' } }));
  const req = { params: { jobId: 'cached-job' } };
  assert.equal((await invoke(exercises, 'get', '/recommend/jobs/:jobId', authorized, req)).body.result.informe_clinico, 'Private fixture report');
  const denied = dbResult({ data: null });
  for (const auth of [{ profile_id: 'other-profile', clinic_id: 'other-clinic' }, { profile_id: 'fixture-profile', clinic_id: 'changed-clinic' }]) {
    const res = await invoke(exercises, 'get', '/recommend/jobs/:jobId', denied, req, auth);
    assert.equal(res.statusCode, 404); assert.equal(JSON.stringify(res.body).includes('Private fixture report'), false);
  }
  const failedRead = await invoke(exercises, 'get', '/recommend/jobs/:jobId', dbResult({ error: { code: 'XX000', message: diagnostic } }), req);
  assert.equal(failedRead.statusCode, 500); noDiagnostic(failedRead.body); assert.equal(failedRead.body.result, undefined);
});
