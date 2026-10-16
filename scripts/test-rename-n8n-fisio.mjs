import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const source = (await readFile(new URL('./rename-n8n-fisio.mjs', import.meta.url), 'utf8'))
  .replace(/^#![^\n]*\n/, '').replace(/^import .*;\r?\n/gm, '');
async function run({ status = 200, dryRun = false, activate = true, timeout = false } = {}) {
  const calls = [];
  const workflows = [true, false].map((active, i) => ({
    id: String(i), name: 'Fisio_IA_Agent / W6 Calendar Writer', active,
    nodes: [{ name: 'Parse Request' }], connections: {}, settings: {},
  }));
  const context = vm.createContext({
    path, process: { cwd: () => '/fixture', argv: ['node', 'rename', '--local=false', '--remote=true',
      `--dryRun=${dryRun}`, `--activate=${activate}`] },
    fs: { readFile: async () => 'N8N_BASE_URL=https://n8n.example.invalid\nN8N_API_KEY=fixture' },
    console: { log() {} }, setTimeout: fn => fn(),
    fetch: async (url, options = {}) => {
      const method = options.method || 'GET';
      calls.push({ url, method });
      if (method === 'POST') {
        if (timeout) throw new Error('Fixture connection lost after activation');
        return { ok: status === 200, status, text: async () => JSON.stringify({ message: 'Too many requests' }) };
      }
      const data = url.includes('?') ? workflows : workflows.find(w => url.endsWith('/' + w.id));
      assert.ok(data, 'Only fixture workflow requests are allowed');
      return { ok: true, text: async () => JSON.stringify(data) };
    },
  });
  let error;
  try { await vm.runInContext(`(async () => {${source}\n})()`, context); } catch (caught) { error = caught; }
  return { calls, error };
}
const normal = await run();
assert.equal(normal.error, undefined);
assert.equal(normal.calls.filter(c => c.method === 'PUT').length, 2);
assert.deepEqual(normal.calls.filter(c => c.method === 'POST').map(c => c.url), ['https://n8n.example.invalid/api/v1/workflows/0/activate']);
for (const options of [{ status: 429 }, { timeout: true }]) {
  const failed = await run(options);
  assert.ok(failed.error);
  assert.equal(failed.calls.filter(c => c.method === 'POST').length, 1, 'An uncertain mutation is never retried');
  assert.equal(failed.calls.filter(c => c.method === 'PUT').length, 1, 'Stop after failed activation');
}
for (const options of [{ dryRun: true }, { activate: false }]) {
  const result = await run(options);
  assert.equal(result.error, undefined);
  assert.equal(result.calls.filter(c => c.method === 'POST').length, 0);
  if (options.dryRun) assert.equal(result.calls.filter(c => c.method === 'PUT').length, 0);
}
console.log('PASS: renaming preserves paused workflows, reactivates only previously active IDs and never retries failed or uncertain activation.');
