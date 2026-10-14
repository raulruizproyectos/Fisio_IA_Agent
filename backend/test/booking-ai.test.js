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

test('memoria corta: últimas 3 respuestas por conversación, caducan a los 30 min y sin clave no se guarda nada', async () => {
  const { recentReplies, rememberReply } = await import('../src/lib/booking-ai.js');
  const t0 = Date.parse('2026-10-14T10:00:00Z');
  for (const text of ['uno', 'dos', 'tres', 'cuatro']) rememberReply('link-a', text, t0);
  assert.deepEqual(recentReplies('link-a', t0), ['dos', 'tres', 'cuatro']);
  assert.deepEqual(recentReplies('link-b', t0), []);
  assert.deepEqual(recentReplies('link-a', t0 + 31 * 60_000), []);
  rememberReply(null, 'nada', t0);
  assert.deepEqual(recentReplies(null, t0), []);
});

test('redacción: más variedad (temperatura 0,7) con las respuestas anteriores; la interpretación es estable (0)', async () => {
  const { composeReply, interpretMessage } = await import('../src/lib/booking-ai.js');
  const original = globalThis.fetch;
  const bodies = [];
  process.env.BOOKING_AI_ENABLED = 'true';
  process.env.OPENAI_API_KEY = 'sk-test-local';
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    bodies.push(body);
    const content = body.messages[0].content.startsWith('Clasificas') ? { intent: 'saludo' } : { text: '¡Hola de nuevo! ¿En qué te ayudo?' };
    return Response.json({ choices: [{ message: { content: JSON.stringify(content) } }] });
  };
  try {
    assert.equal(await composeReply({ base: 'Hola. ¿En qué te puedo ayudar?', tone: 'nuevo', patientText: 'hola', previous: ['a', 'b', 'c', 'd'] }), '¡Hola de nuevo! ¿En qué te ayudo?');
    await interpretMessage('Hola, ¿qué tal estáis?', { today: '2026-10-14', maxDate: '2026-11-27' });
  } finally {
    globalThis.fetch = original;
    delete process.env.BOOKING_AI_ENABLED; delete process.env.OPENAI_API_KEY;
  }
  assert.equal(bodies[0].temperature, 0.7);
  assert.deepEqual(JSON.parse(bodies[0].messages[1].content).tus_respuestas_anteriores, ['b', 'c', 'd']);
  assert.match(bodies[0].messages[0].content, /no vuelvas a saludar/);
  assert.equal(bodies[1].temperature, 0);
});

test('fechas habladas: sin año si es el actual y «a las» para la hora', async () => {
  Object.assign(process.env, { SUPABASE_URL: process.env.SUPABASE_URL || 'https://example.supabase.co',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'test-anon', SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service' });
  const { dateLabel, dateTimeLabel } = await import('../src/lib/patient-booking.js');
  const now = Date.parse('2026-10-14T08:00:00Z');
  assert.equal(dateLabel('2026-10-20', now), 'martes 20 de octubre');
  assert.equal(dateLabel('2027-01-05', now), 'martes 5 de enero de 2027');
  assert.equal(dateTimeLabel('2026-10-20T07:00:00Z', now), 'martes 20 de octubre a las 9:00');
  assert.equal(dateTimeLabel('2026-10-20T14:30:00Z', now), 'martes 20 de octubre a las 16:30');
});

test('el nombre del paciente no se repite mientras siga en las últimas respuestas', async () => {
  const { composeReply } = await import('../src/lib/booking-ai.js');
  const original = globalThis.fetch;
  const names = [];
  process.env.BOOKING_AI_ENABLED = 'true';
  process.env.OPENAI_API_KEY = 'sk-test-local';
  globalThis.fetch = async (_url, options) => {
    names.push(JSON.parse(JSON.parse(options.body).messages[1].content).nombre_paciente);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ text: 'Vale. ¿Algo más?' }) } }] });
  };
  try {
    await composeReply({ base: 'Vale. ¿Algo más?', tone: 'habitual', firstName: 'Ana', previous: ['¡Hola, Ana!'] });
    await composeReply({ base: 'Vale. ¿Algo más?', tone: 'habitual', firstName: 'Ana', previous: ['Claro.'] });
    await composeReply({ base: 'Vale. ¿Algo más?', tone: 'nuevo', firstName: 'Ana', previous: [] });
  } finally {
    globalThis.fetch = original;
    delete process.env.BOOKING_AI_ENABLED; delete process.env.OPENAI_API_KEY;
  }
  assert.deepEqual(names, [null, 'Ana', null]);
});

test('limpieza de rellenos: «Entiendo tu solicitud» y «Actualmente» fuera, sin tocar los datos', async () => {
  const { tidyComposition } = await import('../src/lib/booking-ai.js');
  assert.equal(tidyComposition('Entiendo tu solicitud. ¿Confirmas que quieres anular tu cita del viernes 16 de octubre a las 11:00?'),
    '¿Confirmas que quieres anular tu cita del viernes 16 de octubre a las 11:00?');
  assert.equal(tidyComposition('Hola. Actualmente no tienes ninguna cita próxima. ¿Quieres que busquemos una?'), 'Hola. No tienes ninguna cita próxima. ¿Quieres que busquemos una?');
  assert.equal(tidyComposition('Claro, puedo ayudarte con eso. ¿Qué día te vendría bien?'), '¿Qué día te vendría bien?');
  assert.equal(tidyComposition('Vale, ¿qué día te va bien?'), 'Vale, ¿qué día te va bien?');
});
