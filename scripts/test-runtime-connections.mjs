// Execute the container entrypoint with temporary paths and fictitious configuration.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';

const fixture = mkdtempSync(path.join(tmpdir(), 'fisio-public-config-'));
const shell = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/sh';
const file = name => path.join(fixture, name);
const slash = name => file(name).replaceAll('\\', '/');
let entrypoint = readFileSync(new URL('../frontend/docker-entrypoint.d/40-fisio-runtime-config.sh', import.meta.url), 'utf8').replaceAll('\r', '');
for (const [variable, name] of [['template_path', 'template.js'], ['target_path', 'runtime.js'], ['defaults_path', 'defaults.sh'], ['policy_path', 'policy.conf']]) {
  entrypoint = entrypoint.replace(new RegExp('^' + variable + '=.*$', 'm'), variable + '="' + slash(name) + '"');
}
// Git Bash lacks envsubst. Substitute only the literal PUBLIC URL placeholders, with no shell evaluation.
writeFileSync(file('render.cjs'), "process.stdout.write(require('node:fs').readFileSync(0,'utf8').replace(/\\$\\{([A-Z_]+)\\}/g,(_,k)=>process.env[k]||''));");
const render = 'envsubst() { "$FISIO_TEST_NODE" "$FISIO_TEST_RENDERER"; }\n';
writeFileSync(file('template.js'), readFileSync(new URL('../frontend/runtime-config.template.js', import.meta.url)));
const baseEnv = { ...process.env, PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_fixture',
  FISIO_TEST_NODE: process.execPath.replaceAll('\\', '/'), FISIO_TEST_RENDERER: slash('render.cjs') };
const run = (urls, defaults = ['https://build-project.example.test', 'https://build-api.example.test/base']) => {
  writeFileSync(file('defaults.sh'), `FISIO_BUILD_SUPABASE_URL='${defaults[0]}'\nFISIO_BUILD_BACKEND_URL='${defaults[1]}'\n`);
  return spawnSync(shell, ['-c', render + entrypoint], { env: { ...baseEnv, ...urls }, encoding: 'utf8' });
};
let checked = 0;
try {
  for (const [urls, defaults, origins] of [
    [{ PUBLIC_SUPABASE_URL: 'https://runtime-project.example.test/storage/', PUBLIC_BACKEND_URL: 'https://runtime-api.example.test:8443/prefix' }, undefined, 'https://runtime-api.example.test:8443 https://runtime-project.example.test'],
    [{ PUBLIC_SUPABASE_URL: 'https://runtime-project.example.test', PUBLIC_BACKEND_URL: '' }, undefined, 'https://build-api.example.test https://runtime-project.example.test'],
    [{ PUBLIC_SUPABASE_URL: '', PUBLIC_BACKEND_URL: '' }, undefined, 'https://build-api.example.test https://build-project.example.test'],
    [{ PUBLIC_SUPABASE_URL: '', PUBLIC_BACKEND_URL: '' }, ['', ''], 'https://fisio-backend.b5xbaf.easypanel.host https://fisio-dev.supabase.co'],
    [{ PUBLIC_SUPABASE_URL: 'http://127.0.0.1:3002', PUBLIC_BACKEND_URL: 'http://localhost:3001/api' }, undefined, 'http://localhost:3001 http://127.0.0.1:3002'],
  ]) {
    const result = run(urls, defaults); if (result.error) throw result.error;
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(file('policy.conf'), 'utf8'), `set $fisio_connect_sources "${origins}";\n`);
    const browser = { window: {} };
    runInNewContext(readFileSync(file('runtime.js'), 'utf8'), browser);
    const config = browser.window.__FISIO_RUNTIME_CONFIG__;
    assert.equal(config.PUBLIC_SUPABASE_URL, urls.PUBLIC_SUPABASE_URL);
    assert.equal(config.PUBLIC_BACKEND_URL, urls.PUBLIC_BACKEND_URL);
    assert.ok(!('PUBLIC_SUPABASE_ANON_KEY' in config), 'Auth key stays in the backend even if supplied to old runtime configuration');
    assert.ok(!readFileSync(file('runtime.js'), 'utf8').includes(baseEnv.PUBLIC_SUPABASE_ANON_KEY));
    checked++;
  }
  for (const field of ['PUBLIC_SUPABASE_URL', 'PUBLIC_BACKEND_URL']) {
    for (const value of ['https://api.example.test";alert(1);//', 'https://user:password@api.example.test', 'http://api.example.test', 'http://localhost.evil.example.test', 'https://*.example.test', 'https://api.example.test?key=fixture', 'https://api.example.test#fragment', 'https://api.example.test\nhttps://evil.example.test', 'https://api.example.test\n', 'https://api.example.test:65536', 'https://api.example.test:0', 'https://api..example.test', 'https://api.example.test/$value', 'javascript:alert(1)']) {
      writeFileSync(file('runtime.js'), 'existing runtime'); writeFileSync(file('policy.conf'), 'existing policy');
      const result = run({ PUBLIC_SUPABASE_URL: 'https://project.example.test', PUBLIC_BACKEND_URL: 'https://api.example.test', [field]: value });
      if (result.error) throw result.error;
      assert.notEqual(result.status, 0, 'Unsafe endpoint must reject startup');
      assert.equal(readFileSync(file('runtime.js'), 'utf8'), 'existing runtime');
      assert.equal(readFileSync(file('policy.conf'), 'utf8'), 'existing policy');
      assert.ok(!(result.stdout + result.stderr).includes(value), 'Rejection must not echo configuration');
      checked++;
    }
  }
  console.log(`PASS: ${checked} runtime cases preserve build/runtime precedence, literal origins and existing files on rejection; no wildcard/private config publication. envsubst substitution is a local test double, nginx not executed.`);
} finally {
  for (const name of ['template.js', 'render.cjs', 'defaults.sh', 'runtime.js', 'policy.conf', 'runtime.js.tmp', 'policy.conf.tmp']) {
    try { unlinkSync(file(name)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  rmdirSync(fixture);
}
