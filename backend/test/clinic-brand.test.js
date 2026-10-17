import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import PDFDocument from 'pdfkit';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';

const { getClinicDisplayName, clearClinicBrandCache } = await import('../src/lib/clinic-brand.js');
const { buildExerciseReportPdfBuffer } = await import('../src/lib/exercise-report-pdf.js');

const originalFetch = globalThis.fetch;

function mockClinics(t, respond) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const href = String(url);
    if (!href.includes('/rest/v1/crm_clinicas')) return originalFetch(url, init);
    calls.push(href);
    const { status = 200, body } = respond(href);
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  });
  return calls;
}

test.beforeEach(() => {
  clearClinicBrandCache();
  delete process.env.CLINIC_DISPLAY_NAME;
});

test('lee el nombre de la clínica indicada y lo guarda en caché', async (t) => {
  const calls = mockClinics(t, () => ({ body: [{ id: 'c1', nombre: 'Clínica Ficticia Norte' }] }));
  assert.equal(await getClinicDisplayName('c1'), 'Clínica Ficticia Norte');
  assert.equal(await getClinicDisplayName('c1'), 'Clínica Ficticia Norte');
  assert.equal(calls.length, 1, 'la segunda lectura sale de la caché');
  assert.match(calls[0], /id=eq\.c1/);
  assert.match(calls[0], /activo=eq\.true/);
});

test('sin clínica concreta usa la única activa y, si hay varias, el respaldo', async (t) => {
  let rows = [{ id: 'c1', nombre: 'Única Activa' }];
  mockClinics(t, () => ({ body: rows }));
  assert.equal(await getClinicDisplayName(), 'Única Activa');
  clearClinicBrandCache();
  rows = [{ id: 'c1', nombre: 'Una' }, { id: 'c2', nombre: 'Otra' }];
  process.env.CLINIC_DISPLAY_NAME = 'Respaldo Configurado';
  assert.equal(await getClinicDisplayName(), 'Respaldo Configurado');
});

test('si la lectura falla devuelve CLINIC_DISPLAY_NAME o un nombre genérico', async (t) => {
  t.mock.method(console, 'warn', () => {});
  mockClinics(t, () => ({ status: 500, body: { message: 'caída' } }));
  process.env.CLINIC_DISPLAY_NAME = 'Respaldo Configurado';
  assert.equal(await getClinicDisplayName('c1'), 'Respaldo Configurado');
  clearClinicBrandCache();
  delete process.env.CLINIC_DISPLAY_NAME;
  assert.equal(await getClinicDisplayName('c1'), 'Clínica de fisioterapia');
});

test('el PDF usa el nombre de la clínica del informe en cabecera y autor', async (t) => {
  const written = [];
  const originalText = PDFDocument.prototype.text;
  t.mock.method(PDFDocument.prototype, 'text', function (text, ...rest) {
    written.push(String(text));
    return originalText.call(this, text, ...rest);
  });
  const buffer = await buildExerciseReportPdfBuffer({
    clinic_name: 'Clínica Ficticia Norte', patient_name: 'Paciente ficticio',
    exercises: [{ nombre: 'Puente de glúteo', series: 3, repeticiones: 10 }],
  });
  const text = written.join('\n');
  assert.ok(text.includes('Clínica Ficticia Norte'));
  assert.ok(!text.includes('Carla'));
  assert.ok(buffer.length > 1000);
});

test('los textos del asistente no llevan la marca fija de una clínica', () => {
  for (const file of ['../src/lib/booking-ai.js', '../src/routes/telegram.js', '../src/lib/exercise-report-pdf.js']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.ok(!/Carla JL|Terrassa|de Carla|ser Carla|con Carla/.test(source), file);
  }
});
