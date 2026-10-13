import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.MESSAGING_PILOT_CLINIC_ID = '00000000-0000-4000-8000-000000000100';
process.env.MESSAGING_PILOT_PROFESSIONAL_ID = '00000000-0000-4000-8000-000000000002';
process.env.TELEGRAM_PILOT_BOOKING_ENABLED = 'true';
process.env.TELEGRAM_PATIENT_BOT_TOKEN = 'test-telegram-token';
process.env.TELEGRAM_PATIENT_BOT_USERNAME = 'fixture_clinic_bot';
process.env.TELEGRAM_PILOT_WEBHOOK_SECRET = 'telegram-pilot-secret-with-32-characters';
delete process.env.PUBLIC_BOOKING_WINDOWS;
for (const name of ['GOOGLE_CALENDAR_ID', 'GOOGLE_CLIENT_EMAIL', 'W5_CALENDAR_READER_URL', 'W6_CALENDAR_WRITER_URL']) delete process.env[name];

const { default: telegram } = await import('../src/routes/telegram.js');
const { authorizeRequest } = await import('../src/middleware/security.js');
const { runWithRequestContext, serviceSupabase } = await import('../src/lib/supabase.js');
const { patientMayChange } = await import('../src/lib/patient-booking.js');
const { holidayName } = await import('../src/lib/clinic-calendar.js');
const { isOfferedPublicBookingSlot } = await import('../src/routes/professional.js');
const { enqueueAppointmentNotice, dispatchPendingNotices } = await import('../src/lib/agent-notices.js');
const { URGENT_NOTICE } = await import('../src/lib/booking-ai.js');

const clinic = process.env.MESSAGING_PILOT_CLINIC_ID;
const professional = process.env.MESSAGING_PILOT_PROFESSIONAL_ID;
const patientA = '00000000-0000-4000-8000-00000000000a';
const patientB = '00000000-0000-4000-8000-00000000000b';
const HOUR = 3600 * 1000;
const originalFetch = globalThis.fetch;

// In-memory PostgREST double with the uniqueness rules the agent relies on.
function database() {
  const tables = {
    crm_clinicas: [{ id: clinic, nombre: 'Clínica Ficticia', telefono: '+34 900 000 000', email: null, activo: true }],
    crm_pacientes: [
      { id: patientA, nombre: 'Ana', apellidos: 'Ficticia', telefono: '+34 600 111 222', clinica_id: clinic, activo: true, created_by_profile_id: professional },
      { id: patientB, nombre: 'Berta', apellidos: 'Ficticia', telefono: '+34 600 333 444', clinica_id: clinic, activo: true, created_by_profile_id: professional },
    ],
    crm_perfiles: [{ id: professional, clinica_id: clinic, activo: true, crm_clinicas: { id: clinic, activo: true } }],
    crm_asignaciones_fisio_paciente: [], crm_mensajeria_vinculos: [], crm_mensajeria_eventos: [], crm_citas: [],
    crm_solicitudes_contacto: [], crm_avisos_paciente: [],
  };
  const errors = {};
  const unique = {
    crm_mensajeria_vinculos: [['paciente_id', 'canal'], ['clinica_id', 'canal', 'chat_id']],
    crm_mensajeria_eventos: [['id']], crm_citas: [['request_id']],
    // The real index is partial (estado <> 'resuelta'); equal open states are enough for these tests.
    crm_solicitudes_contacto: [['request_id'], ['clinica_id', 'clave_abierta', 'estado']], crm_avisos_paciente: [['clave']],
  };
  const get = (row, key) => key.split('.').reduce((value, part) => value?.[part], row);
  const conflicts = (table, candidate, self = null) => (unique[table] || []).some(keys => keys.every(key => candidate[key] != null)
    && (tables[table] || []).some(row => row !== self && keys.every(key => row[key] === candidate[key])));
  return { tables, errors, from(table) {
    const filters = []; let operation; let payload; let single = false; let sort; let limit;
    const result = () => {
      if (errors[table]) return { error: errors[table] };
      let rows = (tables[table] || []).filter(row => filters.every(filter => filter(row)));
      if (operation === 'insert') {
        const defaults = { crm_mensajeria_eventos: { estado: 'procesando' }, crm_solicitudes_contacto: { estado: 'pendiente', aviso_estado: 'pendiente', aviso_intentos: 0 },
          crm_avisos_paciente: { estado: 'pendiente', intentos: 0 } }[table] || {};
        const row = { id: crypto.randomUUID(), ...defaults, version: 0, reserva: {},
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...structuredClone(payload) };
        if (conflicts(table, row)) return { error: { code: '23505' } };
        (tables[table] ||= []).push(row); rows = [row];
      }
      if (operation === 'update') {
        for (const row of rows) if (conflicts(table, { ...row, ...payload }, row)) return { error: { code: '23505' } };
        rows.forEach(row => Object.assign(row, structuredClone(payload), table === 'crm_citas' ? { updated_at: new Date(Date.now() + Math.random()).toISOString() } : {}));
      }
      if (operation === 'delete') tables[table] = tables[table].filter(row => !rows.includes(row));
      if (sort) rows.sort((a, b) => String(a[sort.key]).localeCompare(String(b[sort.key])) * (sort.ascending ? 1 : -1));
      if (limit) rows = rows.slice(0, limit);
      return { data: structuredClone(single ? rows[0] || null : rows) };
    };
    return { select() { return this; },
      eq(key, value) { filters.push(row => get(row, key) === value); return this; },
      neq(key, value) { filters.push(row => get(row, key) !== value); return this; },
      is(key, value) { filters.push(row => (get(row, key) ?? null) === value); return this; },
      not(key, _operator, value) { filters.push(row => (get(row, key) ?? null) !== value); return this; },
      in(key, values) { filters.push(row => values.includes(get(row, key))); return this; },
      gt(key, value) { filters.push(row => get(row, key) > value); return this; },
      gte(key, value) { filters.push(row => get(row, key) >= value); return this; },
      lt(key, value) { filters.push(row => get(row, key) < value); return this; },
      lte(key, value) { filters.push(row => get(row, key) <= value); return this; },
      order(key, options = {}) { sort = { key, ascending: options.ascending !== false }; return this; }, limit(value) { limit = value; return this; },
      insert(value) { operation = 'insert'; payload = value; return this; }, update(value) { operation = 'update'; payload = value; return this; },
      delete() { operation = 'delete'; return this; },
      single() { single = true; return Promise.resolve(result()); }, maybeSingle() { single = true; return Promise.resolve(result()); },
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
    };
  } };
}

async function withAgent(fn) {
  const db = database();
  const previousFrom = serviceSupabase.from;
  serviceSupabase.from = db.from.bind(db);
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => authorizeRequest(req, res, next));
  app.use('/api/telegram', telegram);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const sent = [];
  const aiCalls = [];
  let aiHandler = null;
  globalThis.fetch = async (url, options) => {
    // The model double: tests choose what the "AI" answers; its requests are kept apart from deliveries.
    if (String(url).startsWith('https://api.openai.com/')) {
      const body = JSON.parse(options.body);
      aiCalls.push(body);
      if (!aiHandler) throw new Error('unexpected AI call');
      return aiHandler(body, options);
    }
    sent.push({ url: String(url), body: JSON.parse(options.body), headers: options.headers });
    // n8n answers {sent:true} once Telegram accepted the message.
    return String(url).startsWith('https://n8n.example/') ? Response.json({ sent: true }) : Response.json({ ok: true, result: {} });
  };
  let update = 1000;
  const post = async (message, { secret = process.env.TELEGRAM_PILOT_WEBHOOK_SECRET, updateId = ++update } = {}) => {
    const response = await originalFetch(`http://127.0.0.1:${server.address().port}/api/telegram/pilot-incoming`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-telegram-bot-api-secret-token': secret },
      body: JSON.stringify({ update_id: updateId, message: { chat: { id: message.chat ?? 555, type: 'private' }, from: { id: message.from ?? message.chat ?? 555, is_bot: false }, ...message.body } }) });
    return { status: response.status, body: await response.json(), reply: sent.at(-1)?.body };
  };
  const say = (text, chat = 555, extra = {}) => post({ chat, body: { text }, ...extra });
  const link = (paciente_id, chat_id) => db.tables.crm_mensajeria_vinculos.push({ id: crypto.randomUUID(), clinica_id: clinic, paciente_id, canal: 'telegram',
    chat_id: String(chat_id), consentimiento_en: '2026-10-01T10:00:00Z', baja_en: null, version: 0, reserva: {} });
  const appointment = (paciente_id, startMs, extra = {}) => {
    const row = { id: crypto.randomUUID(), paciente_id, fisioterapeuta_id: professional, inicio_en: new Date(startMs).toISOString(),
      fin_en: new Date(startMs + HOUR).toISOString(), estado: 'confirmada', calendar_sync_pending: false, google_calendar_event_id: null,
      request_id: null, updated_at: '2026-10-01T10:00:00.000Z', ...extra };
    db.tables.crm_citas.push(row);
    return row;
  };
  const ai = (handler) => { aiHandler = handler; };
  try { await fn({ db, post, say, sent, link, appointment, ai, aiCalls }); }
  finally { globalThis.fetch = originalFetch; serviceSupabase.from = previousFrom; await new Promise(resolve => server.close(resolve)); }
}

// A Madrid weekday at least `days` ahead, as YYYY-MM-DD.
function weekday(days) {
  const date = new Date(Date.now() + days * 86400000);
  while ([0, 6].includes(date.getUTCDay()) || holidayName(date.toISOString().slice(0, 10))) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
const madridNoon = (dateOnly) => Date.parse(`${dateOnly}T10:00:00Z`);

test('24 horas: el instante exacto se permite y el cambio de hora no altera la antelación real', () => {
  const now = Date.parse('2026-10-20T10:00:00Z');
  assert.equal(patientMayChange('2026-10-21T10:00:00.000Z', now), true);
  assert.equal(patientMayChange('2026-10-21T09:59:59.999Z', now), false);
  // Fin del horario de verano (25-oct-2026): 10:30 del sábado a 10:30 del domingo son 25 h reales.
  assert.equal(patientMayChange('2026-10-25T09:30:00Z', Date.parse('2026-10-24T08:30:00Z')), true);
  assert.equal(patientMayChange('2026-10-25T08:29:00Z', Date.parse('2026-10-24T08:30:00Z')), false);
  // Inicio del horario de verano (29-mar-2026): 10:00 del sábado a 10:00 del domingo son solo 23 h.
  assert.equal(patientMayChange('2026-03-29T08:00:00Z', Date.parse('2026-03-28T09:00:00Z')), false);
});

test('webhook: secreto obligatorio y un update repetido no se procesa dos veces', async () => withAgent(async ({ db, post, sent }) => {
  assert.equal((await post({ body: { text: 'hola' } }, { secret: 'wrong-secret-with-more-than-32-characters' })).status, 401);
  await post({ body: { text: 'hola' } }, { updateId: 7 });
  assert.equal((await post({ body: { text: 'hola' } }, { updateId: 7 })).body.duplicate, true);
  assert.equal(sent.length, 1);
  assert.equal(db.tables.crm_mensajeria_eventos.length, 1);
}));

test('paciente nuevo: contacto propio verificado, alta mínima y sin crear dos fichas', async () => withAgent(async ({ db, say, post }) => {
  const first = await say('Quiero ver mis citas', 900);
  assert.match(first.reply.text, /asistente automático de citas de Clínica Ficticia/);
  assert.equal(first.reply.reply_markup.keyboard[0][0].request_contact, true);
  assert.doesNotMatch(first.reply.text, /no tienes|tus próximas citas/i);
  const foreign = await post({ chat: 900, from: 900, body: { contact: { phone_number: '34611000000', user_id: 901 } } });
  assert.match(foreign.reply.text, /no sirve el contacto de otra persona/);
  assert.equal(db.tables.crm_mensajeria_vinculos.length, 0);
  await post({ chat: 900, from: 900, body: { contact: { phone_number: '+34611000000', user_id: 900 } } });
  assert.equal(db.tables.crm_mensajeria_vinculos[0].paciente_id, null);
  assert.equal((await say('Ana', 900)).reply.text, 'Escribe tu nombre y al menos un apellido, por favor.');
  const done = await say('Carmen Prueba Ficticia', 900);
  assert.match(done.reply.text, /Listo, Carmen/);
  const created = db.tables.crm_pacientes.at(-1);
  assert.deepEqual([created.nombre, created.apellidos, created.telefono, created.clinica_id], ['Carmen', 'Prueba Ficticia', '+34611000000', clinic]);
  assert.equal(db.tables.crm_mensajeria_vinculos[0].paciente_id, created.id);
  assert.ok(db.tables.crm_mensajeria_vinculos[0].consentimiento_en);
  await say('Carmen Prueba Ficticia', 900);
  assert.equal(db.tables.crm_pacientes.length, 3);
}));

test('teléfono de una ficha existente: no vincula ni crea ficha y pide el código de la clínica', async () => withAgent(async ({ db, post, appointment }) => {
  appointment(patientA, Date.now() + 72 * HOUR);
  const answer = await post({ chat: 901, from: 901, body: { contact: { phone_number: '34600111222', user_id: 901 } } });
  assert.match(answer.reply.text, /código personal.*VINCULAR y el código/s);
  assert.doesNotMatch(answer.reply.text, /Ana|cita del/);
  assert.equal(db.tables.crm_mensajeria_vinculos.length, 0);
  assert.equal(db.tables.crm_pacientes.length, 2);
}));

test('código de la clínica: un solo uso, caduca y no se reutiliza desde otro chat', async () => withAgent(async ({ db, say }) => {
  const { createPilotLink } = await import('../src/lib/patient-booking.js');
  const invitation = await runWithRequestContext({ supabase: db }, () => createPilotLink({ auth: { profile_id: professional, clinic_id: clinic }, params: { patientId: patientA } }, 'telegram'));
  assert.match(invitation.deep_link, /^https:\/\/t\.me\/fixture_clinic_bot\?start=[\dA-F]{24}$/);
  const code = invitation.invitation.match(/VINCULAR ([\dA-F]{24})/)[1];
  assert.match((await say(`/start ${code}`, 910)).reply.text, /Vinculación completada/);
  assert.match((await say(`VINCULAR ${code}`, 911)).reply.text, /no válido, caducado o ya utilizado/);
  assert.equal(db.tables.crm_mensajeria_vinculos[0].chat_id, '910');
  const second = await runWithRequestContext({ supabase: db }, () => createPilotLink({ auth: { profile_id: professional, clinic_id: clinic }, params: { patientId: patientB } }, 'telegram'));
  db.tables.crm_mensajeria_vinculos.find(row => row.paciente_id === patientB).codigo_expira_en = new Date(Date.now() - 1000).toISOString();
  assert.match((await say(`VINCULAR ${second.invitation.match(/VINCULAR ([\dA-F]{24})/)[1]}`, 912)).reply.text, /caducado/);
}));

test('consulta: solo citas propias y un fallo de lectura no se presenta como «sin citas»', async () => withAgent(async ({ db, say, link, appointment }) => {
  link(patientA, 920);
  appointment(patientA, Date.now() + 72 * HOUR);
  appointment(patientA, Date.now() + 96 * HOUR, { calendar_sync_pending: true });
  appointment(patientB, Date.now() + 48 * HOUR);
  const list = await say('Mis citas', 920);
  assert.equal(list.reply.text.split('\n').filter(line => /^\d\./.test(line)).length, 2);
  assert.match(list.reply.text, /calendario pendiente de comprobar/);
  db.errors.crm_citas = { message: 'read failed' };
  const failed = await say('Mis citas', 920);
  assert.match(failed.reply.text, /No significa que no tengas ninguna/);
  assert.match(failed.reply.text, /Tu petición ha quedado registrada\. Te llamaremos/);
  assert.deepEqual(db.tables.crm_solicitudes_contacto.map(row => [row.motivo, row.telefono, row.paciente_id]), [['lectura_fallida', '+34600111222', patientA]]);
}));

test('reserva: huecos reales, confirmación explícita y una sola cita aunque se repita CONFIRMAR', async () => withAgent(async ({ db, say, link }) => {
  link(patientA, 930);
  const date = weekday(7);
  assert.match((await say('Reservar cita', 930)).reply.text, /¿Para qué día\?/);
  const slots = await say(date, 930);
  assert.match(slots.reply.text, /Horarios libres/);
  assert.equal(db.tables.crm_citas.length, 0);
  const choice = await say(slots.reply.reply_markup.keyboard[0][0].text, 930);
  assert.match(choice.reply.text, /¿Confirmas la reserva\?/);
  assert.equal(db.tables.crm_citas.length, 0);
  const confirmed = await say('CONFIRMAR', 930);
  assert.match(confirmed.reply.text, /Cita confirmada/);
  assert.equal(db.tables.crm_citas.length, 1);
  assert.equal(db.tables.crm_citas[0].canal_origen, 'telegram');
  assert.match((await say('CONFIRMAR', 930)).reply.text, /No hay ninguna operación pendiente/);
  assert.equal(db.tables.crm_citas.length, 1);
}));

test('dos pacientes eligen el mismo hueco: el segundo recibe alternativas y no se duplica', async () => withAgent(async ({ db, say, link }) => {
  link(patientA, 940); link(patientB, 941);
  const date = weekday(8);
  await say(`${date} a las 09:00`, 940);
  await say(`${date} a las 09:00`, 941);
  assert.match((await say('CONFIRMAR', 940)).reply.text, /Cita confirmada/);
  assert.match((await say('CONFIRMAR', 941)).reply.text, /acaba de ocuparse/);
  assert.equal(db.tables.crm_citas.length, 1);
}));

test('selección caducada, fallo de lectura de huecos e intención ambigua no mutan nada', async () => withAgent(async ({ db, say, link }) => {
  link(patientA, 950);
  const date = weekday(9);
  await say(`${date} a las 10:00`, 950);
  db.tables.crm_mensajeria_vinculos[0].reserva.expires_at = new Date(Date.now() - 1000).toISOString();
  assert.match((await say('CONFIRMAR', 950)).reply.text, /No hay ninguna operación pendiente/);
  assert.match((await say('cancelar', 950)).reply.text, /¿Quieres anular una cita ya registrada\?/);
  db.errors.crm_citas = { message: 'read failed' };
  const failed = await say(date, 950);
  assert.match(failed.reply.text, /no puedo comprobar los huecos/);
  assert.doesNotMatch(failed.reply.text, /No quedan huecos/);
  delete db.errors.crm_citas;
  assert.equal(db.tables.crm_citas.length, 0);
}));

test('anular: permitido con 24 h o más; con menos deriva a la clínica sin tocar la cita', async () => withAgent(async ({ db, say, link, appointment }) => {
  link(patientA, 960);
  const far = appointment(patientA, Date.now() + 48 * HOUR);
  assert.match((await say('Anular cita', 960)).reply.text, /¿Confirmas que quieres anular/);
  assert.match((await say('CONFIRMAR', 960)).reply.text, /queda anulada/);
  assert.equal(far.estado, 'cancelada');
  const near = appointment(patientA, Date.now() + 23 * HOUR);
  const derived = await say('Anular cita', 960);
  assert.match(derived.reply.text, /menos de 24 horas.*tu cita sigue como está.*Tu petición ha quedado registrada/s);
  assert.equal(near.estado, 'confirmada');
  const request = db.tables.crm_solicitudes_contacto[0];
  assert.deepEqual([request.tipo, request.motivo, request.cita_id], ['anular', 'menos_24h', near.id]);
}));

test('cambiar: nueva hora real, versión comprobada y sin cancelar antes de reservar', async () => withAgent(async ({ db, say, link, appointment }) => {
  link(patientA, 970);
  const date = weekday(10);
  const row = appointment(patientA, madridNoon(weekday(5)));
  assert.match((await say('Cambiar cita', 970)).reply.text, /¿Para qué día la quieres\?/);
  await say(`${date} a las 16:00`, 970);
  assert.match(db.tables.crm_mensajeria_vinculos[0].reserva.selection.start_local, /16:00/);
  assert.match((await say('CONFIRMAR', 970)).reply.text, /Tu cita ha cambiado al/);
  assert.equal(row.estado, 'reprogramada');
  assert.equal(row.inicio_en.slice(0, 10), date);
  assert.equal(db.tables.crm_citas.length, 1);

  const other = appointment(patientA, madridNoon(weekday(12)));
  row.estado = 'cancelada';
  await say('Cambiar cita', 970);
  await say(`${weekday(14)} a las 17:00`, 970);
  other.updated_at = '2026-10-02T00:00:00.000Z';
  const stale = await say('CONFIRMAR', 970);
  assert.match(stale.reply.text, /ha cambiado desde que empezamos/);
  assert.equal(other.estado, 'confirmada');
}));

test('respuesta perdida: se recupera leyendo por referencia, sin repetir la reserva', async () => withAgent(async ({ db, say, link, appointment }) => {
  link(patientA, 980);
  const state = db.tables.crm_mensajeria_vinculos[0];
  const requestId = crypto.randomUUID();
  state.reserva = { processing: { op: 'create', at: new Date().toISOString(), request_id: requestId } };
  assert.match((await say('hola', 980)).reply.text, /No la repetiré/);
  appointment(patientA, Date.now() + 72 * HOUR, { request_id: requestId, calendar_sync_pending: true });
  const recovered = await say('hola', 980);
  assert.match(recovered.reply.text, /registrada en la clínica, pero su calendario aún no la ha confirmado/);
  assert.doesNotMatch(recovered.reply.text, /Cita confirmada/);
  assert.deepEqual(state.reserva, {});
  assert.equal(db.tables.crm_citas.length, 1);

  state.reserva = { processing: { op: 'create', at: new Date(Date.now() - 6 * 60 * 1000).toISOString(), request_id: crypto.randomUUID() } };
  assert.match((await say('hola', 980)).reply.text, /no llegó a registrarse/);
  assert.equal(db.tables.crm_citas.length, 1);
}));

test('BAJA desactiva el canal y los recordatorios no usan ese chat', async () => withAgent(async ({ db, say, link }) => {
  link(patientA, 990);
  assert.match((await say('BAJA', 990)).reply.text, /Has desactivado este canal/);
  const row = db.tables.crm_mensajeria_vinculos[0];
  assert.equal(row.chat_id, null);
  assert.ok(row.baja_en);
  // A later message from that chat cannot reach the record without a new clinic code.
  assert.equal((await say('Mis citas', 990)).reply.reply_markup.keyboard[0][0].request_contact, true);
}));

test('ficha del CRM: con el agente activo la invitación es de un uso y el estado refleja el vínculo real', async () => withAgent(async ({ db, say }) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.auth = { profile_id: professional, clinic_id: clinic }; runWithRequestContext({ supabase: db, auth: req.auth }, next); });
  app.use('/api/telegram', telegram);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const call = async (method) => (await originalFetch(`http://127.0.0.1:${server.address().port}/api/telegram/link-code/${patientA}`,
    { method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? '{}' : undefined })).json();
  try {
    const created = await call('POST');
    assert.equal(created.data.link_status, 'pending');
    assert.match(created.data.telegram_start_command, /^\/start [\dA-F]{24}$/);
    assert.equal((await call('GET')).data.link_status, 'not_linked');
    assert.ok(!JSON.stringify(db.tables.crm_mensajeria_vinculos).includes(created.data.codigo_vinculacion));
    await say(created.data.telegram_start_command, 995);
    assert.equal((await call('GET')).data.link_status, 'linked');
    assert.equal((await call('POST')).warning, 'patient_already_linked');
  } finally { await new Promise(resolve => server.close(resolve)); }
}));

test('festivos: nacionales, autonómicos, locales configurados y víspera; el cambio de hora no mueve el horario', () => {
  assert.equal(holidayName('2030-12-06'), 'Día de la Constitución');
  assert.equal(holidayName('2030-06-24'), 'Sant Joan');
  assert.equal(holidayName('2030-04-19'), 'Viernes Santo');
  assert.equal(holidayName('2030-04-22'), 'Lunes de Pascua');
  assert.equal(holidayName('2030-12-05'), null);
  const slot = (dateOnly, utcHour) => [`${dateOnly}T${String(utcHour).padStart(2, '0')}:00:00.000Z`, `${dateOnly}T${String(utcHour + 1).padStart(2, '0')}:00:00.000Z`];
  assert.equal(isOfferedPublicBookingSlot(...slot('2030-12-06', 8)), false, 'festivo nacional');
  assert.equal(isOfferedPublicBookingSlot(...slot('2030-09-11', 7)), false, 'Diada');
  assert.equal(isOfferedPublicBookingSlot(...slot('2030-12-05', 8)), true, 'víspera laborable a las 09:00');
  // Fin del horario de verano el 27-oct-2030: las 09:00 son 07:00Z el viernes y 08:00Z el lunes.
  assert.equal(isOfferedPublicBookingSlot(...slot('2030-10-25', 7)), true);
  assert.equal(isOfferedPublicBookingSlot(...slot('2030-10-28', 7)), false);
  assert.equal(isOfferedPublicBookingSlot(...slot('2030-10-28', 8)), true);
  assert.equal(isOfferedPublicBookingSlot(...slot('2030-10-28', 12)), false, '13:00 está fuera de horario');
  process.env.BOOKING_EXTRA_HOLIDAYS = '2030-07-01, 2030-08-14';
  try {
    assert.equal(holidayName('2030-07-01'), 'Festivo local o cierre de la clínica');
    assert.equal(isOfferedPublicBookingSlot(...slot('2030-07-01', 7)), false, 'festivo local de Terrassa');
  } finally { delete process.env.BOOKING_EXTRA_HOLIDAYS; }
});

test('agente: un festivo no ofrece huecos y propone otro día o la llamada', async () => withAgent(async ({ db, say, link }) => {
  link(patientA, 1100);
  const date = weekday(5);
  process.env.BOOKING_EXTRA_HOLIDAYS = date;
  try {
    const answer = await say(`Reservar ${date}`, 1100);
    assert.match(answer.reply.text, /No quedan huecos libres.*La clínica no abre ese día/s);
    assert.deepEqual(answer.reply.reply_markup.keyboard.flat().map(button => button.text), ['Otro día', 'Que me llamen']);
    assert.match((await say('Otro día', 1100)).reply.text, /¿Qué otro día te viene bien\?/);
  } finally { delete process.env.BOOKING_EXTRA_HOLIDAYS; }
  assert.equal(db.tables.crm_citas.length, 0);
}));

test('plan B: la solicitud se guarda antes de decir «registrada», no se duplica y avisa a la clínica por n8n', async () => withAgent(async ({ db, say, link, sent }) => {
  process.env.N8N_CONTACT_REQUEST_WEBHOOK_URL = 'https://n8n.example/webhook/solicitudes';
  process.env.N8N_WEBHOOK_SECRET = 'n8n-secret';
  try {
    link(patientA, 1200);
    const date = weekday(6);
    process.env.BOOKING_EXTRA_HOLIDAYS = date;
    await say(`Reservar ${date} a las 10:00`, 1200);
    delete process.env.BOOKING_EXTRA_HOLIDAYS;
    const first = await say('Que me llamen', 1200);
    assert.match(first.reply.text, /^Tu petición ha quedado registrada\. Te llamaremos por teléfono lo antes posible/);
    const [row] = db.tables.crm_solicitudes_contacto;
    assert.deepEqual([row.tipo, row.motivo, row.fecha_deseada, row.hora_deseada, row.telefono, row.estado],
      ['reservar', 'sin_hueco', date, '10:00', '+34600111222', 'pendiente']);
    const alert = sent.find(item => item.url === process.env.N8N_CONTACT_REQUEST_WEBHOOK_URL);
    assert.equal(alert.headers['X-Webhook-Secret'], 'n8n-secret');
    assert.match(alert.body.text, /Ana Ficticia · \+34600111222/);
    assert.equal(row.aviso_estado, 'enviado');
    // Same request again: the open one is reused and the clinic is not alerted twice.
    await say(`Reservar ${date} a las 10:00`, 1200);
    db.tables.crm_mensajeria_vinculos[0].reserva.callback_offer = { tipo: 'reservar', motivo: 'sin_hueco', date, hour: '10:00' };
    assert.match((await say('Que me llamen', 1200)).reply.text, /ya estaba registrada/);
    assert.equal(db.tables.crm_solicitudes_contacto.length, 1);
    assert.equal(sent.filter(item => item.url === process.env.N8N_CONTACT_REQUEST_WEBHOOK_URL).length, 1);
  } finally { delete process.env.N8N_CONTACT_REQUEST_WEBHOOK_URL; delete process.env.N8N_WEBHOOK_SECRET; }
}));

test('plan B: si no se puede guardar la solicitud no se dice «registrada» y se da el contacto de la clínica', async () => withAgent(async ({ db, say, link }) => {
  link(patientA, 1300);
  db.errors.crm_solicitudes_contacto = { message: 'insert failed' };
  const answer = await say('que me llamen', 1300);
  assert.doesNotMatch(answer.reply.text, /registrada/);
  assert.match(answer.reply.text, /no he podido registrar tu petición\. Inténtalo de nuevo en unos minutos\. Si es urgente, puedes contactar con la clínica por el teléfono \+34 900 000 000/);
}));

test('plan B: sin teléfono en la ficha se pide solo ese dato antes de registrar', async () => withAgent(async ({ db, say, link }) => {
  db.tables.crm_pacientes[1].telefono = null;
  link(patientB, 1400);
  assert.match((await say('Que me llamen', 1400)).reply.text, /escribe tu número de teléfono/);
  assert.equal(db.tables.crm_solicitudes_contacto.length, 0);
  assert.match((await say('12', 1400)).reply.text, /No he reconocido ese número/);
  assert.match((await say('611 22 33 44', 1400)).reply.text, /Tu petición ha quedado registrada/);
  assert.deepEqual(db.tables.crm_solicitudes_contacto.map(row => [row.telefono, row.motivo]), [['+34611223344', 'peticion_paciente']]);
}));

test('teléfono ya registrado en otra ficha: se registra la llamada con el teléfono verificado', async () => withAgent(async ({ db, post }) => {
  const answer = await post({ chat: 1500, from: 1500, body: { contact: { phone_number: '34600111222', user_id: 1500 } } });
  assert.match(answer.reply.text, /código personal.*Te llamaremos a este número/s);
  assert.doesNotMatch(answer.reply.text, /confirmarte la cita/);
  assert.equal(answer.reply.reply_markup?.keyboard, undefined);
  assert.deepEqual(db.tables.crm_solicitudes_contacto.map(row => [row.motivo, row.telefono, row.paciente_id, row.chat_id]),
    [['telefono_existente', '+34600111222', null, '1500']]);
  assert.equal(db.tables.crm_mensajeria_vinculos.length, 0);
  // Writing again does not start over: the open request is acknowledged and nothing is duplicated.
  const again = await post({ chat: 1500, from: 1500, body: { text: 'Mis citas' } });
  assert.match(again.reply.text, /ya está registrada.*VINCULAR y el código/s);
  assert.equal(db.tables.crm_solicitudes_contacto.length, 1);
}));

test('sin verificar: bienvenida completa al saludar o la primera vez; después, solo el recordatorio del botón', async () => withAgent(async ({ say }) => {
  assert.match((await say('Quiero una cita', 1600)).reply.text, /asistente automático de citas/);
  const second = (await say('Carmen Prueba Ficticia', 1600)).reply;
  assert.match(second.text, /^Antes de nada necesito verificar tu teléfono/);
  assert.equal(second.reply_markup.keyboard[0][0].request_contact, true);
  assert.match((await say('Hola', 1600)).reply.text, /asistente automático de citas/);
}));

test('paciente nuevo: su cita queda pendiente de la clínica hasta revisar la ficha', async () => withAgent(async ({ db, say, post }) => {
  await post({ chat: 1600, from: 1600, body: { contact: { phone_number: '+34622000000', user_id: 1600 } } });
  await say('Nora Prueba', 1600);
  const created = db.tables.crm_pacientes.at(-1);
  assert.equal(created.origen_alta, 'asistente_telegram');
  db.tables.crm_asignaciones_fisio_paciente.push({ paciente_id: created.id, clinica_id: clinic, fisioterapeuta_id: professional, estado: 'activa' });
  const date = weekday(7);
  await say(`Reservar ${date} a las 10:00`, 1600);
  const booked = await say('CONFIRMAR', 1600);
  assert.match(booked.reply.text, /^Solicitud de cita registrada para el .*, pendiente de confirmación por la clínica\. Te confirmaremos por aquí\./);
  assert.doesNotMatch(booked.reply.text, /Cita confirmada/);
  assert.equal(db.tables.crm_citas[0].estado, 'pendiente');
  const review = db.tables.crm_solicitudes_contacto[0];
  assert.deepEqual([review.motivo, review.cita_id, review.telefono], ['revisar_paciente_nuevo', db.tables.crm_citas[0].id, '+34622000000']);
  // Once the clinic reviews the record, the patient's bookings are confirmed directly.
  created.revisada_en = new Date().toISOString();
  await say(`Reservar ${date} a las 11:00`, 1600);
  assert.match((await say('CONFIRMAR', 1600)).reply.text, /^Cita confirmada/);
  assert.equal(db.tables.crm_citas[1].estado, 'confirmada');
}));

test('avisos al paciente: la clínica confirma, cambia o anula y se avisa una sola vez por versión', async () => withAgent(async ({ db, link, appointment, sent }) => {
  process.env.N8N_PATIENT_NOTICE_WEBHOOK_URL = 'https://n8n.example/webhook/avisos-paciente';
  process.env.N8N_WEBHOOK_SECRET = 'n8n-secret';
  try {
    link(patientA, 1700);
    const before = appointment(patientA, Date.now() + 72 * HOUR, { estado: 'pendiente' });
    const confirmed = { ...before, estado: 'confirmada', updated_at: '2026-10-02T10:00:00.000Z' };
    assert.equal(await enqueueAppointmentNotice(before, confirmed), 'enviado');
    assert.equal(await enqueueAppointmentNotice(before, confirmed), null, 'misma versión: no se repite');
    const moved = { ...confirmed, inicio_en: new Date(Date.now() + 96 * HOUR).toISOString(), updated_at: '2026-10-03T10:00:00.000Z' };
    await enqueueAppointmentNotice(confirmed, moved);
    await enqueueAppointmentNotice(moved, { ...moved, estado: 'cancelada', updated_at: '2026-10-04T10:00:00.000Z' });
    const texts = sent.filter(item => item.url === process.env.N8N_PATIENT_NOTICE_WEBHOOK_URL).map(item => item.body.text);
    assert.equal(texts.length, 3);
    assert.match(texts[0], /^La clínica ha confirmado tu cita del/);
    assert.match(texts[1], /^La clínica ha cambiado tu cita al/);
    assert.match(texts[2], /^La clínica ha anulado tu cita del/);
    assert.ok(sent.every(item => item.url !== process.env.N8N_PATIENT_NOTICE_WEBHOOK_URL || item.body.chat_id === '1700'));
    // A patient without the channel (BAJA) gets nothing.
    db.tables.crm_mensajeria_vinculos[0].baja_en = new Date().toISOString();
    assert.equal(await enqueueAppointmentNotice(before, { ...confirmed, updated_at: '2026-10-05T10:00:00.000Z' }), null);
  } finally { delete process.env.N8N_PATIENT_NOTICE_WEBHOOK_URL; delete process.env.N8N_WEBHOOK_SECRET; }
}));

test('avisos: sin n8n quedan pendientes y el reenvío solo repite lo que seguro no salió', async () => withAgent(async ({ db, link, appointment, sent }) => {
  link(patientA, 1800);
  const before = appointment(patientA, Date.now() + 72 * HOUR, { estado: 'pendiente' });
  assert.equal(await enqueueAppointmentNotice(before, { ...before, estado: 'confirmada', updated_at: '2026-10-02T10:00:00.000Z' }), 'pendiente');
  db.tables.crm_avisos_paciente.push({ ...structuredClone(db.tables.crm_avisos_paciente[0]), id: crypto.randomUUID(), clave: 'otra', estado: 'incierto' });
  process.env.N8N_PATIENT_NOTICE_WEBHOOK_URL = 'https://n8n.example/webhook/avisos-paciente';
  process.env.N8N_WEBHOOK_SECRET = 'n8n-secret';
  try {
    assert.deepEqual(await dispatchPendingNotices(), { contact_requests: 0, patient_notices: 1 });
    assert.deepEqual(db.tables.crm_avisos_paciente.map(row => row.estado), ['enviado', 'incierto']);
    assert.equal(sent.length, 1);
  } finally { delete process.env.N8N_PATIENT_NOTICE_WEBHOOK_URL; delete process.env.N8N_WEBHOOK_SECRET; }
}));

// Capa de IA híbrida: el modelo se simula; solo interpreta y redacta, y el backend valida todo.
const modelAnswer = (content) => Response.json({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] });
const fakeModel = ({ interpret = () => ({ intent: 'otro' }), compose = (facts) => ({ text: facts.mensaje_base }) } = {}) => (body) => (
  body.messages[0].content.startsWith('Clasificas')
    ? modelAnswer(interpret(JSON.parse(body.messages[1].content.split('Mensaje del paciente: ')[1])))
    : modelAnswer(compose(JSON.parse(body.messages[1].content))));
async function withAi(fn) {
  process.env.BOOKING_AI_ENABLED = 'true';
  process.env.OPENAI_API_KEY = 'sk-test-local';
  try { await fn(); } finally { for (const name of ['BOOKING_AI_ENABLED', 'OPENAI_API_KEY', 'BOOKING_AI_TIMEOUT_MS']) delete process.env[name]; }
}
const optionsOf = (result) => (result.reply.reply_markup.keyboard || []).flat().map(button => button.text);

test('IA híbrida: «la semana que viene por la tarde» va a los huecos de la tarde y la redacción conserva los datos', async () => withAi(() => withAgent(async ({ db, say, link, ai }) => {
  link(patientA, 2000);
  const date = weekday(7);
  ai(fakeModel({ interpret: () => ({ intent: 'reservar', day: date, part_of_day: 'tarde', time: null, urgent: false, worried: false }),
    compose: (facts) => ({ text: facts.mensaje_base.replace('Horarios libres', 'Claro, vamos a verlo. Estos son los huecos libres') }) }));
  const result = await say('Quería venir la semana que viene por la tarde', 2000);
  assert.match(result.reply.text, /^Claro, vamos a verlo/);
  const hours = optionsOf(result).filter(option => /^\d\d:\d\d$/.test(option));
  assert.ok(hours.length > 0 && hours.every(hour => hour >= '14:00'), hours.join());
  assert.equal(db.tables.crm_citas.length, 0);
  ai(fakeModel({ interpret: () => ({ intent: 'hablar_clinica' }) }));
  assert.match((await say('¿Puedo hablar con Carla?', 2000)).reply.text, /registrada/);
  assert.equal(db.tables.crm_solicitudes_contacto.length, 1);
})));

test('IA híbrida: una redacción que «confirma» sin cita creada o inventa una hora se descarta; solo CONFIRMAR reserva', async () => withAi(() => withAgent(async ({ db, say, link, ai }) => {
  link(patientA, 2010);
  const date = weekday(8);
  ai(fakeModel({ compose: (facts) => ({ text: `¡Hecho! Tu cita queda confirmada. ${facts.mensaje_base}` }) }));
  const offered = await say(`${date} a las 10:00`, 2010);
  assert.match(offered.reply.text, /^Hay un hueco/);
  assert.doesNotMatch(offered.reply.text, /confirmada/);
  ai(fakeModel({ interpret: () => ({ intent: 'reservar' }), compose: (facts) => ({ text: `${facts.mensaje_base} También tengo libre a las 11:30.` }) }));
  const affirmative = await say('Sí, venga, resérvamela', 2010);
  assert.match(affirmative.reply.text, /pulsa CONFIRMAR/);
  assert.doesNotMatch(affirmative.reply.text, /11:30/);
  assert.match((await say('perfecto, muchas gracias', 2010)).reply.text, /pulsa CONFIRMAR/);
  assert.equal(db.tables.crm_citas.length, 0);
  ai(fakeModel());
  assert.match((await say('CONFIRMAR', 2010)).reply.text, /Cita confirmada/);
  assert.equal(db.tables.crm_citas.length, 1);
})));

test('IA híbrida: error, tiempo agotado o respuesta no válida dejan la respuesta determinista', async () => withAi(() => withAgent(async ({ db, say, link, ai }) => {
  link(patientA, 2020);
  process.env.BOOKING_AI_TIMEOUT_MS = '500';
  const failures = [
    () => { throw new Error('network'); },
    () => new Response('fail', { status: 500 }),
    () => modelAnswer('esto no es JSON'),
    () => modelAnswer({ intent: 'confirmar', text: '' }),
    (_body, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason))),
  ];
  for (const failure of failures) {
    ai(failure);
    assert.match((await say('Me gustaría reservar cita', 2020)).reply.text, /^¿Para qué día\?/);
  }
  assert.equal(db.tables.crm_citas.length, 0);
})));

test('síntomas graves: se recomienda el 112 sin diagnosticar, con o sin IA, y sin emojis', async () => withAgent(async ({ say, link, ai }) => {
  link(patientA, 2030);
  assert.ok((await say('Tengo un dolor fuerte en el pecho y me cuesta respirar', 2030)).reply.text.startsWith(URGENT_NOTICE));
  await withAi(async () => {
    ai(fakeModel({ interpret: () => ({ intent: 'reservar', day: null, part_of_day: null, time: null, urgent: true, worried: true }),
      compose: (facts) => ({ text: `${facts.paciente_preocupado ? 'Vaya, lo siento. ' : ''}${facts.mensaje_base} 😊` }) }));
    const answer = (await say('Desde la caída tengo la pierna rara y no la noto bien', 2030)).reply.text;
    assert.ok(answer.startsWith(URGENT_NOTICE));
    assert.match(answer, /Vaya, lo siento\. ¿Para qué día\?/);
    assert.doesNotMatch(answer, /😊/);
  });
  assert.ok((await say('me he desmayado y me duele la espalda', 2031)).reply.text.startsWith(URGENT_NOTICE));
}));

test('IA híbrida: a la IA no llegan teléfono, apellidos ni identificadores; tono según el CRM', async () => withAi(() => withAgent(async ({ db, say, link, appointment, ai, aiCalls }) => {
  db.tables.crm_pacientes[0].apellidos = 'Apellidoprivado';
  link(patientA, 2040); link(patientB, 2041);
  appointment(patientB, Date.now() - 72 * HOUR, { estado: 'completada' });
  const seen = [];
  ai(fakeModel({ compose: (facts) => { seen.push(facts); return { text: `${facts.mensaje_base} 🙂` }; } }));
  const first = await say('Hola, ¿qué tal? Quería saber qué puedo hacer por aquí', 2040);
  const second = await say('Hola, ¿qué tal? Quería saber qué puedo hacer por aquí', 2041);
  assert.deepEqual([seen[0].tono, seen[0].nombre_paciente, seen[1].tono, seen[1].nombre_paciente], ['nuevo', null, 'habitual', 'Berta']);
  assert.doesNotMatch(first.reply.text, /🙂/);
  assert.match(second.reply.text, /🙂/);
  const payload = JSON.stringify(aiCalls);
  for (const secret of ['Apellidoprivado', '600 111 222', '600 333 444', patientA, patientB, clinic, professional, '"2040"', '"2041"']) assert.ok(!payload.includes(secret), secret);
})));

test('cambiar con el día en el mismo mensaje: muestra los huecos sin volver a preguntarlo', async () => withAgent(async ({ db, say, link, appointment }) => {
  link(patientA, 2050);
  const original = appointment(patientA, madridNoon(weekday(5)));
  const target = weekday(10);
  const offered = await say(`Quiero cambiar mi cita al ${target}`, 2050);
  assert.match(offered.reply.text, /Horarios libres/);
  assert.match((await say(offered.reply.reply_markup.keyboard[0][0].text, 2050)).reply.text, /Vas a cambiar tu cita/);
  assert.match((await say('vale', 2050)).reply.text, /pulsa CONFIRMAR/);
  assert.match((await say('CONFIRMAR', 2050)).reply.text, /Tu cita ha cambiado/);
  assert.equal(db.tables.crm_citas.length, 1);
  assert.equal(db.tables.crm_citas[0].id, original.id);
  assert.equal(db.tables.crm_citas[0].inicio_en.slice(0, 10), target);
}));
