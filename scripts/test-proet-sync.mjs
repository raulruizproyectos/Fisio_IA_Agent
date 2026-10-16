import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const file = await readFile(new URL('./proet-sync-supabase.mjs', import.meta.url), 'utf8');
const source = file.slice(0, file.lastIndexOf('\nmain().catch'))
  .replace(/^#![^\n]*\n/, '').replace(/^import .*;\r?\n/gm, '');
const snapshot = { unique_exercises: [{ source_exercise_id: 1, title: 'Movilidad cervical', description_text: 'Suave', image_filename: 'movilidad-cervical-1.png' }] };
const reads = [], cwd = path.resolve('fixture-proet');
const context = vm.createContext({
  path, process: { cwd: () => cwd, argv: ['node', 'sync', '--dry-run=true', '--snapshot=fixture.json'] },
  fs: { readFile: async file => {
    reads.push(file);
    return file === path.join(cwd, '.env.local') ? 'SUPABASE_URL=https://fixture.invalid\nSUPABASE_SERVICE_ROLE_KEY=fixture' : JSON.stringify(snapshot);
  } },
  fetch: () => { throw Error('Dry run must never contact Supabase'); },
  console: { log() {} },
});
vm.runInContext(source + '\nglobalThis.rows = buildCrmExercises; globalThis.run = main;', context);
const row = context.rows(snapshot, '2026-10-15T00:00:00Z')[0];
assert.equal(row.codigo, 'PROET-1');
assert.equal(Object.hasOwn(row, 'contraindicaciones'), false, 'An imported row must leave reviewed contraindications untouched during merge');
assert.equal({ contraindicaciones: 'Revisión profesional', ...row }.contraindicaciones, 'Revisión profesional');
await context.run();
assert.equal(reads[0], path.join(cwd, '.env.local'), 'The root env file is the default');
for (const size of ['1', '500']) {
  context.process.argv[4] = '--batch-size=' + size;
  await context.run();
}
for (const size of ['0', '-1', '1.5', 'NaN', 'Infinity', 'foo', '501']) {
  context.process.argv[4] = '--batch-size=' + size;
  const previousReads = reads.length;
  await assert.rejects(context.run(), /entero entre 1 y 500/);
  assert.equal(reads.length, previousReads, 'Reject invalid batches before reading credentials or sending requests');
}
console.log('PASS: PROET import preserves reviewed contraindications, defaults to root .env.local, validates batch limits before I/O and dry run makes no network calls.');
