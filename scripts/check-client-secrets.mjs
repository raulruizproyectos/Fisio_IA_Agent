// Reports locations/names only. Never prints credentials, env contents or patient copies.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv as parse } from 'node:util';
const root = fileURLToPath(new URL('../', import.meta.url));
let env = {};
try { env = parse(await readFile(path.join(root, '.env.local'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const secrets = Object.entries(env).filter(([key, value]) => /KEY|TOKEN|SECRET|PASSWORD/.test(key)
  && !/ANON_KEY|PUBLISHABLE/.test(key) && value.length >= 16);
let files = 0;
for (const directory of ['frontend/src', 'frontend/public', 'frontend/dist']) {
  const walk = async dir => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { await walk(file); continue; }
      if (!/\.(astro|ts|js|mjs|json|html|css|map|svg)$/i.test(file)) continue;
      files++;
      const text = await readFile(file, 'utf8');
      const location = path.relative(root, file);
      for (const [key, value] of secrets) assert.ok(!text.includes(value), `Privileged credential ${key} found in ${location}`);
      assert.ok(!/sb_secret_[A-Za-z0-9_-]{16,}|sk-(?:proj-)?[A-Za-z0-9_-]{32,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(text), `Credential signature found in ${location}`);
      for (const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []) {
        let role; try { role = JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).role; } catch { continue; }
        assert.notEqual(role, 'service_role', `Privileged Supabase JWT found in ${location}`);
      }
    }
  };
  await walk(path.join(root, directory));
}
console.log(`PASS: ${files} frontend source/public/build files contain no recognized privileged credentials or local secret values.`);
