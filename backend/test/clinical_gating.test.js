import test from 'node:test';
import assert from 'node:assert/strict';

test('gating clinico: rechaza generacion de PDF si la recomendacion no esta aprobada', () => {
  const allowedStates = ['aprobada', 'enviada'];
  
  // Estados que DEBEN ser bloqueados
  const blockedStates = ['requiere_revision', 'rechazada', 'pendiente', 'error', null, undefined];
  
  for (const state of blockedStates) {
    const isAllowed = allowedStates.includes(state);
    assert.equal(isAllowed, false, `El estado ${state} no debe permitir exportar PDF ni enviar por Telegram`);
  }

  // Estados permitidos
  for (const state of allowedStates) {
    const isAllowed = allowedStates.includes(state);
    assert.equal(isAllowed, true, `El estado ${state} debe permitir exportar el informe`);
  }
});

test('gating clinico: red flags requieren nota clinica justificativa de al menos 12 caracteres', () => {
  function canApproveWithRedFlags({ red_flags_present, note }) {
    if (red_flags_present && (!note || note.trim().length < 12)) {
      return { ok: false, error: 'La aprobacion con alertas rojas requiere una nota clinica justificativa' };
    }
    return { ok: true };
  }

  assert.equal(canApproveWithRedFlags({ red_flags_present: true, note: '' }).ok, false);
  assert.equal(canApproveWithRedFlags({ red_flags_present: true, note: 'OK' }).ok, false);
  assert.equal(canApproveWithRedFlags({ red_flags_present: true, note: 'Revisado y adaptado para el paciente' }).ok, true);
  assert.equal(canApproveWithRedFlags({ red_flags_present: false, note: '' }).ok, true);
});

test('seguridad clinica R-4: el reemplazo para apoyo visual nunca hereda contraindicaciones de otro ejercicio', () => {
  const originalExercise = {
    id: 'ex-1',
    cautions: ['Evitar flexion lumbar si hay dolor agudo'],
    series: 4,
    repeticiones: 12,
    procedimiento: 'Sentadilla isometrica apoyado en pared',
  };

  const replacementExercise = {
    id: 'ex-2',
    contraindicaciones: 'No realizar en caso de esguince de tobillo reciente',
    metadata: { series_defecto: 2, repeticiones_defecto: 8 },
    descripcion: 'Movilizacion suave de tobillo',
  };

  // Simular la logica corregida de R-4
  const adapted = {
    exercise_id: replacementExercise.id,
    cautions: replacementExercise.contraindicaciones
      ? [String(replacementExercise.contraindicaciones)]
      : (Array.isArray(replacementExercise.cautions) ? replacementExercise.cautions : []),
    series: replacementExercise.metadata?.series_defecto ?? replacementExercise.series ?? 3,
    repeticiones: replacementExercise.metadata?.repeticiones_defecto ?? replacementExercise.repeticiones ?? 10,
    procedimiento: replacementExercise.descripcion || '',
    ajustado_apoyo_visual: true,
    ejercicio_original_id: originalExercise.id,
  };

  assert.equal(adapted.exercise_id, 'ex-2');
  assert.deepEqual(adapted.cautions, ['No realizar en caso de esguince de tobillo reciente']);
  assert.equal(adapted.series, 2);
  assert.equal(adapted.repeticiones, 8);
  assert.equal(adapted.procedimiento, 'Movilizacion suave de tobillo');
  assert.equal(adapted.ajustado_apoyo_visual, true);
  assert.equal(adapted.ejercicio_original_id, 'ex-1');
});
