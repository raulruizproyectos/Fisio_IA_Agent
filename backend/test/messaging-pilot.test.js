import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.OPENWA_PILOT_ENABLED = 'true';
process.env.OPENWA_BASE_URL = 'http://openwa.test:2785/api';
process.env.OPENWA_API_KEY = 'test-openwa-key';
process.env.OPENWA_SESSION_ID = 'pilot-session';
process.env.OPENWA_WEBHOOK_SECRET = 'test-webhook-secret-with-32-characters';
process.env.MESSAGING_PILOT_CLINIC_ID = '00000000-0000-4000-8000-000000000100';
process.env.MESSAGING_PILOT_PROFESSIONAL_ID = '00000000-0000-4000-8000-000000000002';
process.env.TELEGRAM_PILOT_BOOKING_ENABLED = 'true';
process.env.TELEGRAM_PATIENT_BOT_TOKEN = 'test-telegram-token';
process.env.TELEGRAM_PILOT_WEBHOOK_SECRET = 'telegram-pilot-secret-with-32-characters';
delete process.env.GOOGLE_CALENDAR_ID;
delete process.env.GOOGLE_CLIENT_EMAIL;
delete process.env.W5_CALENDAR_READER_URL;
delete process.env.W6_CALENDAR_WRITER_URL;

const { default: whatsapp } = await import('../src/routes/whatsapp.js');
const { default: telegram } = await import('../src/routes/telegram.js');
const { authorizeRequest } = await import('../src/middleware/security.js');
const { runWithRequestContext, serviceSupabase } = await import('../src/lib/supabase.js');
const { getOpenWAConfig, openWARequest } = await import('../src/lib/openwa.js');
const { parseNaturalAppointmentSlots } = await import('../src/lib/appointment-text.js');
const { respondToPatientBooking } = await import('../src/lib/patient-booking.js');
const clinic = process.env.MESSAGING_PILOT_CLINIC_ID;
const professional = process.env.MESSAGING_PILOT_PROFESSIONAL_ID;
const patientId = '00000000-0000-4000-8000-000000000011';
const recId = '00000000-0000-4000-8000-000000005011';
const chat = '34600111222@c.us';
const originalFetch = globalThis.fetch;

function database() {
  const tables = {
    crm_pacientes: [{ id: patientId, nombre: 'Paciente real', telefono: '+34 600 111 222', clinica_id: clinic, activo: true, created_by_profile_id: professional }],
    crm_perfiles: [{ id: professional, clinica_id: clinic, activo: true, crm_clinicas: { activo: true } }],
    crm_recomendaciones: [{ id: recId, paciente_id: patientId, fisioterapeuta_id: professional, estado: 'aprobada', reviewed_at: '2026-10-07T10:00:00Z', reviewed_by_profile_id: professional, report_version: 1,
      crm_pacientes: { nombre: 'Paciente real' }, report_snapshot: { exercises: [{ exercise_id: 'exercise-a', nombre: 'Ejercicio aprobado', series: 2, repeticiones: 8 }], message_to_patient: 'Pautas aprobadas' } }],
    crm_ejercicios_catalogo: [{ id: 'exercise-a', metadata: {} }], crm_ejercicio_media: [],
    crm_mensajeria_vinculos: [{ id: 'link-a', clinica_id: clinic, paciente_id: patientId, canal: 'whatsapp', chat_id: chat, consentimiento_en: '2026-10-07T10:00:00Z', version: 0, reserva: {} }],
    crm_mensajeria_eventos: [], crm_whatsapp_envios: [], crm_citas: [],
  };
  const errors = {};
  return { tables, errors, from(table) {
    const filters = []; let operation; let payload; let single = false; let sort; let limit;
    const get = (row, key) => key.split('.').reduce((value, part) => value?.[part], row);
    const result = () => {
      if (errors[table]) return { error: errors[table] };
      let rows = (tables[table] || []).filter(row => filters.every(filter => filter(row)));
      if (operation === 'insert') {
        const existing = (tables[table] || []).some(row => table === 'crm_whatsapp_envios' ? row.recomendacion_id === payload.recomendacion_id && row.report_version === payload.report_version
          : table === 'crm_mensajeria_vinculos' ? row.paciente_id === payload.paciente_id && row.canal === payload.canal : row.id === payload.id && payload.id);
        if (existing) return { error: { code: '23505' } };
        const row = { id: crypto.randomUUID(), estado: 'procesando', created_at: new Date().toISOString(), ...payload };
        (tables[table] ||= []).push(row); rows = [row];
      }
      if (operation === 'update') rows.forEach(row => Object.assign(row, structuredClone(payload)));
      if (sort) rows.sort((a,b) => String(b[sort]).localeCompare(String(a[sort])));
      if (limit) rows = rows.slice(0,limit);
      return { data: structuredClone(single ? rows[0] || null : rows) };
    };
    return { select() { return this; },
      eq(key, value) { filters.push(row => get(row,key) === value); return this; },
      is(key, value) { filters.push(row => (get(row,key) ?? null) === value); return this; },
      not(key, _operator, value) { filters.push(row => (get(row,key) ?? null) !== value); return this; },
      in(key, values) { filters.push(row => values.includes(get(row,key))); return this; },
      gt(key, value) { filters.push(row => get(row,key) > value); return this; },
      lt(key, value) { filters.push(row => get(row,key) < value); return this; },
      order(key) { sort = key; return this; }, limit(value) { limit = value; return this; },
      insert(value) { operation = 'insert'; payload = value; return this; }, update(value) { operation = 'update'; payload = value; return this; },
      single() { single = true; return Promise.resolve(result()); }, maybeSingle() { single = true; return Promise.resolve(result()); },
      then(resolve, reject) { return Promise.resolve(result()).then(resolve,reject); },
    };
  } };
}

async function withServer(fn) {
  const db = database();
  const previousFrom = serviceSupabase.from;
  serviceSupabase.from = db.from.bind(db);
  const app = express();
  app.use('/api/whatsapp/incoming', express.raw({ type: 'application/json', verify: (req, _res, buffer) => { req.rawBody = buffer; } }));
  app.use(express.json());
  app.use((req,res,next) => {
    if (req.path.endsWith('/incoming') || req.path.endsWith('/pilot-incoming')) return authorizeRequest(req,res,next);
    req.auth = { profile_id: professional, clinic_id: req.get('x-test-clinic') || clinic, role: 'fisioterapeuta' };
    return runWithRequestContext({ supabase: db, auth: req.auth },next);
  });
  app.use('/api/whatsapp',whatsapp);
  app.use('/api/telegram',telegram);
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  const post = async (path, body, headers = {}) => {
    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    const response = await originalFetch(`http://127.0.0.1:${server.address().port}${path}`, { method: 'POST', body: raw, headers: { 'Content-Type': 'application/json', ...headers } });
    return { status: response.status, body: await response.json() };
  };
  const incoming = (data, event = 'message.received', extra = {}) => {
    const body = JSON.stringify({ event, sessionId: 'pilot-session', timestamp: new Date().toISOString(), data, ...extra });
    const signature = 'sha256=' + crypto.createHmac('sha256',process.env.OPENWA_WEBHOOK_SECRET).update(body).digest('hex');
    return post('/api/whatsapp/incoming',body,{ 'X-OpenWA-Signature': signature });
  };
  const sends = [];
  globalThis.fetch = async (url, options) => {
    sends.push({ url: String(url), ...options, payload: options?.body ? JSON.parse(options.body) : null });
    return Response.json({ messageId: 'provider-' + sends.length, timestamp: 1791367200 },{ status: 201 });
  };
  try { await fn({ db, post, incoming, sends }); }
  finally { globalThis.fetch = originalFetch; serviceSupabase.from = previousFrom; await new Promise(resolve=>server.close(resolve)); }
}

const textMessage = (id, body) => ({ id, chatId: chat, from: chat, kind: 'individual', isGroup: false, fromMe: false, type: 'text', body });

test('OpenWA exige firma sobre bytes originales y no admite clave interna ni sesiones ajenas', async () => withServer(async ({ db, post, incoming, sends }) => {
  assert.equal((await post('/api/whatsapp/incoming','{"data":{}}',{ 'X-OpenWA-Signature': 'sha256='+'0'.repeat(64), 'x-internal-api-key': 'internal' })).status,401);
  assert.equal((await incoming(textMessage('x','Hola'), 'message.received', { sessionId: 'other-session' })).status,403);
  assert.equal((await incoming({ ...textMessage('group','hola'), isGroup:true, kind:'group' })).body.ignored,true);
  assert.equal(sends.length,0);
  assert.equal(db.tables.crm_mensajeria_eventos.length,0);
  process.env.OPENWA_PILOT_ENABLED = 'false';
  assert.equal((await incoming(textMessage('disabled','hola'))).status,503);
  process.env.OPENWA_PILOT_ENABLED = 'true';
}));

test('planes: aprobación y clínica obligatorias, contenido canónico, deduplicación y recibo real', async () => withServer(async ({ db, post, incoming, sends }) => {
  const request = { patient_id: patientId, recommendation_id: recId, message_to_patient:'texto inyectado', exercises:[] };
  db.tables.crm_recomendaciones[0].estado='requiere_revision';
  assert.equal((await post('/api/whatsapp/patient-report/send',request)).status,409);
  db.tables.crm_recomendaciones[0].estado='aprobada';
  assert.equal((await post('/api/whatsapp/patient-report/send',request,{ 'x-test-clinic':'other-clinic' })).status,403);
  assert.equal((await post('/api/whatsapp/patient-report/send',{ ...request, chat_id:'other' })).status,400);
  assert.equal((await post('/api/whatsapp/patient-report/send',{ ...request, dry_run:true })).body.dry_run,true);
  assert.equal(sends.length,0);
  const sent=await post('/api/whatsapp/patient-report/send',request);
  assert.equal(sent.status,202);
  assert.equal(db.tables.crm_recomendaciones[0].estado,'aprobada');
  assert.equal(sends[0].payload.chatId,chat);
  assert.equal(sends[0].payload.caption,'Pautas aprobadas');
  assert.equal(sends[0].payload.mimetype,'application/pdf');
  assert.match(Buffer.from(sends[0].payload.base64,'base64').toString(),/^%PDF/);
  assert.equal((await post('/api/whatsapp/patient-report/send',request)).body.duplicate,true);
  assert.equal(sends.length,1);
  await incoming({ messageId:'provider-1',status:'delivered' },'message.ack');
  assert.equal(db.tables.crm_whatsapp_envios[0].estado,'entregado');
  assert.equal(db.tables.crm_recomendaciones[0].estado,'enviada');
  await incoming({ messageId:'provider-1',status:'read' },'message.ack');
  await incoming({ messageId:'provider-1',status:'failed' },'message.failed');
  assert.equal(db.tables.crm_whatsapp_envios[0].estado,'leido');
}));

test('un resultado de envío desconocido queda bloqueado y no provoca reenvío automático', async () => withServer(async ({ db, post, sends }) => {
  globalThis.fetch = async (url, options) => { sends.push({ url, options }); throw new Error('timeout'); };
  const request={ patient_id:patientId,recommendation_id:recId };
  const result=await post('/api/whatsapp/patient-report/send',request);
  assert.equal(result.body.requires_manual_review,true);
  assert.equal(db.tables.crm_whatsapp_envios[0].estado,'desconocido');
  assert.equal(db.tables.crm_recomendaciones[0].estado,'aprobada');
  await post('/api/whatsapp/patient-report/send',request);
  assert.equal(sends.length,1);
}));

test('BAJA desactiva el vínculo y bloquea nuevos informes sin cancelar citas', async () => withServer(async ({ db, post, incoming }) => {
  db.tables.crm_citas.push({id:'existing-appointment'});
  const staleLink = structuredClone(db.tables.crm_mensajeria_vinculos[0]);
  db.tables.crm_mensajeria_vinculos[0].version += 1;
  await assert.rejects(runWithRequestContext({ supabase: db }, () => respondToPatientBooking(staleLink, 'BAJA', getOpenWAConfig())), { status: 409 });
  assert.equal(db.tables.crm_mensajeria_vinculos[0].chat_id, chat);
  await incoming(textMessage('opt-out','BAJA'));
  assert.equal(db.tables.crm_mensajeria_vinculos[0].chat_id,null);
  assert.ok(db.tables.crm_mensajeria_vinculos[0].baja_en);
  assert.equal((await post('/api/whatsapp/patient-report/send',{patient_id:patientId,recommendation_id:recId})).status,409);
  assert.equal(db.tables.crm_citas.length,1);
}));

test('un recibo que llega antes de la respuesta de envío se conserva y reconcilia', async () => withServer(async ({ db, post, incoming }) => {
  globalThis.fetch = async () => {
    await incoming({ messageId:'early-receipt',status:'delivered' },'message.ack');
    return Response.json({ messageId:'early-receipt' },{status:201});
  };
  const result=await post('/api/whatsapp/patient-report/send',{patient_id:patientId,recommendation_id:recId});
  assert.equal(result.status,202);
  assert.equal(db.tables.crm_whatsapp_envios[0].estado,'entregado');
  assert.equal(db.tables.crm_recomendaciones[0].estado,'enviada');
}));

test('vinculación: consentimiento por código temporal, teléfono guardado y clínica del paciente', async () => withServer(async ({ db, post, incoming }) => {
  db.tables.crm_mensajeria_vinculos=[];
  const invite=await post('/api/whatsapp/link-code/'+patientId,{});
  assert.equal(invite.status,200);
  const code=invite.body.invitation.match(/VINCULAR (\w+)/)[1];
  const row=db.tables.crm_mensajeria_vinculos[0]; row.version=0; row.reserva={};
  assert.notEqual(row.codigo_hash,code);
  await incoming({ ...textMessage('wrong','VINCULAR '+code),chatId:'34600999999@c.us' });
  assert.equal(row.chat_id,undefined);
  await incoming(textMessage('right','VINCULAR '+code));
  assert.equal(row.chat_id,chat);
  assert.ok(row.consentimiento_en);
  assert.equal(row.codigo_hash,null);
  db.tables.crm_pacientes[0].clinica_id='other-clinic';
  assert.equal((await post('/api/whatsapp/link-code/'+patientId,{})).status,404);
}));

test('WhatsApp y Telegram comparten selección, confirmación y reserva sin duplicar webhooks', async () => withServer(async ({ db, post, incoming }) => {
  const day=new Date(Date.now()+7*86400000);
  while ([0,6].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate()+1);
  const date=day.toISOString().slice(0,10);
  await incoming(textMessage('day',date));
  const link=db.tables.crm_mensajeria_vinculos[0];
  assert.ok(link.reserva.slots.length>0);
  assert.equal(db.tables.crm_citas.length,0);
  await incoming(textMessage('option','1'));
  assert.ok(link.reserva.selection);
  assert.equal(db.tables.crm_citas.length,0);
  await incoming(textMessage('confirm','CONFIRMAR'));
  assert.equal(db.tables.crm_citas.length,1);
  assert.equal(db.tables.crm_citas[0].estado,'confirmada');
  assert.equal(db.tables.crm_citas[0].canal_origen,'whatsapp');
  assert.equal((await incoming(textMessage('confirm','CONFIRMAR'))).body.duplicate,true);
  assert.equal(db.tables.crm_citas.length,1);
  const telegramLink={ ...structuredClone(link), id:'telegram-link',canal:'telegram',chat_id:'12345',version:0,reserva:{} };
  db.tables.crm_mensajeria_vinculos.push(telegramLink);
  const tg=async (id,text)=>post('/api/telegram/pilot-incoming',{ update_id:id,message:{chat:{id:12345,type:'private'},from:{is_bot:false},text} },{ 'x-telegram-bot-api-secret-token':process.env.TELEGRAM_PILOT_WEBHOOK_SECRET });
  assert.equal((await tg(10,date)).status,200);
  assert.ok(telegramLink.reserva.slots.length>0);
  await tg(11,'1'); await tg(12,'CONFIRMAR');
  assert.equal(db.tables.crm_citas.length,2);
  assert.equal(db.tables.crm_citas[1].canal_origen,'telegram');
  assert.equal((await tg(12,'CONFIRMAR')).body.duplicate,true);
  assert.equal(db.tables.crm_citas.length,2);
}));

test('OpenWA no sigue redirecciones ni repite operaciones con respuestas inciertas', async () => {
  let count=0;
  globalThis.fetch=async (_url, options)=>{ count++; assert.equal(options.redirect,'error'); return Response.json({},{status:201}); };
  try { await assert.rejects(openWARequest(getOpenWAConfig(),'/messages/send-text',{chatId:chat,text:'Prueba'}), error=>error.code==='openwa_outcome_unknown'); assert.equal(count,1); }
  finally { globalThis.fetch=originalFetch; }
});

test('fechas relativas usan el día de Madrid aunque el servidor esté en UTC', () => {
  const parsed=parseNaturalAppointmentSlots('mañana',new Date('2026-10-06T22:30:00Z'));
  assert.deepEqual([parsed.parsedYear,parsed.parsedMonth,parsed.parsedDay],[2026,10,8]);
});

test('dos confirmaciones concurrentes solo registran una cita y un paciente ajeno no reserva', async () => withServer(async ({ db, incoming }) => {
  const date=new Date(Date.now()+7*86400000); while ([0,6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate()+1);
  await incoming(textMessage('choose-day',date.toISOString().slice(0,10)));
  await incoming(textMessage('choose-slot','1'));
  await Promise.all([incoming(textMessage('confirm-a','CONFIRMAR')),incoming(textMessage('confirm-b','CONFIRMAR'))]);
  assert.equal(db.tables.crm_citas.length,1);
  db.tables.crm_pacientes[0].clinica_id='other-clinic';
  await incoming(textMessage('cross-clinic',date.toISOString().slice(0,10)));
  assert.equal(db.tables.crm_citas.length,1);
  assert.equal(db.tables.crm_mensajeria_eventos.at(-1).estado,'revision_manual');
}));
