import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';

const { extractRedFlags } = await import('../src/routes/exercises.js');

test('las alertas clínicas se detectan con tildes y mayúsculas', () => {
  assert.deepEqual(extractRedFlags('Pérdida de fuerza en la pierna y parálisis facial'), ['neurologico']);
  assert.deepEqual(extractRedFlags('Sufrió una CAÍDA ayer'), ['trauma_reciente']);
  assert.deepEqual(extractRedFlags('Incontinencia urinaria desde el lunes'), ['neurologico']);
  assert.deepEqual(extractRedFlags('Dolor de pecho al subir escaleras'), ['urgencia_respiratoria']);
  assert.deepEqual(extractRedFlags('Tiene fiebre y 39,5 grados'), ['fiebre']);
  assert.deepEqual(extractRedFlags('Pérdida de peso inexplicada'), ['perdida_peso_inexplicada']);
});

test('edades, duraciones y palabras parecidas no generan alertas falsas', () => {
  assert.deepEqual(extractRedFlags('Paciente de 40 años con lumbalgia de 39 días'), []);
  assert.deepEqual(extractRedFlags('Recaída leve de su tendinopatía'), []);
  assert.deepEqual(extractRedFlags('Dolor cervical mecánico sin irradiación'), []);
});
