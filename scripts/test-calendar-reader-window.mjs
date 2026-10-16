import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const workflow = JSON.parse(readFileSync(new URL('../n8n/Fisio_IA_Agent/production/w5-calendar-reader.json', import.meta.url), 'utf8'));
const normalize = workflow.nodes.find(node => node.name === 'Normalizar');
const reader = workflow.nodes.find(node => node.name === 'Leer calendario');
assert.equal(reader.typeVersion, 1.3);
assert.equal(reader.parameters.operation, 'getAll');
assert.equal(reader.parameters.returnAll, true);
// n8n Google Calendar 1.3 reads timeMin/timeMax at the parameter root, not additionalFields.
for (const [from, to] of [['2040-01-01T00:00:00Z', '2040-01-02T00:00:00Z'],
  ['2026-10-09T12:00:00Z', '2026-11-15T12:00:00Z']]) {
  const rows = runInNewContext(`(function(){${normalize.parameters.jsCode}})()`, {
    $json: { body: { time_min: from, time_max: to, calendar_id: 'fixture-calendar', calendar_ids: ['fixture-calendar'] } },
  });
  assert.equal(rows.length, 1);
  for (const [field, expected] of [['timeMin', from], ['timeMax', to]]) {
    const expression = reader.parameters[field];
    assert.match(expression || '', /^=\{\{.*\}\}$/, `${field} must be a root parameter for n8n 1.3`);
    assert.equal(runInNewContext(expression.slice(3, -2), { $json: rows[0].json }), expected);
  }
}
console.log('PASS: W5 passes the caller date range to n8n Google Calendar 1.3 root parameters.');
