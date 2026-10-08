import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createLocalQueryClient } from './local-query-client.mjs';

// Real router, Google client request construction and SQL/RLS. Only Google/Auth transports are fixtures.
export async function testCalendarVerification(db, cfg) {
  const { JWT } = await import('../backend/node_modules/google-auth-library/build/src/index.js');
  const request = JWT.prototype.request, nativeFetch = globalThis.fetch;
  const env = { GOOGLE_CALENDAR_ID: 'fixture-calendar', GOOGLE_CLIENT_EMAIL: 'calendar@example.invalid', GOOGLE_PRIVATE_KEY: 'fixture-key', W5_CALENDAR_READER_URL: '', W6_CALENDAR_WRITER_URL: '' };
  const old = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  const { default: router, createCrmAppointment } = await import('../backend/src/routes/professional.js?calendar-verification');
  for (const [key, value] of Object.entries(old)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  const { runWithRequestContext } = await import('../backend/src/lib/supabase.js');
  const base = createLocalQueryClient(db), auth = { profile_id: cfg.profile_id, clinic_id: cfg.clinic_id };
  await db.exec('reset role');
  const patientId = (await db.query("insert into crm_pacientes(nombre,telefono,activo,created_by_profile_id,clinica_id) values('Calendar recovery fixture','+34000000000',true,$1,$2) returning id", [cfg.profile_id, cfg.clinic_id])).rows[0].id;
  let loseAck = true, rejectLink = false, loseLinkAck = false, readMode = 'normal', readHook = null, writeHook = null;
  const events = new Map(), mutations = [], reads = [];
  const client = { from(table) {
    if (table === 'crm_perfiles') return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { nombre_completo: 'Recovery professional' } }; } };
    const query = base.from(table); let linking = false;
    const proxy = new Proxy(query, { get(target, key) {
      if (key === 'then') return async (resolve, reject) => {
        if (linking && rejectLink) return resolve({ error: { message: 'Fixture link rejected' } });
        const result = await target;
        if (linking && loseLinkAck && !result.error) { loseLinkAck = false; return resolve({ error: { message: 'Fixture lost link acknowledgement' } }); }
        return Promise.resolve(result).then(resolve, reject);
      };
      return (...args) => { if (key === 'update' && args[0].calendar_sync_pending === false) linking = true; target[key](...args); return proxy; };
    } }); return proxy;
  } };
  const get = async id => (await db.query('select to_jsonb(c) row from crm_citas c where id=$1', [id])).rows[0]?.row;
  const invoke = async (path, method, id, body = {}, identity = auth) => {
    const handler = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
    const res = { statusCode: 200, headers: {}, set(k, v) { this.headers[k] = v; return this; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await runWithRequestContext({ supabase: client, auth: identity }, () => handler({ auth: identity, body, params: { appointmentId: id } }, res, error => { res.statusCode = error.status || 500; res.error = error; }));
    return res;
  };
  const check = async (id, version = null, identity = auth) => {
    const before = mutations.length;
    const res = await invoke('/appointments/:appointmentId/check-calendar', 'post', id, { updated_at: version || (await get(id))?.updated_at }, identity);
    assert.equal(mutations.length, before, 'Recovery never mutates Calendar');
    return res;
  };
  const slot = { patientId, professionalId: cfg.profile_id, startAt: '2042-04-09T09:00Z', endAt: '2042-04-09T10:00Z', reason: 'Recovery session' };
  const create = () => runWithRequestContext({ supabase: client, auth }, () => createCrmAppointment({ ...slot, requestId: randomUUID() }));
  const clear = async () => { await db.query('delete from crm_citas where paciente_id=$1', [patientId]); events.clear(); mutations.length = 0; reads.length = 0; readMode = 'normal'; };
  JWT.prototype.request = async function (options) {
    const url = new URL(options.url);
    assert.equal(url.origin, 'https://www.googleapis.com', 'Google fixture seam only');
    if (!url.pathname.includes('/calendars/fixture-calendar/events')) {
      assert.ok(url.pathname.includes(encodeURIComponent('es.spain#holiday@group.v.calendar.google.com')) && options.method === 'GET', 'Only the fixture holiday availability read is allowed');
      return { data: { items: [] } };
    }
    const id = url.pathname.split('/events/')[1];
    if (options.method !== 'GET') {
      const saved = (await db.query('select to_jsonb(c) row from crm_citas c where paciente_id=$1 and calendar_sync_pending=true', [patientId])).rows[0]?.row;
      assert.equal(saved?.calendar_sync_in_flight, true, 'Durable claim precedes the request');
      const eventId = id || `fixture-${saved.id}`;
      if (options.method === 'DELETE') events.set(eventId, { id: eventId, status: 'cancelled' });
      else { assert.ok(options.data.description.includes(`CRM Sync Operation: ${saved.calendar_sync_operation_id}`)); events.set(eventId, { ...options.data, id: eventId, status: 'confirmed' }); }
      mutations.push(options.method);
      if (writeHook) { const hook = writeHook; writeHook = null; await hook(saved.id); }
      if (loseAck) throw new Error('Fixture timeout AFTER Google wrote');
      return { data: { id: eventId } };
    }
    reads.push(options);
    const snapshot = id ? events.get(id) : [...events.values()];
    if (readHook) { const hook = readHook; readHook = null; await hook(); }
    if (readMode === 'timeout') throw new Error('Fixture read timeout');
    if (id) {
      if (readMode === 'missing' || !snapshot) throw { response: { status: 404 } };
      return { data: snapshot };
    }
    if (readMode === 'incomplete') return { data: {} };
    if (readMode === 'empty') return { data: { items: [] } };
    if (readMode === 'duplicate-page') return { data: options.params?.pageToken ? { items: [{ ...snapshot[0], id: 'duplicate' }] } : { items: snapshot, nextPageToken: 'page-2' } };
    return { data: { items: snapshot } };
  };
  globalThis.fetch = () => { throw new Error('External network blocked'); };
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [cfg.auth_user_id]);
    await db.exec('set role authenticated');
    assert.ok(router.stack.some(layer => layer.route?.path === '/appointments/:appointmentId/check-calendar'), 'Verified recovery endpoint must exist');
    writeHook = async id => { const before = reads.length; const during = await check(id); assert.equal(during.body.calendar_check.status, 'in_progress'); assert.equal(reads.length, before, 'Recovery does not inspect an active writer'); };
    const pending = await create(); const id = pending.data.id;
    assert.equal(pending.data.calendar_sync_pending, true); assert.equal((await get(id)).calendar_sync_in_flight, false);
    assert.equal((await invoke('/appointments/:appointmentId', 'patch', id, { estado: 'cancelada' })).statusCode, 409);
    for (const mode of ['empty', 'timeout', 'incomplete', 'duplicate-page']) { readMode = mode; assert.equal((await check(id)).body.calendar_check.status, 'pending'); assert.equal((await get(id)).calendar_sync_pending, true); }
    readMode = 'normal';
    const eventId = `fixture-${id}`, original = events.get(eventId);
    for (const changed of [{ ...original, summary: 'Another patient' }, { ...original, description: original.description.replace('Recovery session', 'Old session') }, { ...original, description: original.description.replace((await get(id)).calendar_sync_operation_id, randomUUID()) }]) {
      events.set(eventId, changed); assert.equal((await check(id)).body.calendar_check.status, 'pending');
    }
    events.set(eventId, original);
    assert.equal((await check(id, null, {})).statusCode, 403);
    assert.equal((await check(id, null, { ...auth, profile_id: randomUUID() })).statusCode, 404);
    rejectLink = true; assert.equal((await check(id)).body.calendar_check.status, 'pending'); rejectLink = false;
    loseLinkAck = true; assert.equal((await check(id)).body.calendar_check.status, 'pending');
    assert.equal((await get(id)).calendar_sync_pending, false);
    assert.equal((await check(id)).body.calendar_check.status, 'already_confirmed');
    assert.equal((await get(id)).google_calendar_event_id, eventId);
    // Move wrote remotely but lost its acknowledgement. Old read-back never undoes CRM.
    const moved = await invoke('/appointments/:appointmentId', 'patch', id, { inicio_en: '2042-04-09T11:00Z', fin_en: '2042-04-09T12:00Z' });
    assert.equal(moved.statusCode, 200, moved.error?.message); const newEvent = events.get(eventId);
    events.set(eventId, original); assert.equal((await check(id)).body.calendar_check.status, 'pending'); events.set(eventId, newEvent);
    const verified = await check(id); assert.equal(verified.body.calendar_check.status, 'verified'); assert.equal((await get(id)).calendar_sync_pending, false);
    const cancelled = await invoke('/appointments/:appointmentId', 'patch', id, { estado: 'cancelada' });
    assert.equal(cancelled.body.data.calendar_sync_pending, true);
    readMode = 'missing'; assert.equal((await check(id)).body.calendar_check.status, 'pending'); readMode = 'normal';
    assert.equal((await check(id)).body.calendar_check.status, 'verified'); assert.equal((await get(id)).google_calendar_event_id, null);
    await clear();
    // Legacy pending rows use the original payload without an operation reference.
    const legacy = await create(); const legacyId = legacy.data.id, legacyEvent = `fixture-${legacyId}`;
    events.set(legacyEvent, { ...events.get(legacyEvent), description: events.get(legacyEvent).description.replace(/\nCRM Sync Operation: [^\n]+/, '') });
    await db.query('update crm_citas set calendar_sync_operation_id=null,calendar_sync_calendar_id=null where id=$1', [legacyId]);
    assert.equal((await check(legacyId)).body.calendar_check.status, 'verified');
    await clear();
    // A current-version change while the reader waits defeats the final compare-and-set.
    const race = await create(); const staleVersion = (await get(race.data.id)).updated_at;
    readHook = () => db.query("update crm_citas set motivo='Newer CRM version' where id=$1", [race.data.id]);
    const stale = await check(race.data.id, staleVersion);
    // Change the marker alone on a subsequent test to exercise CAS rather than a mismatching payload.
    assert.equal(stale.statusCode,409); assert.equal(stale.body.code,'APPOINTMENT_CHANGED');
    assert.equal((await get(race.data.id)).calendar_sync_pending, true);
    const current = await get(race.data.id); events.set(`fixture-${race.data.id}`, { ...events.get(`fixture-${race.data.id}`), description: events.get(`fixture-${race.data.id}`).description.replace('Recovery session', 'Newer CRM version') });
    readHook = () => db.query('update crm_citas set calendar_sync_in_flight=true where id=$1', [race.data.id]);
    const raced = await check(race.data.id, current.updated_at); assert.equal(raced.statusCode, 409); assert.equal(raced.body.code, 'APPOINTMENT_CHANGED');
    assert.equal((await get(race.data.id)).calendar_sync_pending, true);
    assert.equal((await check(race.data.id, staleVersion)).statusCode, 409);
    await clear();
    console.log('PASS: verified Calendar recovery links lost create IDs, confirms moves/cancellation and preserves legacy rows; empty/incomplete/duplicate/timeout/in-flight/stale/unauthorized checks stay locked. No Calendar mutation during recovery.');
  } finally { JWT.prototype.request = request; globalThis.fetch = nativeFetch; await db.exec('reset role'); await clear(); await db.query('delete from crm_pacientes where id=$1', [patientId]); }
}
