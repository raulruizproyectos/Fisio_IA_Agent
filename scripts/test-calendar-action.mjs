import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const ts = createRequire(new URL('../frontend/package.json', import.meta.url))('typescript');
const page = await readFile(new URL('../frontend/src/pages/index.astro', import.meta.url), 'utf8');
const slice = page.slice(page.indexOf('  const pendingCalendarChecks ='), page.indexOf('  const updateAppointmentStatus ='));
const code = ts.transpileModule(slice, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
let resolveRequest, calls = 0, loads = 0, opens = 0;
const messages = [], feedback = { textContent: '' };
const button = { dataset: { apptId: 'a' }, disabled: false, setAttribute() {} };
const context = vm.createContext({
  BACKEND_BASE: 'http://localhost:fixture', latestAgendaAppointments: [{ id: 'a', updated_at: 'v1', calendar_sync_pending: true }], appointmentDetailId: 'a',
  document: { querySelectorAll: selector => selector.startsWith('[data-calendar-check-id=') ? messages.filter(message => !message.removed) : [button], getElementById: () => feedback },
  showToast: (message, type) => { const toast = { message, type, setAttribute() {}, remove() { this.removed = true; } }; messages.push(toast); return toast; },
  openAppointmentDetailDrawer: row => { opens++; assert.equal(row.id, 'a'); }, loadCitas: async () => { loads++; },
  fetchJson: async (url, options) => { calls++; assert.match(url, /\/a\/check-calendar$/); assert.equal(options.method, 'POST'); assert.equal(JSON.parse(options.body).updated_at, 'v1'); return new Promise(resolve => { resolveRequest = resolve; }); },
});
vm.runInContext('const findAgendaAppointmentById = id => latestAgendaAppointments.find(row => row.id === id);', context);
vm.runInContext(code, context);
const check = () => vm.runInContext("checkAppointmentCalendar('a')", context);
let pending = check(); await check(); assert.equal(calls, 1); assert.equal(button.disabled, true); assert.equal(feedback.textContent, 'Comprobando Calendar…');
resolveRequest({ data: { id: 'a', updated_at: 'v1', calendar_sync_pending: true }, calendar_check: { status: 'pending', message: 'Sigue bloqueada.' } });
await pending; assert.equal(messages.at(-1).type, 'warning'); assert.equal(feedback.textContent, 'Sigue bloqueada.'); assert.equal(button.disabled, false);
pending = check(); context.appointmentDetailId = 'b'; const before = opens;
assert.equal(messages[0].removed, true, 'The next check replaces its previous persistent warning');
resolveRequest({ data: { id: 'a', updated_at: 'v2', calendar_sync_pending: false }, calendar_check: { status: 'verified', message: 'Comprobada.' } });
await pending; assert.equal(opens, before, 'Late response never opens or replaces another appointment drawer'); assert.equal(messages.at(-1).type, 'success');
context.latestAgendaAppointments = [{ id: 'a', updated_at: 'v1', calendar_sync_pending: true }];
pending = check(); context.latestAgendaAppointments[0].updated_at = 'newer';
resolveRequest({ data: { id: 'a', updated_at: 'v2', calendar_sync_pending: false }, calendar_check: { status: 'verified', message: 'Old result' } });
await pending; assert.equal(context.latestAgendaAppointments[0].updated_at, 'newer'); assert.equal(context.latestAgendaAppointments[0].calendar_sync_pending, true);
context.latestAgendaAppointments = [{ id: 'a', updated_at: 'v1', calendar_sync_pending: true }]; context.appointmentDetailId = 'a';
pending = check(); resolveRequest({ error: 'No se pudo leer Calendar.' }); await pending;
assert.equal(feedback.textContent, 'No se pudo leer Calendar.'); assert.equal(messages.at(-1).type, 'error'); assert.equal(button.disabled, false); assert.equal(loads, 2);
// Exercise the real detail renderer: only the check action appears for a pending appointment.
const drawerSlice = page.slice(page.indexOf('  const openAppointmentDetailDrawer ='), page.indexOf('  // === LOAD CITAS ==='));
const body = { innerHTML: '' };
const drawer = vm.createContext({ appointmentDetailDrawer: { classList: { add() {} }, setAttribute() {} }, appointmentDetailBody: body,
  appointmentDetailTitle: {}, appointmentDetailSubtitle: {}, appointmentDetailId: null, escapeHtml: String, escapeAttr: String,
  isCalendarOnlyAppointment: () => false, getAgendaMirrorMeta: () => ({ label: 'Calendar pendiente', note: 'Cita guardada. Comprueba Calendar.' }),
  isAllDayAppointment: () => false, fmtHourOnly: () => '09:00', document: { body: { classList: { add() {} } } },
});
vm.runInContext(ts.transpileModule(drawerSlice, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, drawer);
vm.runInContext("openAppointmentDetailDrawer({id:'a',estado:'pendiente',calendar_sync_pending:true})", drawer);
assert.match(body.innerHTML, /Comprobar Calendar/); assert.match(body.innerHTML, /role="status" aria-live="polite"/);
assert.doesNotMatch(body.innerHTML, /data-appt-action="(confirmada|completada|cancelada)"/);
console.log('PASS: agenda detail shows check action and blocking notice; real handler blocks double click, preserves pending state and ignores stale/other-drawer responses.');
