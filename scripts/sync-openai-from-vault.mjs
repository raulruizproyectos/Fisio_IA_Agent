#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const envPath = path.resolve(projectRoot, '.env.local');

function parseEnv(content) {
  const env = {};
  const clean = String(content || '').replace(/^\uFEFF/, '');
  for (const line of clean.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const key = line.slice(0, i).trim().replace(/^\uFEFF/, '');
    const value = line.slice(i + 1);
    env[key] = value;
  }
  return env;
}

function toEnvLines(envMap) {
  return Object.entries(envMap).map(([k, v]) => `${k}=${v ?? ''}`).join('\n') + '\n';
}

const raw = await fs.readFile(envPath, 'utf8');
const env = parseEnv(raw);

const base = String(env.SUPABASE_URL || '').trim();
const service = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!base || !service) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
}

const rpcResp = await fetch(`${base}/rest/v1/rpc/vault_read_secret`, {
  method: 'POST',
  headers: {
    apikey: service,
    Authorization: `Bearer ${service}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ secret_name: 'OPENAI_API_KEY' }),
});

const rpcText = await rpcResp.text();
if (!rpcResp.ok) {
  throw new Error(`vault_read_secret failed (${rpcResp.status}): ${rpcText.slice(0, 240)}`);
}

let openai = '';
try { openai = JSON.parse(rpcText); } catch { openai = rpcText; }
openai = String(openai || '').trim();
if (!openai.startsWith('sk-')) {
  throw new Error('OPENAI_API_KEY invalida en vault_read_secret');
}

env.OPENAI_API_KEY = openai;
env.OPENAI_API_KEY_SOURCE = 'vault_sync';

await fs.writeFile(envPath, toEnvLines(env), 'utf8');
console.log('OPENAI_API_KEY sincronizada desde Vault a .env.local');
