import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createLocalQueryClient } from './local-query-client.mjs';

export async function testCalendarPersistence(db, cfg) {
  await db.exec('reset role');
  const patientId = (await db.query("insert into crm_pacientes(nombre,email,activo,created_by_profile_id,clinica_id) values('Calendar fixture','calendar-qa@example.invalid',true,$1,$2) returning id", [cfg.profile_id, cfg.clinic_id])).rows[0].id;
  const names = ['GOOGLE_CALENDAR_ID', 'W5_CALENDAR_READER_URL', 'W6_CALENDAR_WRITER_URL', 'N8N_WEBHOOK_SECRET', 'GOOGLE_CALENDAR_REQUIRED'];
  const previous = names.map(name => process.env[name]);
  Object.assign(process.env, { GOOGLE_CALENDAR_ID: 'fixture-calendar', W5_CALENDAR_READER_URL: 'https://reader.example/test', W6_CALENDAR_WRITER_URL: 'https://writer.example/test', N8N_WEBHOOK_SECRET: 'fixture-secret', GOOGLE_CALENDAR_REQUIRED: 'true' });
  const { default: router, createCrmAppointment } = await import('../backend/src/routes/professional.js?calendar-persistence');
  names.forEach((name, i) => previous[i] === undefined ? delete process.env[name] : process.env[name] = previous[i]);
  const { runWithRequestContext } = await import('../backend/src/lib/supabase.js');
  const base = createLocalQueryClient(db);
  let rejectLink = false, loseLinkAck = false, readHook = null, events = [], writerFails = true;
  const actions = [];
  const client = { from(table) {
    if (table === 'crm_perfiles') return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { id: cfg.profile_id, nombre_completo: 'Profesional ficticio', activo: true, clinica_id: cfg.clinic_id, crm_clinicas: { id: cfg.clinic_id, activo: true } } }; } };
    const query = base.from(table); let linking = false;
    const proxy = new Proxy(query, { get(target, key) {
      if (key === 'then') return async (resolve, reject) => {
        if (linking && rejectLink) return resolve({ error: { message: 'Synthetic link failure' } });
        const result = await target;
        if (linking && loseLinkAck && !result.error) { loseLinkAck = false; return resolve({ error: { message: 'Synthetic lost link acknowledgement' } }); }
        return Promise.resolve(result).then(resolve, reject);
      };
      return (...args) => { if (key === 'update' && args[0].calendar_sync_pending === false) linking = true; target[key](...args); return proxy; };
    } }); return proxy;
  } };
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (url === 'https://reader.example/test') {
      if (readHook) { const hook = readHook; readHook = null; await hook(); }
      return Response.json({ events, busy_events: [] });
    }
    assert.equal(url, 'https://writer.example/test', 'No external network');
    const body = JSON.parse(options.body); actions.push(body);
    const saved = (await db.query('select * from crm_citas where paciente_id=$1 and calendar_sync_pending=true order by created_at desc', [patientId])).rows;
    assert.equal(saved.length, 1, 'CRM appointment must be committed before Calendar');
    if (body.action !== 'cancel') assert.ok(body.description.includes(`CRM Appointment ID: ${saved[0].id}`));
    return writerFails ? new Response('', { status: 503 }) : Response.json({ ok: true, event_id: body.action === 'cancel' ? null : body.event_id || 'fixture-event' });
  };
  const invoke = async (path, method, body = {}, params = {}, query = {}) => {
    const handler = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
    await runWithRequestContext({ supabase: client }, () => handler({ body, params, query, auth: { profile_id: cfg.profile_id }, get: () => body.key }, res, error => { res.error = error; res.statusCode = error.status || 500; }));
    return res;
  };
  const slot = { patientId, professionalId: cfg.profile_id, startAt: '2041-04-09T09:00:00Z', endAt: '2041-04-09T10:00:00Z', reason: 'Fixture session', requestId: randomUUID() };
  const get = async id => (await db.query('select * from crm_citas where id=$1', [id])).rows[0];
  const clear = async () => { await db.query('delete from crm_citas where paciente_id=$1', [patientId]); actions.length = 0; events = []; };
  try {
    const failed = await runWithRequestContext({ supabase: client }, () => createCrmAppointment(slot));
    assert.equal(failed.calendar_sync.status, 'error');
    assert.equal((await get(failed.data.id)).calendar_sync_pending, true);
    assert.equal(failed.data.calendar_sync_state, 'calendar_pending');
    const blocked = await invoke('/appointments/:appointmentId', 'patch', { estado: 'cancelada' }, { appointmentId: failed.data.id });
    assert.equal(blocked.statusCode, 409); assert.equal(blocked.body.code, 'CALENDAR_CHECK_REQUIRED'); assert.equal(actions.length, 1);
    // A lost response may leave the remote event visible before its ID is linked.
    events = [{ id: 'unacknowledged-event', summary: 'Cita fisioterapia - Calendar fixture', description: actions[0].description, start: { dateTime: slot.startAt }, end: { dateTime: slot.endAt } }];
    const agenda = await invoke('/appointments', 'get', {}, {}, { desde: '2041-04-01T00:00Z', hasta: '2041-04-30T23:59Z' });
    assert.equal(agenda.statusCode, 200, agenda.error?.message); assert.equal(agenda.body.data.filter(row => row.id === failed.data.id).length, 1);
    assert.equal((await db.query('select count(*)::int n from crm_citas where paciente_id=$1', [patientId])).rows[0].n, 1, 'Read-back must not create another CRM appointment');
    await clear(); writerFails = false;
    const success = await runWithRequestContext({ supabase: client }, () => createCrmAppointment({ ...slot, requestId: randomUUID() }));
    assert.equal(success.calendar_sync.status, 'synced'); assert.equal((await get(success.data.id)).calendar_sync_pending, false);
    assert.equal((await get(success.data.id)).google_calendar_event_id, 'fixture-event');
    actions.length = 0; writerFails = true;
    const edited = await invoke('/appointments/:appointmentId', 'patch', { inicio_en: '2041-04-09T11:00Z', fin_en: '2041-04-09T12:00Z' }, { appointmentId: success.data.id });
    assert.equal(edited.statusCode, 200, edited.error?.message); assert.equal(edited.body.calendar_sync.status, 'error');
    const moved = await get(success.data.id); assert.equal(Date.parse(moved.inicio_en), Date.parse('2041-04-09T11:00Z')); assert.equal(moved.calendar_sync_pending, true);
    events = [{ id: 'fixture-event', summary: 'Cita fisioterapia - Calendar fixture', description: 'Motivo: Old session', start: { dateTime: slot.startAt }, end: { dateTime: slot.endAt } }];
    await invoke('/appointments', 'get', {}, {}, { desde: '2041-04-01T00:00Z', hasta: '2041-04-30T23:59Z' });
    assert.equal(Date.parse((await get(success.data.id)).inicio_en), Date.parse(moved.inicio_en), 'Old Calendar event must not undo a saved move');
    // Explicit fixture reset represents a verified operation, not a production retry endpoint.
    await db.query('update crm_citas set calendar_sync_pending=false where id=$1', [success.data.id]); events = []; actions.length = 0;
    const cancelled = await invoke('/appointments/:appointmentId', 'patch', { estado: 'cancelada' }, { appointmentId: success.data.id });
    assert.equal(cancelled.statusCode, 200); assert.equal((await get(success.data.id)).estado, 'cancelada'); assert.equal((await get(success.data.id)).calendar_sync_pending, true);
    assert.equal(actions[0].action, 'cancel');
    await clear(); writerFails = false; rejectLink = true;
    const unlinked = await runWithRequestContext({ supabase: client }, () => createCrmAppointment({ ...slot, requestId: randomUUID() }));
    assert.equal(unlinked.calendar_sync.status, 'error'); assert.equal((await get(unlinked.data.id)).calendar_sync_pending, true); assert.equal(actions.length, 1);
    rejectLink = false; await clear(); loseLinkAck = true;
    const lostLink = await runWithRequestContext({ supabase: client }, () => createCrmAppointment({ ...slot, requestId: randomUUID() }));
    assert.equal(lostLink.calendar_sync.status, 'error'); assert.equal((await get(lostLink.data.id)).google_calendar_event_id, 'fixture-event'); assert.equal(actions.length, 1);
    await clear(); writerFails = true;
    const publicBody = { key: randomUUID(), professional_id: cfg.profile_id, full_name: 'Calendar fixture', email: 'calendar-qa@example.invalid', start_at: slot.startAt, end_at: slot.endAt };
    const publicBooking = await invoke('/public-booking/appointments', 'post', publicBody);
    assert.equal(publicBooking.statusCode, 201); assert.equal((await get(publicBooking.body.data.id)).calendar_sync_pending, true);
    assert.equal((await invoke('/public-booking/appointments', 'post', publicBody)).statusCode, 200); assert.equal(actions.length, 1, 'A replay does not write Calendar again');
    await clear(); writerFails = false;
    const occupied = async () => db.query("insert into crm_citas(paciente_id,fisioterapeuta_id,inicio_en,fin_en,estado) values($1,$2,$3,$4,'confirmada')", [patientId, cfg.profile_id, slot.startAt, slot.endAt]);
    readHook = occupied;
    await assert.rejects(runWithRequestContext({ supabase: client }, () => createCrmAppointment({ ...slot, requestId: randomUUID() })), error => error.status === 409);
    assert.equal(actions.length, 0, 'Late SQL rejection must never mutate Calendar');
    await clear();
    const existing = await runWithRequestContext({ supabase: client }, () => createCrmAppointment({ ...slot, requestId: randomUUID() }));
    actions.length = 0;
    readHook = () => db.query("insert into crm_citas(paciente_id,fisioterapeuta_id,inicio_en,fin_en,estado) values($1,$2,'2041-04-09T13:00Z','2041-04-09T14:00Z','confirmada')", [patientId, cfg.profile_id]);
    const lateEdit = await invoke('/appointments/:appointmentId', 'patch', { inicio_en: '2041-04-09T13:00Z', fin_en: '2041-04-09T14:00Z' }, { appointmentId: existing.data.id });
    assert.equal(lateEdit.error?.code, '23P01'); assert.equal(actions.length, 0);
    assert.equal(Date.parse((await get(existing.data.id)).inicio_en), Date.parse(slot.startAt));
    await clear();
    console.log('PASS: Calendar follows CRM commit; uncertain writes retain appointments; reads never recreate/revert them; late SQL insert/update rejections never mutate Calendar.');
  } finally { globalThis.fetch = nativeFetch; await clear(); }
}
