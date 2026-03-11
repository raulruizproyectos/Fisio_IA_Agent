#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();

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

async function loadEnv() {
  const envPath = path.resolve(projectRoot, '.env.local');
  const raw = await fs.readFile(envPath, 'utf8');
  return parseEnv(raw);
}

function getResponseData(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

async function readJson(response) {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function normalizeName(value = '') {
  return String(value || '').trim().toLowerCase();
}

function findWorkflowMatch(workflows, requestedName) {
  const normalizedRequested = normalizeName(requestedName);
  const exact = workflows.find((workflow) => normalizeName(workflow?.name) === normalizedRequested);
  if (exact) return exact;

  return workflows.find((workflow) => normalizeName(workflow?.name).includes(normalizedRequested));
}

async function fetchWorkflowList({ baseUrl, apiKey }) {
  const response = await fetch(`${baseUrl}/api/v1/workflows?limit=250`, {
    headers: {
      'X-N8N-API-KEY': apiKey,
      Accept: 'application/json',
    },
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(`No se pudo listar workflows (${response.status}): ${JSON.stringify(payload).slice(0, 300)}`);
  }
  return getResponseData(payload);
}

async function fetchWorkflowById({ baseUrl, apiKey, workflowId }) {
  const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    headers: {
      'X-N8N-API-KEY': apiKey,
      Accept: 'application/json',
    },
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(`No se pudo leer workflow ${workflowId} (${response.status}): ${JSON.stringify(payload).slice(0, 300)}`);
  }
  return payload?.data || payload;
}

async function updateWorkflow({ baseUrl, apiKey, workflowId, workflowPayload }) {
  const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(workflowPayload),
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(`No se pudo actualizar workflow ${workflowId} (${response.status}): ${JSON.stringify(payload).slice(0, 500)}`);
  }
  return payload?.data || payload;
}

async function createWorkflow({ baseUrl, apiKey, workflowPayload }) {
  const response = await fetch(`${baseUrl}/api/v1/workflows`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(workflowPayload),
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(`No se pudo crear workflow (${response.status}): ${JSON.stringify(payload).slice(0, 500)}`);
  }
  return payload?.data || payload;
}

async function setWorkflowActiveState({ baseUrl, apiKey, workflowId, active }) {
  const action = active ? 'activate' : 'deactivate';
  const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}/${action}`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': apiKey,
      Accept: 'application/json',
    },
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(`No se pudo ${action} workflow ${workflowId} (${response.status}): ${JSON.stringify(payload).slice(0, 500)}`);
  }
  return payload?.data || payload;
}

const args = parseArgs(process.argv.slice(2));
const workflowPath = path.resolve(projectRoot, args.workflow || 'n8n/Fisio_IA_Agent/vnext/fisio-agent-core.json');
const env = await loadEnv();
const baseUrl = String(args.baseUrl || args.base_url || env.N8N_BASE_URL || '').replace(/\/+$/, '');
const apiKey = String(args.apiKey || args.api_key || env.N8N_API_KEY || '').trim();

if (!baseUrl || !apiKey) {
  throw new Error('Faltan N8N_BASE_URL o N8N_API_KEY en .env.local');
}

const localWorkflow = JSON.parse(await fs.readFile(workflowPath, 'utf8'));
const requestedName = args.workflowName || args.workflow_name || localWorkflow.name;
const workflowId = args.workflowId || args.workflow_id || null;
const createIfMissing = String(args.createIfMissing || args.create_if_missing || 'false').toLowerCase() === 'true';
const activateRequested = String(args.activate || 'false').toLowerCase() === 'true';
const preserveRemoteName = String(args.setName || args.set_name || 'false').toLowerCase() !== 'true';

const workflows = await fetchWorkflowList({ baseUrl, apiKey });
const matchedWorkflow = workflowId
  ? workflows.find((workflow) => String(workflow?.id) === String(workflowId))
  : findWorkflowMatch(workflows, requestedName);

if (!matchedWorkflow?.id && !createIfMissing) {
  throw new Error(`No se encontro workflow remoto para "${requestedName}"`);
}

let result = null;
let remoteWorkflowId = matchedWorkflow?.id || null;
let operation = 'update';

if (remoteWorkflowId) {
  const remoteWorkflow = await fetchWorkflowById({
    baseUrl,
    apiKey,
    workflowId: remoteWorkflowId,
  });

  const payload = {
    ...remoteWorkflow,
    name: preserveRemoteName ? remoteWorkflow.name : localWorkflow.name,
    nodes: localWorkflow.nodes,
    connections: localWorkflow.connections,
    settings: localWorkflow.settings || {},
    staticData: remoteWorkflow.staticData || null,
    pinData: remoteWorkflow.pinData || {},
    meta: localWorkflow.meta || remoteWorkflow.meta || {},
  };

  delete payload.id;
  delete payload.createdAt;
  delete payload.updatedAt;

  result = await updateWorkflow({
    baseUrl,
    apiKey,
    workflowId: remoteWorkflowId,
    workflowPayload: payload,
  });
} else {
  operation = 'create';
  const payload = {
    name: localWorkflow.name,
    nodes: localWorkflow.nodes,
    connections: localWorkflow.connections,
    settings: localWorkflow.settings || {},
    pinData: localWorkflow.pinData || {},
    meta: localWorkflow.meta || {},
  };

  result = await createWorkflow({
    baseUrl,
    apiKey,
    workflowPayload: payload,
  });
  remoteWorkflowId = result?.id || result?.data?.id || null;
}

if (activateRequested && remoteWorkflowId) {
  await setWorkflowActiveState({
    baseUrl,
    apiKey,
    workflowId: remoteWorkflowId,
    active: true,
  });
}

console.log(JSON.stringify({
  ok: true,
  operation,
  workflow_id: remoteWorkflowId,
  workflow_name: result?.name || localWorkflow.name,
  activated: activateRequested && Boolean(remoteWorkflowId),
  updated_node_count: Array.isArray(localWorkflow.nodes) ? localWorkflow.nodes.length : null,
}, null, 2));
