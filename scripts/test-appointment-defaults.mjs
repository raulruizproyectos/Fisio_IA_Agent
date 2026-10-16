import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { loadFrontendModule } from './load-frontend-module.mjs';
const dates = await loadFrontendModule('lib/appointments.ts');
const { transpileModule } = createRequire(new URL('../frontend/package.json', import.meta.url))('typescript');
const source = readFileSync(new URL('../frontend/src/pages/index.astro', import.meta.url), 'utf8');
const from = source.indexOf('  const toDateTimeLocalValue =');
const to = source.indexOf('  const setAppointmentFormFeedback =', from);
assert.ok(from >= 0 && to > from);
for (const [time, expected] of [['09:00','09:00'],['09:01','09:30'],['09:30','09:30'],['09:31','10:00'],['09:59','10:00'],['23:45','00:00']]) {
  const [hour, minute] = time.split(':').map(Number);
  const fixed = dates.clinicDateTimeToDate(`2026-10-15T${time}`);
  const context = { Date: class extends Date { constructor(...args) { super(...(args.length ? args : [fixed.getTime()])); } },
    ...dates, appointmentPatientSelect: {value:''}, selectedPatientId:'A', appointmentStartInput:{value:''}, appointmentEndInput:{value:''} };
  runInNewContext(transpileModule(source.slice(from,to) + '\nsetAppointmentFormDefaults(true);',{}).outputText, context);
  assert.equal(context.appointmentStartInput.value.slice(11), expected, time);
  const actualStart = dates.clinicDateTimeToDate(context.appointmentStartInput.value);
  assert.equal(dates.clinicDateTimeToDate(context.appointmentEndInput.value).getTime() - actualStart.getTime(), 30 * 60000);
  assert.ok(actualStart >= fixed && actualStart.getTime() - fixed.getTime() < 30 * 60000);
  assert.equal(context.appointmentPatientSelect.value, 'A');
}
console.log('PASS: cita predeterminada al siguiente bloque de media hora, incluido cambio de día.');
