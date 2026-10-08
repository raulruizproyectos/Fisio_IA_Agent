import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('../frontend/', import.meta.url));
const entrypoint = readFileSync(new URL('../frontend/docker-entrypoint.d/40-fisio-runtime-config.sh', import.meta.url), 'utf8');
const guard = entrypoint.slice(0, entrypoint.indexOf('\nenvsubst')).replaceAll('\r', '')
  .replace('. "$defaults_path"', "FISIO_BUILD_SUPABASE_URL=''; FISIO_BUILD_BACKEND_URL=''");
const jwt = role => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.fixture`;
const shell = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/sh';
for (const [key, accepted] of [[jwt('anon'), true], ['sb_publishable_fixture', true], [jwt('service_role'), false], ['sb_secret_fixture', false], ['sk-fixture', false], ['invalid"key', false], [jwt('anon') + '"', false], ['sb_publishable_', false]]) {
  const env = { ...process.env, PUBLIC_SUPABASE_ANON_KEY: key, PUBLIC_SUPABASE_URL: 'https://fixture.supabase.invalid', PUBLIC_BACKEND_URL: 'https://api.fixture.invalid' };
  const build = spawnSync(process.execPath, ['--input-type=module', '-e', 'await import("./astro.config.mjs")'], { cwd: frontend, env, encoding: 'utf8' });
  if (build.error) throw build.error;
  assert.equal(build.status === 0, accepted, 'Build configuration must reject private/malformed keys without printing them');
  const runtime = spawnSync(shell, ['-c', guard], { env, encoding: 'utf8' });
  if (runtime.error) throw runtime.error;
  assert.equal(runtime.status === 0, accepted, 'Runtime guard must reject private/malformed keys before writing the public file');
}
for (const field of ['PUBLIC_SUPABASE_URL', 'PUBLIC_BACKEND_URL']) {
  for (const value of ['https://api.example.test";alert(1);//', 'https://user:password@api.example.test', 'http://api.example.test', 'https://*.example.test', 'https://api.example.test\nhttps://evil.example.test']) {
    const env = { ...process.env, PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_fixture', PUBLIC_SUPABASE_URL: 'https://fixture.supabase.invalid', PUBLIC_BACKEND_URL: 'https://api.fixture.invalid', [field]: value };
    const build = spawnSync(process.execPath, ['--input-type=module', '-e', 'await import("./astro.config.mjs")'], { cwd: frontend, env, encoding: 'utf8' });
    assert.notEqual(build.status, 0, 'Build must reject an unsafe endpoint without echoing its value');
    const runtime = spawnSync(shell, ['-c', guard], { env, encoding: 'utf8' });
    assert.notEqual(runtime.status, 0, 'Runtime must reject an unsafe endpoint before publishing files');
  }
}
const defaultsFile = new URL('../frontend/.runtime-defaults.sh', import.meta.url);
const originalDefaults = existsSync(defaultsFile) ? readFileSync(defaultsFile) : null;
try {
  const build = spawnSync(process.execPath, ['--input-type=module', '-e', 'const {default:config}=await import("./astro.config.mjs"); await config.integrations.find(i=>i.name==="fisio-runtime-url-defaults").hooks["astro:build:done"]();'], {
    cwd: frontend, encoding: 'utf8', env: { ...process.env, PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_fixture', PUBLIC_SUPABASE_URL: 'http://127.0.0.1:3002', PUBLIC_BACKEND_URL: 'https://build-api.example.test/prefix' },
  });
  if (build.error) throw build.error;
  assert.equal(build.status, 0, 'Build hook must accept configured HTTPS prefixes and literal HTTP loopback');
  assert.ok(readFileSync(defaultsFile, 'utf8') === "FISIO_BUILD_SUPABASE_URL='http://127.0.0.1:3002'\nFISIO_BUILD_BACKEND_URL='https://build-api.example.test/prefix'\n", 'Only URL defaults are saved for nginx, without a key');
  const resolved = spawnSync(process.execPath, ['--input-type=module', '-e', 'const {default:config}=await import("./astro.config.mjs"); process.env.PUBLIC_BACKEND_URL="https://resolved-api.example.test/next"; const plugin=config.vite.plugins.find(i=>i.name==="fisio-public-configuration"); plugin.configResolved({mode:"fixture"}); await config.integrations.find(i=>i.name==="fisio-runtime-url-defaults").hooks["astro:build:done"](); process.env.PUBLIC_SUPABASE_ANON_KEY="sb_secret_fixture"; try {plugin.configResolved({mode:"fixture"}); process.exitCode=1;} catch {}'], {
    cwd: frontend, encoding: 'utf8', env: { ...process.env, PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_fixture', PUBLIC_SUPABASE_URL: 'http://127.0.0.1:3002', PUBLIC_BACKEND_URL: 'https://build-api.example.test/prefix' },
  });
  if (resolved.error) throw resolved.error;
  assert.equal(resolved.status, 0, 'Resolved Vite mode must revalidate configuration and reject private keys');
  assert.ok(readFileSync(defaultsFile, 'utf8').includes("FISIO_BUILD_BACKEND_URL='https://resolved-api.example.test/next'"), 'Saved defaults must follow resolved build configuration');
} finally {
  if (originalDefaults) writeFileSync(defaultsFile, originalDefaults); else if (existsSync(defaultsFile)) unlinkSync(defaultsFile);
}
console.log('PASS: actual build/runtime guards accept public keys and reject privileged or malformed configuration before publication. Runtime shell tested outside nginx.');
