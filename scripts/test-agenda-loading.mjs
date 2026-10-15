import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const { transpileModule } = createRequire(new URL('../frontend/package.json', import.meta.url))('typescript');
const source = readFileSync(new URL('../frontend/src/pages/index.astro', import.meta.url), 'utf8');
const start = source.indexOf('  const loadCitas = async () => {');
const end = source.indexOf('  let agendaAutoRefreshHandle', start);
assert.ok(start >= 0 && end > start);
const code = source.slice(start, end) + '\nglobalThis.load = loadCitas;';
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
for (const oldFails of [false, true]) {
  const requests = [], renders = [], errors = [], nodes = new Map();
  const ui = {
    agendaLoadVersion: 0, agendaWeekStart: new Date('2026-10-12T00:00:00Z'), latestAgendaAppointments: [],
    BACKEND_BASE: 'http://fixture.invalid', PROF_ID: 'professional', isDevMode: false,
    citasBody: null, agendaMobileList: null, agendaMobileSummary: null, agendaCalendarMeta: null, dashCitasBody: {},
    document: { getElementById(id) { if (!nodes.has(id)) nodes.set(id, {}); return nodes.get(id); } },
    fetchJson(url) {
      if (url.includes('/sync-calendar/status')) return Promise.resolve({ data: {} });
      const task = deferred(); requests.push({ ...task, url }); return task.promise;
    },
    setTableState() {}, setListState() {}, getOperationalAgendaAppointments: rows => rows,
    summarizeCalendarOnlyBlocks: () => ({ total: 0 }), renderAgendaSyncStatus: payload => { if (payload.ui_status === 'error') errors.push(payload); },
    renderAgendaCalendarMeta() {}, renderDashboardCitas: rows => renders.push(rows.map(row => row.id)),
    isAllDayAppointment: () => false, isTodayDate: () => false,
    renderAgendaCalendar(rows, week) { ui.renderedWeek = week.toISOString(); }, renderAgendaMobileTimeline() {},
    getVisibleAgendaPatientCount: rows => rows.length,
  };
  runInNewContext(transpileModule(code, {}).outputText, ui);
  const older = ui.load();
  ui.agendaWeekStart = new Date('2026-10-19T00:00:00Z');
  const current = ui.load();
  requests[1].resolve({ data: [{ id: 'current', inicio_en: '2026-10-19T10:00:00Z' }] });
  await current;
  if (oldFails) requests[0].reject(new Error('Old request failed'));
  else requests[0].resolve({ data: [{ id: 'old', inicio_en: '2026-10-12T10:00:00Z' }] });
  await older;
  assert.equal(ui.latestAgendaAppointments[0].id, 'current', 'A stale response must not replace the selected week');
  assert.equal(ui.renderedWeek, '2026-10-19T00:00:00.000Z');
  assert.equal(renders.length, 1);
  assert.equal(errors.length, 0, 'A stale failure must not erase the current appointments');
}
console.log('PASS: latest agenda week wins over older responses and failures.');
