import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const requireFrontend = createRequire(new URL('../frontend/package.json', import.meta.url));
const ts = requireFrontend('typescript');
const source = await readFile(new URL('../frontend/src/lib/appointments.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { upcomingAppointments } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const now = Date.parse('2026-10-07T12:00:00Z');
const appointments = [
  { id: 'past', inicio_en: '2026-09-22T09:00:00Z', estado: 'confirmada' },
  { id: 'later', inicio_en: '2026-10-09T09:00:00Z', estado: 'reprogramada' },
  { id: 'cancelled', inicio_en: '2026-10-07T13:00:00Z', estado: 'cancelada' },
  { id: 'completed', inicio_en: '2026-10-07T13:00:00Z', estado: 'completada' },
  { id: 'absent', inicio_en: '2026-10-07T13:00:00Z', estado: 'no_show' },
  { id: 'invalid', inicio_en: 'incorrecta', estado: 'pendiente' },
  { id: 'next', fecha_hora: '2026-10-07T12:00:00Z', estado: 'pendiente' },
];
assert.deepEqual(upcomingAppointments(appointments, now).map(row => row.id), ['next', 'later']);
assert.deepEqual(upcomingAppointments([appointments[0]], now), []);
assert.equal(appointments[0].id, 'past');
console.log('PASS: upcoming sessions exclude past/invalid/finished dates, support both CRM date fields and preserve the source list.');

const page = await readFile(new URL('../frontend/src/pages/index.astro', import.meta.url), 'utf8');
const slice = page.slice(page.indexOf('  const getAgendaMirrorMeta ='), page.indexOf('  const renderAgendaCalendar ='));
const ui = vm.createContext({
  dashboardRuntime: {}, agendaSyncChip: {}, agendaSyncTitle: {}, agendaSyncMeta: {}, agendaSyncFacts: {},
  dashboardSyncChip: {}, dashboardSyncTitle: {}, dashboardSyncMeta: {}, dashboardSyncFacts: {},
  applySyncStatusView() {}, syncDashboardCommandCenter() {}, fmtRelativeSyncAge: () => 'Fixture age',
  getAgendaCalendarBlockMeta: () => ({ note: 'Fixture block' }),
});
vm.runInContext(ts.transpileModule(slice, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ui);
assert.equal(vm.runInContext("getAgendaMirrorMeta({calendar_sync_pending:true,calendar_sync_state:'linked'}).label", ui), 'Calendar pendiente');
vm.runInContext("renderAgendaSyncStatus({ui_status:'healthy',summary:{enabled:true,pending:0}}, {enabled:true,pending:2})", ui);
assert.equal(ui.dashboardRuntime.syncUi.chipLabel, 'Requiere comprobación');
assert.match(ui.dashboardRuntime.syncUi.meta, /^2 cita/);
vm.runInContext("renderAgendaSyncStatus({ui_status:'healthy',summary:{enabled:true,pending:2}}, {enabled:true,pending:0})", ui);
assert.equal(ui.dashboardRuntime.syncUi.chipLabel, 'Al dia', 'Fresh zero overrides an old pending count');
console.log('PASS: pending Calendar stays visible in appointment and agenda metadata; fresh counts override old summaries.');
