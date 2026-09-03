import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

const {
  getRecommendationExercises,
  hasRecommendationShape,
  inferZoneFromSymptoms,
  scoreExerciseForSymptoms,
} = await import('../src/routes/exercises.js');

test('acepta los dos contratos del motor y rechaza selecciones vacias', () => {
  const selected = [{ exercise_id: 'uno' }];
  const legacy = [{ id: 'dos' }];

  assert.deepEqual(getRecommendationExercises({ selected_exercises: selected }), selected);
  assert.deepEqual(getRecommendationExercises({ exercises: legacy }), legacy);
  assert.equal(hasRecommendationShape({ selected_exercises: [] }), false);
  assert.equal(hasRecommendationShape({ exercises: [] }), false);
  assert.equal(hasRecommendationShape({ exercises: legacy }), true);
});

test('reconoce hernia L5-S1 y prioriza ejercicios lumbares', () => {
  const symptoms = 'Hernia discal L5-S1 con dolor lumbar y objetivo de control del core';
  const zone = inferZoneFromSymptoms(symptoms);
  assert.equal(zone, 'lumbar');

  const lumbarScore = scoreExerciseForSymptoms({
    nombre: 'Puente de gluteos',
    descripcion: 'Activacion del core y control lumbopelvico',
    zona_corporal: 'espalda lumbar',
  }, symptoms, zone);
  const shoulderScore = scoreExerciseForSymptoms({
    nombre: 'Rotacion externa',
    descripcion: 'Trabajo del manguito rotador',
    zona_corporal: 'hombro',
  }, symptoms, zone);

  assert.ok(lumbarScore > shoulderScore);
});
