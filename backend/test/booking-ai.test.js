import test from 'node:test';
import assert from 'node:assert/strict';

const { rejectComposition, shouldInterpret, urgentByKeywords } = await import('../src/lib/booking-ai.js');

test('validador de la redacción: conserva datos y no afirma lo que el backend no ha dicho', () => {
  const offer = 'Has elegido el jueves, 22 de octubre de 2026, 10:00. ¿Confirmas la reserva?';
  assert.equal(rejectComposition(offer, 'Perfecto: jueves 22 de octubre a las 10:00. ¿Confirmas la reserva?'), null);
  assert.equal(rejectComposition(offer, 'Tu cita del jueves, 22 de octubre de 2026, 10:00 queda confirmada.'), 'afirmación no respaldada');
  assert.equal(rejectComposition(offer, 'He reservado el jueves, 22 de octubre de 2026, 10:00.'), 'afirmación no respaldada');
  assert.equal(rejectComposition(offer, 'Has elegido el viernes, 22 de octubre de 2026, 10:00. ¿Confirmas?'), 'día o mes nuevo');
  assert.equal(rejectComposition(offer, 'Has elegido el jueves, 22 de octubre de 2026, 11:00. ¿Confirmas?'), 'número nuevo');
  assert.equal(rejectComposition(offer, 'Has elegido el jueves 22 de octubre. ¿Confirmas?'), 'número omitido');
  const pending = 'Solicitud de cita registrada para el jueves, 22 de octubre de 2026, 10:00, pendiente de confirmación por la clínica. Te confirmaremos por aquí.';
  assert.equal(rejectComposition(pending, 'Tu cita del jueves 22 de octubre a las 10:00 está confirmada.'), 'afirmación no respaldada');
  assert.equal(rejectComposition(pending, 'He registrado tu solicitud para el jueves 22 de octubre, 10:00; te confirmaremos por aquí.'), 'afirmación no respaldada');
  assert.equal(rejectComposition(pending, 'Listo: solicitud registrada para el jueves 22 de octubre, 10:00. La clínica debe revisarla y te confirmaremos por aquí.'), null);
  const full = 'No quedan huecos libres el jueves, 22 de octubre de 2026. Puedes elegir otro día o pedir que te llamemos.';
  assert.equal(rejectComposition(full, 'Ese jueves 22 de octubre está completo. Te llamaremos enseguida.'), 'afirmación no respaldada');
  assert.equal(rejectComposition('¿Para qué día?', 'Vaya, parece una contractura. ¿Para qué día?'), 'consejo clínico');
  assert.equal(rejectComposition('¿Para qué día?', 'Soy Carla. ¿Qué día te va bien?'), 'se presenta como persona');
  assert.equal(rejectComposition('¿Para qué día?', 'Mira en https://ejemplo.com ¿qué día?'), 'enlace o email nuevo');
  const welcome = 'Si ya eres paciente, envía VINCULAR y el código. Si no, pulsa «Compartir mi teléfono».';
  assert.equal(rejectComposition(welcome, 'Si ya eres paciente, envía el código. Si no, pulsa «Compartir mi teléfono».'), 'palabra clave omitida');
  assert.equal(rejectComposition(welcome, 'Si ya eres paciente, envía VINCULAR y el código; si no, comparte tu teléfono.'), 'botón omitido');
  assert.equal(rejectComposition('Puedes llamar al +34 900 000 000.', 'Llámanos al +34 900 000 000.'), null);
  assert.equal(rejectComposition('Puedes llamar al +34 900 000 000.', 'Llámanos al +34 900 000 001.'), 'número nuevo');
});

test('solo el texto libre va al modelo: botones, códigos, horas y confirmaciones no', () => {
  for (const text of ['CONFIRMAR', 'NO', 'si', '10:00', 'a las 9:00', '2', '2026-10-22', 'VINCULAR 0123456789ABCDEF01234567', 'Reservar cita', 'BAJA', '', '600 123 456']) {
    assert.equal(shouldInterpret(text), false, text);
  }
  for (const text of ['Hola, quería una cita el jueves por la tarde', '¿Puedo hablar con Carla?', 'me duele mucho la espalda']) assert.equal(shouldInterpret(text), true, text);
});

test('red de seguridad sin modelo: síntomas graves por palabras clave', () => {
  assert.equal(urgentByKeywords('Tengo un dolor fuerte en el pecho'), true);
  assert.equal(urgentByKeywords('no controlo la orina desde ayer'), true);
  assert.equal(urgentByKeywords('me duele un poco la rodilla'), false);
});

test('fechas relativas: «pasado mañana» son dos días y «por la mañana» no es mañana', async () => {
  const { parseNaturalAppointmentSlots } = await import('../src/lib/appointment-text.js');
  const reference = new Date('2026-10-13T10:00:00');
  assert.equal(parseNaturalAppointmentSlots('pasado mañana', reference).parsedDay, 15);
  assert.equal(parseNaturalAppointmentSlots('mañana por la mañana', reference).parsedDay, 14);
  assert.equal(parseNaturalAppointmentSlots('quiero cita por la mañana', reference).parsedDay, undefined);
});
