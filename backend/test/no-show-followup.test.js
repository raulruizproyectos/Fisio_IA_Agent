import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.BOOKING_EXTRA_HOLIDAYS = '';
process.env.MESSAGING_PILOT_CLINIC_ID = '11111111-1111-4111-8111-111111111111';
process.env.MESSAGING_PILOT_PROFESSIONAL_ID = '22222222-2222-4222-8222-222222222222';

const { serviceSupabase } = await import('../src/lib/supabase.js');
const { buildDigest } = await import('../src/lib/clinic-digests.js');
const {
  buildNoShowDigest, followUpCode, followUpCommand, followUpText, noShowFollowUps, sendNoShowFollowUp, FOLLOW_UP_SESSION,
} = await import('../src/lib/no-show-followup.js');

// 2026-10-14 10:00 in Madrid; "yesterday" is Tuesday 13 October.
const NOW = Date.parse('2026-10-14T08:00:00Z');
const APPT = 'ab12cd34-ef56-4a00-8b00-000000000001';
const ana = { nombre: 'Ana', apellidos: 'pérez Ficticia', activo: true, telefono: '+34611000000' };
const noShow = { id: APPT, paciente_id: 'pac-1', inicio_en: '2026-10-13T14:00:00Z', crm_pacientes: ana };
const link = { paciente_id: 'pac-1', chat_id: '777', consentimiento_en: '2026-10-01T00:00:00Z', baja_en: null };
const profile = { id: process.env.MESSAGING_PILOT_PROFESSIONAL_ID, clinica_id: process.env.MESSAGING_PILOT_CLINIC_ID, telegram_chat_id: '555' };

// Chainable fake: each `from(table)` takes the next queued result for that table (the last one repeats).
// Inserts and updates are recorded so the tests can check the idempotency claim.
function withTables(tables, fn) {
  const previous = serviceSupabase.from;
  const writes = [];
  serviceSupabase.from = (table) => {
    const queue = tables[table] ?? [[]];
    const next = queue.length > 1 ? queue.shift() : queue[0];
    let result = Array.isArray(next) ? { data: next, error: null } : next;
    const chain = new Proxy({}, {
      get: (_t, prop) => {
        if (prop === 'then') return (resolve) => resolve(result);
        if (prop === 'maybeSingle' || prop === 'single') return async () => ({ data: Array.isArray(result.data) ? result.data[0] ?? null : result.data, error: result.error });
        if (prop === 'insert' || prop === 'update') return (payload) => { writes.push({ table, op: prop, payload }); return chain; };
        return () => chain;
      },
    });
    return chain;
  };
  return Promise.resolve(fn(writes)).finally(() => { serviceSupabase.from = previous; });
}

test('comando corto y pulsable en Telegram', () => {
  assert.equal(followUpCode(APPT), 'ab12cd34ef56');
  assert.equal(followUpCommand(APPT), '/seguimiento_ab12cd34ef56');
  assert.ok(followUpCommand(APPT).length <= 32);
});

test('texto al paciente: nombre y día, sin datos clínicos', () => {
  assert.equal(followUpText({ patient: ana, startAt: noShow.inicio_en, now: NOW }),
    'Hola, Ana. Ayer te echamos de menos en tu cita de fisioterapia. Si quieres, puedes reservar una nueva cita aquí mismo: escribe /reservar o pulsa el botón.');
  assert.match(followUpText({ patient: {}, startAt: noShow.inicio_en, now: NOW + 2 * 86_400_000 }), /^Hola\. El martes 13 de octubre te echamos de menos/);
});

test('estado de cada ausencia: enviar, ya tiene cita, sin Telegram o ya enviado', () => {
  const rows = [
    { id: 'a', paciente_id: 'p1', patient: ana },
    { id: 'b', paciente_id: 'p2', patient: ana },
    { id: 'c', paciente_id: 'p3', patient: ana },
    { id: 'd', paciente_id: 'p4', patient: ana },
    { id: 'e', paciente_id: 'p5', patient: { ...ana, activo: false } },
  ];
  const items = noShowFollowUps({
    noShows: rows,
    futureAppointments: [{ paciente_id: 'p2', inicio_en: '2026-10-21T08:00:00Z' }, { paciente_id: 'p2', inicio_en: '2026-10-20T08:00:00Z' }],
    links: [{ ...link, paciente_id: 'p1' }, { ...link, paciente_id: 'p2' }, { ...link, paciente_id: 'p3', baja_en: '2026-10-02' }, { ...link, paciente_id: 'p4' }],
    sentIds: ['d'],
  });
  assert.deepEqual(items.map(i => [i.id, i.status]), [['a', 'enviar'], ['b', 'tiene_cita'], ['c', 'sin_telegram'], ['d', 'enviado']]);
  assert.equal(items[1].nextStart, '2026-10-20T08:00:00Z');
});

test('resumen al fisio: comando por ausencia y nada enviado hasta pulsarlo', () => {
  const text = buildNoShowDigest({ day: '2026-10-13', items: [
    { id: APPT, inicio_en: noShow.inicio_en, patient: ana, status: 'enviar' },
    { id: 'x', inicio_en: '2026-10-13T16:00:00Z', patient: { nombre: 'Luis' }, status: 'sin_telegram' },
  ] });
  assert.match(text, /^Ausencias de ayer, martes 13 de octubre: 2/);
  assert.match(text, /16:00 · Ana P\. → \/seguimiento_ab12cd34ef56/);
  assert.match(text, /18:00 · Luis · sin Telegram vinculado/);
  assert.match(text, /«Hola, Ana\. Ayer te echamos de menos/);
  assert.match(text, /Hasta entonces no se escribe a nadie\.$/);
});

test('buildDigest no_show: solo las ausencias de ayer; sin ausencias no hay mensaje', async () => {
  await withTables({
    crm_perfiles: [[profile]],
    crm_citas: [[noShow, { ...noShow, id: 'old', inicio_en: '2026-10-12T14:00:00Z' }], []],
    crm_mensajeria_vinculos: [[link]],
    crm_mensajeria_eventos: [[]],
  }, async () => {
    const out = await buildDigest('no_show', { professionalId: profile.id, now: NOW });
    assert.equal(out.send, true);
    assert.equal(out.count, 1);
    assert.equal(out.chat_id, '555');
  });
  await withTables({ crm_perfiles: [[profile]], crm_citas: [[]] }, async () => {
    assert.deepEqual(await buildDigest('no_show', { professionalId: profile.id, now: NOW }), { send: false, reason: 'nada_pendiente', count: 0 });
  });
});

const sendTables = (extra = {}) => ({
  crm_perfiles: [[profile]],
  crm_citas: [[noShow], []],
  crm_mensajeria_vinculos: [[link]],
  crm_mensajeria_eventos: [[], { data: { id: 'evt' }, error: null }],
  ...extra,
});

test('envío: solo desde el chat del fisio y una sola vez', async () => {
  const sent = [];
  const send = async (chat, text) => { sent.push({ chat, text }); };
  await withTables(sendTables(), async () => {
    assert.match(await sendNoShowFollowUp({ chatId: '999', command: followUpCommand(APPT), send, now: NOW }), /solo está disponible para el fisioterapeuta/);
  });
  assert.equal(sent.length, 0);

  await withTables(sendTables(), async (writes) => {
    const answer = await sendNoShowFollowUp({ chatId: '555', command: `${followUpCommand(APPT)}@FisioIA_Agent_bot`, send, now: NOW });
    assert.equal(answer, 'Seguimiento enviado a Ana P.; si responde, el agente de citas le ayudará a reservar.');
    const claim = writes.find(w => w.op === 'insert');
    assert.equal(claim.payload.session_id, FOLLOW_UP_SESSION);
    assert.equal(claim.payload.message_id, APPT);
    assert.deepEqual(writes.filter(w => w.op === 'update').map(w => w.payload.estado), ['procesado']);
  });
  assert.deepEqual(sent, [{ chat: '777', text: followUpText({ patient: ana, startAt: noShow.inicio_en, now: NOW }) }]);

  // A repeated tap loses the unique claim and sends nothing.
  await withTables(sendTables({ crm_mensajeria_eventos: [[], { data: null, error: { code: '23505' } }] }), async () => {
    assert.match(await sendNoShowFollowUp({ chatId: '555', command: followUpCommand(APPT), send, now: NOW }), /Ya enviaste el seguimiento a Ana P\./);
  });
  assert.equal(sent.length, 1);
});

test('envío: no escribe si ya tiene otra cita, sin vínculo, código desconocido o ausencia caducada', async () => {
  let calls = 0;
  const send = async () => { calls += 1; };
  await withTables(sendTables({ crm_citas: [[noShow], [{ paciente_id: 'pac-1', inicio_en: '2026-10-20T08:00:00Z' }]] }), async () => {
    assert.match(await sendNoShowFollowUp({ chatId: '555', command: followUpCommand(APPT), send, now: NOW }), /ya tiene cita el 20 oct/);
  });
  await withTables(sendTables({ crm_mensajeria_vinculos: [[]] }), async () => {
    assert.match(await sendNoShowFollowUp({ chatId: '555', command: followUpCommand(APPT), send, now: NOW }), /no tiene Telegram vinculado; si quieres, llámale al \+34611000000/);
  });
  await withTables(sendTables(), async () => {
    assert.match(await sendNoShowFollowUp({ chatId: '555', command: '/seguimiento_000000000000', send, now: NOW }), /No encuentro esa ausencia/);
    assert.equal(await sendNoShowFollowUp({ chatId: '555', command: '/seguimiento_xyz', send, now: NOW }), 'Comando de seguimiento no válido.');
  });
  assert.equal(calls, 0);
});

test('envío: si Telegram falla, queda en revisión manual y no se repite', async () => {
  await withTables(sendTables(), async (writes) => {
    const answer = await sendNoShowFollowUp({ chatId: '555', command: followUpCommand(APPT), send: async () => { throw new Error('timeout'); }, now: NOW });
    assert.match(answer, /No he podido confirmar el envío a Ana P\.; no lo repetiré/);
    assert.deepEqual(writes.filter(w => w.op === 'update').map(w => w.payload.estado), ['revision_manual']);
  });
});
