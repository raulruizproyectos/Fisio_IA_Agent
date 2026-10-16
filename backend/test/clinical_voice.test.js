import test from 'node:test';
import assert from 'node:assert/strict';
delete process.env.OPENAI_API_KEY;
const { synthesizeClinicalNote, generateLongitudinalSummary, fallbackRuleBasedSynthesis } = await import('../src/lib/clinical-voice.js');

test('resumen desempata la misma hora por creación y conserva el último dolor',async()=>{
  const notes=[{id:'b',session_datetime:'2026-10-07T12:00:00Z',created_at:'2026-10-07T13:00:00Z',dolor_eva:4,nota:'Última'},
    {id:'a',session_datetime:'2026-10-07T12:00:00Z',created_at:'2026-10-07T12:30:00Z',dolor_eva:0,nota:'Primera'}];
  const summary=await generateLongitudinalSummary({patientName:'Fixture',notes,useAi:false});
  assert.match(summary,/EVA 0\/10 → 4\/10/);assert.match(summary,/Última sesión: Última/);
});

test('synthesizeClinicalNote: extrae EVA y zona sin inventar datos en modo determinista', async () => {
  const text = 'Paciente acude con dolor lumbar irradiado hacia pierna derecha. Refiere EVA 6/10 tras esfuerzo en trabajo. Se realiza terapia manual descontracturante y movilizaciones lumbopélvicas. Al finalizar refiere mejoría con dolor 4/10. Pautamos puentes glúteos.';

  const result = await synthesizeClinicalNote({
    text,
    patientName: 'Juan Pérez',
    previousNotes: [{ dolor_eva: 7, session_datetime: '2026-09-10T10:00:00Z' }],
  });

  assert.ok(result.clinical_summary.length > 10, 'Debe generar un resumen clínico');
  assert.equal(result.dolor_eva, 4, 'El dolor actual es el último valor explícito de la sesión');
  assert.equal(result.zona_corporal, 'lumbar', 'Debe identificar zona lumbar');
  assert.equal(result.dolor_eva_anterior, 7, 'Debe tomar el dolor anterior de previousNotes');
  assert.equal(result.evolucion, 'favorable', 'Debe detectar mejoría de 6 a 4 o por texto');
});

test('el respaldo no convierte una dosificación en EVA ni una negación en mejoría', () => {
  const result = fallbackRuleBasedSynthesis('Reducimos las repeticiones de 6 a 4. Sin mejoría del dolor.');
  assert.equal(result.dolor_eva, null);
  assert.equal(result.dolor_eva_anterior, null);
  assert.notEqual(result.evolucion, 'favorable');
  const change = fallbackRuleBasedSynthesis('El dolor ha pasado de 6 a 4 tras la sesión.');
  assert.equal(change.dolor_eva, 4);
  assert.equal(change.dolor_eva_anterior, 6);
  for (const text of ['Dolor 4,5/10', 'EVA 12.5', 'EVA 120', 'Escala de Borg 4']) {
    assert.equal(fallbackRuleBasedSynthesis(text).dolor_eva, null, text);
  }
});

test('el respaldo conserva el dictado sin inventar tratamientos, ejercicios ni respuestas', () => {
  for (const text of ['No se realizaron ejercicios ni terapia manual. Sin mejoría.', 'No se evaluó movilidad. No refiere alivio.',
    'Se valorará punción en la próxima sesión, no se ha realizado.', 'Paciente no tolera bien los estiramientos.']) {
    const result = fallbackRuleBasedSynthesis(text);
    assert.deepEqual(result.tratamientos, []);
    assert.deepEqual(result.ejercicios, []);
    assert.equal(result.movilidad, null);
    assert.equal(result.respuesta, null);
    assert.equal(result.clinical_summary, text);
  }
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
