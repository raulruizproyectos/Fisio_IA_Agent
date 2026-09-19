import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeClinicalNote, generateLongitudinalSummary } from '../src/lib/clinical-voice.js';

test('synthesizeClinicalNote: extrae EVA y zona sin inventar datos en modo determinista', async () => {
  const text = 'Paciente acude con dolor lumbar irradiado hacia pierna derecha. Refiere EVA 6/10 tras esfuerzo en trabajo. Se realiza terapia manual descontracturante y movilizaciones lumbopélvicas. Al finalizar refiere mejoría con dolor 4/10. Pautamos puentes glúteos.';

  const result = await synthesizeClinicalNote({
    text,
    patientName: 'Juan Pérez',
    previousNotes: [{ dolor_eva: 7, session_datetime: '2026-09-10T10:00:00Z' }],
  });

  assert.ok(result.clinical_summary.length > 10, 'Debe generar un resumen clínico');
  assert.equal(result.dolor_eva, 6, 'Debe extraer correctamente el dolor EVA 6');
  assert.equal(result.zona_corporal, 'lumbar', 'Debe identificar zona lumbar');
  assert.equal(result.dolor_eva_anterior, 7, 'Debe tomar el dolor anterior de previousNotes');
  assert.equal(result.evolucion, 'favorable', 'Debe detectar mejoría de 6 a 4 o por texto');
});

test('synthesizeClinicalNote: no inventa números cuando no se menciona EVA', async () => {
  const text = 'Sesión de mantenimiento de rodilla. Buena movilidad sin bloqueos articulares. Continuar con plan de fortalecimiento.';

  const result = await synthesizeClinicalNote({
    text,
    patientName: 'María García',
  });

  assert.equal(result.dolor_eva, null, 'No debe inventar dolor EVA si no se menciona');
  assert.equal(result.zona_corporal, 'rodilla', 'Debe identificar zona rodilla');
  assert.equal(result.dolor_eva_anterior, null, 'Sin nota previa, EVA anterior debe ser null');
});

test('generateLongitudinalSummary: compila memoria clínica de capa 2 sin alucinaciones', async () => {
  const notes = [
    { session_datetime: '2026-09-01T10:00:00Z', dolor_eva: 8, zona_corporal: 'cervical', nota: 'Primera valoración cervicalgia aguda tras latigazo.' },
    { session_datetime: '2026-09-08T10:00:00Z', dolor_eva: 5, zona_corporal: 'cervical', nota: 'Terapia manual y calor local. Menor contractura de trapecios.' },
    { session_datetime: '2026-09-15T10:00:00Z', dolor_eva: 2, zona_corporal: 'cervical', nota: 'Rango articular recuperado en rotaciones. Ejercicios isométricos.' },
  ];

  const summary = await generateLongitudinalSummary({
    patientName: 'Carlos Ruiz',
    notes,
  });

  assert.ok(summary.includes('Carlos Ruiz'), 'El resumen debe incluir el nombre del paciente');
  assert.ok(summary.includes('3 sesiones') || summary.includes('3 sesión'), 'Debe reflejar el número de sesiones');
  assert.ok(summary.includes('EVA'), 'Debe mencionar la evolución del dolor');
});
