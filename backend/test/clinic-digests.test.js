import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.BOOKING_EXTRA_HOLIDAYS = '';

const { serviceSupabase } = await import('../src/lib/supabase.js');
const {
  buildDigest, buildDailyAgenda, buildCalendarAlert, buildBonosPayments, buildReactivation, patientsToReactivate, shortName,
} = await import('../src/lib/clinic-digests.js');

const DAY = 86_400_000;
const ana = { nombre: 'Ana', apellidos: 'pérez Ficticia', activo: true, telefono: '+34611000000' };

// Minimal chainable fake: every filter is accepted and the table's rows come back as they are,
// so each test passes exactly the rows the query should return.
function withTables(tables, fn) {
  const previous = serviceSupabase.from;
  serviceSupabase.from = (table) => {
    const result = { data: tables[table] ?? [], error: null, count: (tables[table] ?? []).length };
    const chain = new Proxy({}, {
      get: (_t, prop) => {
        if (prop === 'then') return (resolve) => resolve(result);
        if (prop === 'maybeSingle') return async () => ({ data: result.data[0] ?? null, error: null });
        return () => chain;
      },
    });
    return chain;
  };
  return Promise.resolve(fn()).finally(() => { serviceSupabase.from = previous; });
}

const profile = { id: 'pro-1', clinica_id: 'cli-1', telegram_chat_id: '555' };

test('nombre corto: nombre e inicial, sin apellidos completos', () => {
  assert.equal(shortName(ana), 'Ana P.');
  assert.equal(shortName({}), 'Paciente');
});

test('agenda diaria: horas de Madrid, pendientes, fichas nuevas y avisos de la clínica', () => {
  const text = buildDailyAgenda({
    today: '2026-10-14',
    appointments: [
      { inicio_en: '2026-10-14T07:00:00Z', estado: 'confirmada', patient: ana },
      { inicio_en: '2026-10-14T13:00:00Z', estado: 'pendiente', patient: { nombre: 'Luis' }, newPatient: true },
    ],
    openRequests: 1, calendarPending: 0,
  });
  assert.match(text, /^Agenda de hoy, miércoles, 14 de octubre: 2 citas/);
  assert.match(text, /09:00 · Ana P\. · confirmada/);
  assert.match(text, /15:00 · Luis · pendiente de confirmar · ficha nueva por revisar/);
  assert.match(text, /1 por confirmar en Agenda; 1 solicitud de llamada en Inicio\./);
  assert.doesNotMatch(text, /Calendar/);
  assert.match(buildDailyAgenda({ today: '2026-10-14', appointments: [] }), /sin citas$/);
});

test('textos de Calendar, cobros y reactivación no incluyen datos clínicos', () => {
  const calendar = buildCalendarAlert([{ inicio_en: '2026-10-14T07:00:00Z', patient: ana }]);
  assert.match(calendar, /1 cita lleva más de 15 min/);
  const money = buildBonosPayments({
    bonos: [{ nombre: 'Bono 10', sesiones_total: 10, sesiones_usadas: 9, fecha_caducidad: null, patient: ana }],
    invoices: [{ numero: 'F-1', importe_total: 45, patient: ana }, { numero: 'F-2', importe_total: '30.5', patient: ana }],
  });
  assert.match(money, /Ana P\. · Bono 10 · 1 sesión/);
  assert.match(money, /Facturas sin cobrar: 2 \(75,50\s€\)/);
  const reactivation = buildReactivation([{ ...ana, lastVisit: '2026-09-01T08:00:00Z' }]);
  assert.match(reactivation, /no se ha escrito a ningún paciente/);
  for (const text of [calendar, money, reactivation]) assert.doesNotMatch(text, /Ficticia|dolor|diagn/i);
});

test('reactivación: solo sin cita futura, con última visita antigua y paciente activo', () => {
  const now = Date.parse('2026-10-14T10:00:00Z');
  const rows = [
    { paciente_id: 'a', inicio_en: new Date(now - 30 * DAY).toISOString(), patient: { nombre: 'Antigua' } },
    { paciente_id: 'b', inicio_en: new Date(now - 30 * DAY).toISOString(), patient: { nombre: 'ConFutura' } },
    { paciente_id: 'b', inicio_en: new Date(now + 2 * DAY).toISOString(), patient: { nombre: 'ConFutura' } },
    { paciente_id: 'c', inicio_en: new Date(now - 5 * DAY).toISOString(), patient: { nombre: 'Reciente' } },
    { paciente_id: 'd', inicio_en: new Date(now - 40 * DAY).toISOString(), patient: { nombre: 'Baja', activo: false } },
  ];
  assert.deepEqual(patientsToReactivate({ appointments: rows, now }).map(p => p.nombre), ['Antigua']);
});

test('buildDigest: tipo desconocido, sin chat del fisio y festivo no envían nada', async () => {
  await assert.rejects(buildDigest('otra_cosa', { professionalId: 'pro-1' }), { status: 404 });
  await withTables({ crm_perfiles: [{ ...profile, telegram_chat_id: null }] }, async () => {
    assert.deepEqual(await buildDigest('agenda_diaria', { professionalId: 'pro-1' }), { send: false, reason: 'sin_chat_profesional', count: 0 });
  });
  await withTables({ crm_perfiles: [profile] }, async () => {
    const result = await buildDigest('agenda_diaria', { professionalId: 'pro-1', now: Date.parse('2026-12-25T06:30:00Z') });
    assert.equal(result.send, false);
    assert.equal(result.reason, 'festivo');
  });
});

test('buildDigest: la agenda solo incluye las citas del día de Madrid y avisa de solicitudes abiertas', async () => {
  const now = Date.parse('2026-10-14T05:30:00Z'); // 07:30 en Madrid
  await withTables({
    crm_perfiles: [profile],
    crm_citas: [
      { id: '1', inicio_en: '2026-10-13T21:30:00Z', estado: 'confirmada', crm_pacientes: { nombre: 'Ayer' } }, // 23:30 del 13 en Madrid
      { id: '2', inicio_en: '2026-10-14T07:00:00Z', estado: 'pendiente', calendar_sync_pending: true,
        crm_pacientes: { nombre: 'Hoy', origen_alta: 'asistente_telegram', revisada_en: null } },
      { id: '3', inicio_en: '2026-10-14T22:30:00Z', estado: 'confirmada', crm_pacientes: { nombre: 'Mañana' } }, // 00:30 del 15
    ],
    crm_solicitudes_contacto: [{ id: 's' }],
  }, async () => {
    const result = await buildDigest('agenda_diaria', { professionalId: 'pro-1', now });
    assert.equal(result.send, true);
    assert.equal(result.chat_id, '555');
    assert.equal(result.count, 1);
    assert.match(result.text, /09:00 · Hoy · pendiente de confirmar · ficha nueva por revisar/);
    assert.doesNotMatch(result.text, /Ayer|Mañana/);
    assert.match(result.text, /1 solicitud de llamada en Inicio; 1 sin sincronizar con Google Calendar/);
  });
});

test('buildDigest: sin nada pendiente, Calendar, cobros y reactivación no molestan al fisio', async () => {
  await withTables({ crm_perfiles: [profile] }, async () => {
    for (const kind of ['calendar_pendiente', 'bonos_pagos', 'reactivacion']) {
      assert.deepEqual(await buildDigest(kind, { professionalId: 'pro-1' }), { send: false, reason: 'nada_pendiente', count: 0 });
    }
  });
});
