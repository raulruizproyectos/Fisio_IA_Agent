import assert from 'node:assert/strict';
import { loadFrontendModule } from './load-frontend-module.mjs';
const { decodeMojibake, sanitizeText, sanitizePayload } = await loadFrontendModule('lib/text.ts');
for (const text of ['PEÑA', 'NIÑO', 'Guðrún', 'Ângela', 'François', 'João', 'Zoë', '東京', 'Мария', '😀', 'e\u0301', 'PEÑA e\u0301', 'Texto con â', 'Ã', 'Pe�a', 'PEÑA JosÃ©']) {
  assert.equal(sanitizeText(text), text, 'Preserve valid or ambiguous Unicode: ' + text);
}
for (const text of ['Fisioterapia Muñoz', 'José García — sesión', '😀']) {
  const broken = Buffer.from(text).toString('latin1');
  assert.equal(decodeMojibake(broken), text);
  assert.equal(decodeMojibake(Buffer.from(broken).toString('latin1')), text, 'Repair two encoding passes');
}
assert.equal(sanitizeText('PE\0ÑA'), 'PEÑA');
assert.equal(sanitizeText(null), '');
const original = { patient: 'PEÑA', notes: ['JosÃ©', 0, false, null], nested: { value: 'NIÑO' } };
const result = sanitizePayload(original);
assert.deepEqual(result, { patient: 'PEÑA', notes: ['José', 0, false, null], nested: { value: 'NIÑO' } });
assert.equal(original.notes[0], 'JosÃ©', 'Do not mutate the response or shared input');
assert.notEqual(result.nested, original.nested);
const special = sanitizePayload(JSON.parse('{"__proto__":{"injected":true},"patient":"PEÑA"}'));
assert.equal(Object.getPrototypeOf(special), Object.prototype);
assert.equal(Object.hasOwn(special, '__proto__'), true, 'A JSON key must remain data, never a prototype setter');
assert.equal(special.injected, undefined);
console.log('PASS: Unicode patient names, verified encoding repair, null removal and immutable safe JSON traversal.');
