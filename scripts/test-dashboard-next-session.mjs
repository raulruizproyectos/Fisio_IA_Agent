import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../frontend/src/pages/index.astro', import.meta.url), 'utf8');
const render = source.match(/const renderDashboardNextSessionCard = \(\) => \{([\s\S]*?)\n  \};/)?.[1];
assert.ok(render);
const card = { hidden: true };
const title = { closest: () => card };
const meta = {};
const button = {};
const runtime = { agendaState: 'ready', nextAppointment: null };
const context = {
  dashboardRuntime: runtime, dashboardNextSessionTitle: title,
  dashboardNextSessionMeta: meta, dashboardNextSessionStatus: {}, dashboardNextSessionBtn: button,
  setDashboardChip() {}, isTodayDate: () => true, fmtHourOnly: () => '10:00', fmtDate: () => '15 oct',
};
const run = () => runInNewContext(`(() => {${render.replace('closest<HTMLElement>', 'closest')}})()`, context);
run();
assert.equal(card.hidden, true, 'No empty next-session card');
runtime.nextAppointment = { nombre_paciente: 'Paciente ficticio', paciente_id: 'patient-1', inicio_en: '2026-10-15T08:00:00Z' };
run();
assert.equal(card.hidden, false);
assert.equal(title.textContent, 'Paciente ficticio');
assert.match(button.innerHTML, /Abrir ficha/);
runtime.nextAppointment.paciente_id = null;
run();
assert.match(button.innerHTML, /Ver agenda/);
for (const state of ['loading', 'error']) {
  runtime.agendaState = state;
  run();
  assert.equal(card.hidden, true, 'Do not show stale next session on ' + state);
}
runtime.agendaState = 'ready';
run();
assert.equal(card.hidden, false, 'Next session returns after recovery');
runtime.nextAppointment = null;
run();
assert.equal(card.hidden, true, 'Card disappears after last appointment');
console.log('PASS: próxima sesión contextual, ficha, agenda y estados vacío/error/recuperación.');
