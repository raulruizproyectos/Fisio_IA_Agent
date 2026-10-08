import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
for (const name of ['GOOGLE_CALENDAR_ID', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'W5_CALENDAR_READER_URL', 'W6_CALENDAR_WRITER_URL']) delete process.env[name];
const { default: router } = await import('../src/routes/professional.js');
const { runWithRequestContext } = await import('../src/lib/supabase.js');

async function invoke(route, db, query = {}, selectedRouter = router, body = {}) {
  const handler = selectedRouter.stack.find(layer => layer.route?.path === route).route.stack[0].handle;
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await runWithRequestContext({ supabase: db }, () => handler({ query, body, auth: { profile_id: 'profile-a' } }, res, error => { throw error; }));
  return res.body;
}

test('el total de planes es independiente del limite de la lista reciente', async () => {
  let exactCount = false;
  const db = { from(table) {
    return { select(_columns, options) { if (table === 'crm_recomendaciones') exactCount = options?.count === 'exact'; return this; },
      eq() { return this; }, in() { return this; }, order() { return this; }, limit() { return this; },
      then(resolve) { return Promise.resolve({ data: table === 'crm_recomendaciones'
        ? [{ id: 'rec-a', paciente_id: 'patient-a', estado: 'requiere_revision', crm_recomendacion_items: [] }]
        : [], count: table === 'crm_recomendaciones' ? 82 : null }).then(resolve); },
    };
  } };
  const payload = await invoke('/program-library', db, { profesional_id: 'profile-a', limit: '1' });
  assert.equal(exactCount, true);
  assert.equal(payload.data.summary.total_plans, 82);
  assert.equal(payload.data.summary.visible_plans, 1);
  assert.equal(payload.data.recent_plans.length, 1);
});

test('sin Calendar configurado la agenda conserva las citas CRM y no intenta reconciliarlas', async () => {
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = () => assert.fail('No debe consultar Calendar sin configuración');
  const appointment = { id: 'appointment-a', fisioterapeuta_id: 'profile-a', paciente_id: 'patient-a', estado: 'confirmada',
    inicio_en: '2026-10-07T09:00:00Z', fin_en: '2026-10-07T10:00:00Z', google_calendar_event_id: 'old-link' };
  const db = { from(table) {
    return { select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; }, gte() { return this; }, lte() { return this; },
      async maybeSingle() { return { data: { id: 'profile-a' } }; },
      update() { assert.fail('La lectura no debe modificar citas'); },
      then(resolve) { return Promise.resolve({ data: table === 'crm_citas' ? [appointment] : [] }).then(resolve); },
    };
  } };
  try {
    const status = await invoke('/appointments/sync-calendar/status', db);
    assert.equal(status.data.enabled, false);
    const payload = await invoke('/appointments', db, { desde: '2026-10-05T00:00:00Z', hasta: '2026-10-10T00:00:00Z' });
    assert.equal(payload.calendar_sync.enabled, false);
    assert.equal(payload.data.length, 1);
    assert.equal(payload.data[0].estado, 'confirmada');
  } finally { globalThis.fetch = nativeFetch; }
});

test('un error o respuesta incompleta de Calendar conserva citas y bloquea sincronizacion y nuevas reservas', async () => {
  process.env.GOOGLE_CALENDAR_ID = 'test-calendar';
  process.env.W5_CALENDAR_READER_URL = 'https://calendar-reader.example/test';
  const { default: connectedRouter } = await import('../src/routes/professional.js?reader-failure');
  delete process.env.GOOGLE_CALENDAR_ID;
  delete process.env.W5_CALENDAR_READER_URL;
  const nativeFetch = globalThis.fetch;
  const db = { from(table) {
    return { select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; }, gte() { return this; }, lte() { return this; },
      lt() { return this; }, gt() { return this; }, in() { return this; },
      async maybeSingle() { return { data: { id: 'profile-a' } }; },
      update() { assert.fail('Un fallo del lector no autoriza cambios de citas'); },
      then(resolve) { return Promise.resolve({ data: table === 'crm_citas' ? [{ id: 'appointment-a', estado: 'confirmada', google_calendar_event_id: 'old-link', inicio_en: '2026-10-07T09:00:00Z' }] : [] }).then(resolve); },
    };
  } };
  try {
    for (const response of [() => new Response('', { status: 503 }), () => Response.json({})]) {
      globalThis.fetch = response;
      const payload = await invoke('/appointments', db, { desde: '2026-10-05T00:00:00Z', hasta: '2026-10-10T00:00:00Z' }, connectedRouter);
      assert.equal(payload.data[0].estado, 'confirmada');
      assert.equal(payload.calendar_sync.enabled, true);
      assert.equal(payload.calendar_sync.available, false);
      await assert.rejects(invoke('/appointments/sync-calendar', db, {}, connectedRouter), error => error.status === 503);
      await assert.rejects(invoke('/appointments/check-availability', db, {}, connectedRouter,
        { inicio_en: '2026-10-07T11:00:00Z', fin_en: '2026-10-07T12:00:00Z' }), error => error.status === 503);
    }
  } finally { globalThis.fetch = nativeFetch; }
});

test('un INSERT rechazado nunca crea ni cancela eventos de Calendar',async()=>{
  Object.assign(process.env,{GOOGLE_CALENDAR_ID:'test-calendar',W5_CALENDAR_READER_URL:'https://reader.example/test',W6_CALENDAR_WRITER_URL:'https://writer.example/test',N8N_WEBHOOK_SECRET:'test-secret'});
  const {createCrmAppointment}=await import('../src/routes/professional.js?compensation-safety');
  for(const key of ['GOOGLE_CALENDAR_ID','W5_CALENDAR_READER_URL','W6_CALENDAR_WRITER_URL','N8N_WEBHOOK_SECRET'])delete process.env[key];
  const nativeFetch=globalThis.fetch,actions=[];
  globalThis.fetch=async(url,options)=>{
    if(url.startsWith('https://reader.example/'))return Response.json({events:[],busy_events:[]});
    assert.equal(url,'https://writer.example/test');actions.push(JSON.parse(options.body).action);
    return Response.json({ok:true,event_id:'new-event'});
  };
  let rejection,eventAlreadySaved=false;
  const db={from(table){let inserting=false;return {
    select(){return this;},eq(){return this;},in(){return this;},lt(){return this;},gt(){return this;},
    insert(){inserting=true;return this;},single(){return this;},
    async maybeSingle(){return {data:table==='crm_citas' ? (eventAlreadySaved ? {id:'saved-appointment'} : null) : table==='crm_pacientes'?{nombre:'Fixture',telefono:'600000000'}:{nombre_completo:'Profesional ficticio'}};},
    then(resolve){return Promise.resolve(inserting?{error:rejection}:{data:[]}).then(resolve);},
  };}};
  const body={patientId:'patient-a',professionalId:'profile-a',startAt:'2040-04-09T09:00Z',endAt:'2040-04-09T10:00Z'};
  try {
    rejection={message:'Response lost'};
    await assert.rejects(runWithRequestContext({supabase:db},()=>createCrmAppointment(body)));
    assert.deepEqual(actions,[]);
    rejection={code:'23P01',message:'Overlap'};
    await assert.rejects(runWithRequestContext({supabase:db},()=>createCrmAppointment(body)),error=>error.status===409);
    assert.deepEqual(actions,[]);
    eventAlreadySaved=true;
    await assert.rejects(runWithRequestContext({supabase:db},()=>createCrmAppointment(body)));
    assert.deepEqual(actions,[]);
    await assert.rejects(runWithRequestContext({supabase:db},()=>createCrmAppointment({...body,googleCalendarEventId:'existing-event'})));
    assert.deepEqual(actions,[]);
  } finally {globalThis.fetch=nativeFetch;}
});
