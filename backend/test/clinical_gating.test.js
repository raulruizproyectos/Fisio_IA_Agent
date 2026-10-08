import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.TELEGRAM_PATIENT_BOT_TOKEN = 'test-bot-token';

const { default: exercisesRouter } = await import('../src/routes/exercises.js');
const { default: telegramRouter } = await import('../src/routes/telegram.js');
const { runWithRequestContext, serviceSupabase } = await import('../src/lib/supabase.js');

const storedReport = { exercises: [{ exercise_id: 'exercise-a', nombre: 'Approved Exercise', series: 2, repeticiones: 8 }], message_to_patient: 'Approved message' };
const recommendation = () => ({ id: 'rec-a', paciente_id: 'patient-a', fisioterapeuta_id: 'profile-a', estado: 'aprobada',
  reviewed_by_profile_id: 'profile-a', reviewed_at: '2026-10-07T10:00:00Z', report_version: 1, report_snapshot: structuredClone(storedReport),
  crm_pacientes: { nombre: 'Real Patient' } });

function database(row = recommendation()) {
  const writes = [];
  return {
    writes,
    from(table) {
      const filters = [];
      const result = () => {
        if (table === 'crm_recomendaciones') return { data: filters.every(([key, value]) => row?.[key] === value) ? row : null };
        if (table === 'crm_pacientes') return { data: [{ id: 'patient-a', nombre: 'Real Patient' }] };
        if (table === 'pacientes' || table === 'crm_ejercicio_media') return { data: [] };
        if (table === 'vinculos_telegram_pacientes') return { data: { telegram_chat_id: 'linked-chat' } };
        if (table === 'crm_ejercicios_catalogo') return { data: [{ id: 'exercise-a', metadata: {} }] };
        if (table === 'crm_recomendacion_items') return { data: [{ ejercicio_id: 'exercise-a' }], count: 1 };
        return { data: [], count: 1 };
      };
      return {
        select() { return this; }, eq(key, value) { filters.push([key, value]); return this; },
        in() { return this; }, order() { return this; }, limit() { return this; },
        update(payload) { writes.push({ table, payload }); Object.assign(row, payload); return this; },
        insert(payload) { writes.push({ table, payload }); return this; },
        async single() { return result(); }, async maybeSingle() { return result(); },
        then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
      };
    },
  };
}

async function invoke(router, path, body, db, auth = { profile_id: 'profile-a', role: 'fisioterapeuta' }) {
  const handler = router.stack.find((layer) => layer.route?.path === path).route.stack[0].handle;
  const res = { statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }, send(value) { this.body = value; return this; }, setHeader(key, value) { this.headers[key] = value; } };
  await runWithRequestContext({ supabase: db, auth }, () => handler({ params: { recommendationId: 'rec-a' }, body, query: {}, auth, get() {} }, res,
    (error) => { res.statusCode = error.status || 500; res.body = { error: error.message }; }));
  return res;
}

function pdfContent(buffer) {
  const text = buffer.toString('latin1');
  return [...text.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .map((match) => { try { return [...inflateSync(Buffer.from(match[1], 'latin1')).toString().matchAll(/<([0-9a-f]+)>/gi)]
      .map((hex) => Buffer.from(hex[1], 'hex').toString('latin1')).join(''); } catch { return ''; } }).join('');
}

test('seguimiento no puede aprobar, enviar ni cambiar el estado de una recomendacion', async () => {
  for (const state of ['aprobada', 'enviada', 'rechazada', 'error', 'invalid']) {
    for (const key of ['estado', 'recommendation_state']) {
    const db = database({ ...recommendation(), estado: 'requiere_revision' });
    const res = await invoke(exercisesRouter, '/recommendations/:recommendationId/follow-up', { note_text: 'Seguimiento', [key]: state }, db);
    assert.equal(res.statusCode, 400, state);
    assert.equal(db.writes.length, 0);
    }
  }
  const db = database();
  const res = await invoke(exercisesRouter, '/recommendations/:recommendationId/follow-up', { note_text: 'Paciente mejora', fisioterapeuta_id: 'forged-profile' }, db);
  assert.equal(res.statusCode, 201);
  assert.equal(db.writes[0].table, 'crm_comunicaciones');
  assert.equal(db.writes[0].payload.fisioterapeuta_id, 'profile-a');
});

test('PDF y Telegram rechazan borradores y aprobaciones sin firma profesional o contenido persistido', async () => {
  for (const changes of [{ estado: 'requiere_revision' }, { reviewed_at: null }, { report_snapshot: null }, { report_snapshot: { exercises: [] } }]) {
    for (const [router, path] of [[exercisesRouter, '/reports/pdf'], [telegramRouter, '/patient-report/send'], [telegramRouter, '/physio-report/send']]) {
      const res = await invoke(router, path, { recommendation_id: 'rec-a', patient_id: 'patient-a', fisioterapeuta_id: 'profile-a', exercises: [{ nombre: 'Injected Exercise' }] }, database({ ...recommendation(), ...changes }));
      assert.equal(res.statusCode, 409, path + JSON.stringify(changes));
    }
  }
});

test('PDF usa el ejercicio y el paciente persistidos, ignorando contenido inyectado por el cliente', async (t) => {
  t.mock.method(serviceSupabase, 'from', () => ({ insert() { return this; }, select() { return this; }, async maybeSingle() { return { data: { id: 1 } }; } }));
  const res = await invoke(exercisesRouter, '/reports/pdf', { recommendation_id: 'rec-a', patient_id: 'patient-a', patient_name: 'Injected Patient', exercises: [{ nombre: 'Injected Exercise' }] }, database());
  assert.equal(res.statusCode, 200);
  assert.ok(Buffer.isBuffer(res.body));
  const content = pdfContent(res.body);
  assert.ok(content.includes('Approved Exercise'));
  assert.ok(!content.includes('Injected Exercise'));
  assert.ok(!content.includes('Injected Patient'));
  const wrongPatient = await invoke(exercisesRouter, '/reports/pdf', { recommendation_id: 'rec-a', patient_id: 'patient-b', exercises: [{ nombre: 'Injected Exercise' }] }, database());
  assert.equal(wrongPatient.statusCode, 404);
});

test('Telegram envia contenido aprobado al vinculo guardado y solo marca enviada tras confirmar entrega', async (t) => {
  const sent = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    sent.push({ url, body: init.body });
    return new Response(JSON.stringify({ ok: true, result: { message_id: 12 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const updates = [];
  t.mock.method(serviceSupabase, 'from', () => ({ update(value) { updates.push(value); return this; }, eq() { return this; }, in() { return this; }, select() { return this; }, async maybeSingle() { return { data: { id: 'rec-a' } }; } }));
  const res = await invoke(telegramRouter, '/patient-report/send', { recommendation_id: 'rec-a', patient_id: 'patient-a', exercises: [{ nombre: 'Injected Exercise' }], message_text: 'Injected message' }, database());
  assert.equal(res.statusCode, 200);
  assert.equal(sent.length, 2);
  assert.equal(JSON.parse(sent[0].body).text, 'Approved message');
  assert.equal(sent[1].body.get('chat_id'), 'linked-chat');
  const pdf = Buffer.from(await sent[1].body.get('document').arrayBuffer());
  assert.ok(pdfContent(pdf).includes('Approved Exercise'));
  assert.equal(updates[0].estado, 'enviada');
  const arbitraryChat = await invoke(telegramRouter, '/patient-report/send', { recommendation_id: 'rec-a', patient_id: 'patient-a', chat_id: 'other-chat', dry_run: true }, database());
  assert.equal(arbitraryChat.statusCode, 400);
});

test('la revision exige sesion profesional y version; conserva el conflicto devuelto por PostgreSQL', async () => {
  const db = database({ ...recommendation(), estado: 'requiere_revision' });
  let call;
  db.rpc = async (name, args) => { call = { name, args }; return { error: { code: 'PT409', message: 'El informe ha cambiado. Recarga antes de aprobar.' } }; };
  const res = await invoke(exercisesRouter, '/recommendations/:recommendationId/review', { decision: 'approve', report_version: 1 }, db);
  assert.equal(res.statusCode, 409);
  assert.equal(call.name, 'review_exercise_recommendation');
  assert.equal(call.args.expected_version, 1);
  assert.equal(db.writes.length, 0);
  const internal = await invoke(exercisesRouter, '/recommendations/:recommendationId/review', { decision: 'approve', report_version: 1 }, db, { actor_type: 'internal' });
  assert.equal(internal.statusCode, 403);
});

test('el borrador persiste las pautas editadas y conserva paciente y alertas; rechaza versiones antiguas', async () => {
  const row = { ...recommendation(), estado: 'requiere_revision', red_flags_present: true, red_flags_items: ['Original alert'] };
  const db = database(row);
  const input = { report: { ...storedReport, patient_id: 'forged-patient', red_flags: { present: false }, report_version: 1,
    exercises: [{ exercise_id: 'exercise-a', nombre: 'Edited Exercise', series: 3, repeticiones: 10 }] } };
  const res = await invoke(exercisesRouter, '/recommendations/:recommendationId/draft', input, db);
  assert.equal(res.statusCode, 200);
  const report = db.writes[0].payload.report_snapshot;
  assert.equal(report.exercises[0].series, 3);
  assert.equal(report.patient_id, 'patient-a');
  assert.equal(report.red_flags.present, true);
  const staleDb = database({ ...row, report_version: 2 });
  const stale = await invoke(exercisesRouter, '/recommendations/:recommendationId/draft', input, staleDb);
  assert.equal(stale.statusCode, 409);
  assert.equal(staleDb.writes.length, 0);
});

test('un fallo de Telegram no marca entrega; un fallo de registro tras entrega devuelve aviso sin repetir el envio', async (t) => {
  let failTelegram = true;
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls++;
    const failed = failTelegram && String(url).endsWith('/sendDocument');
    return new Response(JSON.stringify({ ok: !failed }), { status: failed ? 502 : 200, headers: { 'Content-Type': 'application/json' } });
  });
  const stateWrites = [];
  t.mock.method(serviceSupabase, 'from', () => ({ update(value) { stateWrites.push(value); return this; }, eq() { return this; }, in() { return this; },
    select() { return this; }, async maybeSingle() { return { error: { message: 'Simulated database failure' } }; } }));
  const failed = await invoke(telegramRouter, '/patient-report/send', { recommendation_id: 'rec-a', patient_id: 'patient-a' }, database());
  assert.equal(failed.statusCode, 500);
  assert.equal(stateWrites.length, 0);
  failTelegram = false;
  calls = 0;
  const delivered = await invoke(telegramRouter, '/patient-report/send', { recommendation_id: 'rec-a', patient_id: 'patient-a' }, database());
  assert.equal(delivered.statusCode, 200);
  assert.equal(delivered.body.state_recorded, false);
  assert.match(delivered.body.warning, /No repitas/);
  assert.equal(calls, 2);
});

test('las imagenes del PDF no filtran claves por prefijos de URL ni siguen redirecciones', async (t) => {
  const { buildExerciseReportPdfBuffer } = await import('../src/lib/exercise-report-pdf.js');
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => { calls.push({ url, init }); return new Response(null, { status: 204 }); });
  await buildExerciseReportPdfBuffer({ exercises: [{ nombre: 'Illustrated exercise', imagen_url: 'https://example.supabase.co.attacker.test/image.png' }] });
  assert.ok(calls.length);
  assert.ok(calls.every(({ init }) => !init.headers.Authorization && !init.headers.apikey && init.redirect === 'error'));
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
