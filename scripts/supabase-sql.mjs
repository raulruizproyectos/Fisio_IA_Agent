#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const args = {};
  for (const part of argv) {
    if (!part.startsWith('--')) continue;
    const [rawKey, ...rest] = part.slice(2).split('=');
    const key = rawKey.trim();
    const value = rest.join('=').trim();
    if (!key) continue;
    args[key] = value || 'true';
  }
  return args;
}

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

async function loadEnv(projectRoot) {
  const envPath = path.resolve(projectRoot, '.env.local');
  const raw = await fs.readFile(envPath, 'utf8');
  return parseEnv(raw);
}

async function readQuery(projectRoot, args) {
  if (args.file) {
    const filePath = path.resolve(projectRoot, args.file);
    return (await fs.readFile(filePath, 'utf8')).replace(/^\uFEFF/, '').trim();
  }
  if (args.query) {
    return String(args.query || '').trim();
  }
  throw new Error('Usa --file=<sql> o --query="select 1"');
}

const projectRoot = process.cwd();
const args = parseArgs(process.argv.slice(2));
const env = await loadEnv(projectRoot);
const query = await readQuery(projectRoot, args);
const projectRef = String(args.projectRef || args.project_ref || env.SUPABASE_PROJECT_REF || '').trim();
const managementPat = String(args.managementPat || args.management_pat || env.SUPABASE_MANAGEMENT_PAT || '').trim();
const readOnly = String(args.readOnly || args.read_only || 'false').toLowerCase() === 'true';

if (!projectRef || !managementPat) {
  throw new Error('Faltan SUPABASE_PROJECT_REF o SUPABASE_MANAGEMENT_PAT en .env.local');
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${managementPat}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query, read_only: readOnly }),
});

const text = await response.text();
let body = text;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}

console.log(JSON.stringify({
  ok: response.ok,
  status: response.status,
  read_only: readOnly,
  body,
}, null, 2));

if (!response.ok) {
  process.exitCode = 1;
}