#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();

function parseArgs(argv) {
  const args = {};
  for (const part of argv) {
    if (!part.startsWith('--')) continue;
    const [rawKey, ...rest] = part.slice(2).split('=');
    args[rawKey.trim()] = rest.join('=').trim() || 'true';
  }
  return args;
}

function parseEnv(content) {
  const env = {};
  for (const line of String(content || '').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

async function loadEnv() {
  return parseEnv(await fs.readFile(path.join(projectRoot, '.env.local'), 'utf8'));
}

async function readJson(filePath) {
  return JSON.parse((await fs.readFile(filePath, 'utf8')).replace(/^\uFEFF/, ''));
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function walkJson(dir) {
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walkJson(full));
    if (entry.isFile() && entry.name.endsWith('.json')) files.push(full);
  }
  return files;
}

function normalizeName(value = '') {
  return String(value || '').trim();
}

const workflowNames = new Map([
  ['Fisio_IA_Agent / W2 Recomendacion Ejercicios', 'Fisio IA | Ejercicios'],
  ['Fisio_IA_Agent / Puente Error Backend', 'Fisio IA | Errores'],
  ['Fisio_IA_Agent / Router de Mensajes', 'Fisio IA | Router'],
  ['Fisio_IA_Agent / Nucleo Agente', 'Fisio IA | Router'],
  ['Fisio_IA_Agent / Subflujo Pendientes', 'Fisio IA | Pendientes'],
  ['Fisio_IA_Agent / SW Intakes Pendientes', 'Fisio IA | Pendientes'],
  ['Fisio_IA_Agent / W1 Agenda de Citas', 'Fisio IA | Citas'],
  ['Fisio_IA_Agent / W6 Calendar Writer', 'Fisio IA | Calendario guardar'],
  ['Fisio_IA_Agent / W3 Disparador CRM', 'Fisio IA | CRM a plan'],
  ['Fisio_IA_Agent / Bot Pacientes', 'Fisio IA | Bot paciente'],
  ['Fisio_IA_Agent / Bot Fisioterapeuta', 'Fisio IA | Bot fisio'],
  ['Fisio_IA_Agent / W5 Calendar Reader', 'Fisio IA | Calendario leer'],
  ['Fisio_IA_Agent / W6 Calendar Sync', 'Fisio IA | Calendario sync'],
]);

const nodeNames = new Map([
  ['Telegram Trigger', 'Telegram'],
  ['Prepare Input', 'Preparar'],
  ['Lookup Telegram Link', 'Buscar vinculo'],
  ['Backend Command Resolver', 'Resolver backend'],
  ['Build Safe Telegram Reply', 'Preparar respuesta'],
  ['Should Force W1?', 'Forzar cita?'],
  ['Force W1 Booking', 'Crear cita'],
  ['Build Force W1 Reply', 'Respuesta cita'],
  ['Telegram Reply', 'Enviar Telegram'],

  ['Webhook Agent Core', 'Entrada router'],
  ['Build Agent Reply', 'Preparar respuesta'],
  ['Respond Agent Core', 'Responder'],

  ['Webhook Error Notify', 'Entrada error'],
  ['Build Email Payload', 'Preparar email'],
  ['Enviar Gmail', 'Enviar email'],
  ['Respond Error Notify', 'Responder'],

  ['Execute Workflow Trigger', 'Inicio subflujo'],
  ['Tiene Profesional Id', 'Validar fisio'],
  ['Obtener Ingestas Pendientes', 'Buscar pendientes'],
  ['Error Falta Profesional Id', 'Falta fisio'],

  ['Webhook W1 Appointment', 'Entrada cita'],
  ['Normalize Request', 'Normalizar'],
  ['Tiene Slot e IDs', 'Validar cita'],
  ['Build Backend Payload', 'Preparar backend'],
  ['Crear Cita en Backend', 'Guardar cita'],
  ['Build Backend Response', 'Respuesta OK'],
  ['Build Need Slot Response', 'Falta horario'],
  ['Respond W1', 'Responder'],

  ['Webhook W2 Exercise', 'Entrada plan'],
  ['Tiene Datos Minimos', 'Validar datos'],
  ['Call Exercise Engine', 'Generar plan'],
  ['Build W2 Response', 'Preparar plan'],
  ['Build Validation Error', 'Faltan datos'],
  ['Respond W2', 'Responder'],

  ['Webhook W3 CRM Trigger', 'Entrada CRM'],
  ['Tiene Input Requerido', 'Validar entrada'],
  ['Trigger Backend W2', 'Lanzar plan'],
  ['Build Ack Response', 'Confirmar cola'],
  ['Respond W3', 'Responder'],

  ['Webhook', 'Entrada'],
  ['Normalize', 'Normalizar'],
  ['Get Calendar Events', 'Leer calendario'],
  ['Format Response', 'Preparar respuesta'],
  ['Respond', 'Responder'],

  ['Parse Request', 'Leer peticion'],
  ['Route by Action', 'Elegir accion'],
  ['Is Create?', 'Es crear?'],
  ['Is Update?', 'Es editar?'],
  ['Create Event', 'Crear evento'],
  ['Update Event', 'Editar evento'],
  ['Delete Event', 'Borrar evento'],
  ['Format OK', 'Preparar OK'],

  ['Manual Trigger', 'Manual'],
  ['Schedule Trigger', 'Programado'],
  ['Build Sync Window', 'Preparar ventana'],
  ['Trigger Calendar Sync', 'Sincronizar'],
  ['Summarize Sync', 'Resumen'],
]);

function replaceNodeReferences(value, renameMap) {
  if (typeof value === 'string') {
    if (renameMap.has(value)) return renameMap.get(value);
    let next = value;
    for (const [oldName, newName] of renameMap.entries()) {
      next = next
        .replaceAll(`$node["${oldName}"]`, `$node["${newName}"]`)
        .replaceAll(`$node['${oldName}']`, `$node['${newName}']`)
        .replaceAll(`$("` + oldName + `")`, `$("` + newName + `")`)
        .replaceAll(`$('` + oldName + `')`, `$('` + newName + `')`);
    }
    return next;
  }
  if (Array.isArray(value)) return value.map((item) => replaceNodeReferences(item, renameMap));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, replaceNodeReferences(nested, renameMap)]),
    );
  }
  return value;
}

function replaceNodeExpressionReferences(value, referenceMap) {
  if (typeof value === 'string') {
    let next = value;
    for (const [oldName, newName] of referenceMap.entries()) {
      next = next
        .replaceAll(`$node["${oldName}"]`, `$node["${newName}"]`)
        .replaceAll(`$node['${oldName}']`, `$node['${newName}']`)
        .replaceAll(`$("` + oldName + `")`, `$("` + newName + `")`)
        .replaceAll(`$('` + oldName + `')`, `$('` + newName + `')`);
    }
    return next;
  }
  if (Array.isArray(value)) return value.map((item) => replaceNodeExpressionReferences(item, referenceMap));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, replaceNodeExpressionReferences(nested, referenceMap)]),
    );
  }
  return value;
}

function renameWorkflow(workflow) {
  const originalJson = JSON.stringify(workflow);
  const oldWorkflowName = normalizeName(workflow.name);
  const newWorkflowName = workflowNames.get(oldWorkflowName) || oldWorkflowName;
  const existingNodeNames = new Set((workflow.nodes || []).map((node) => node.name));
  const referencedNodeNames = new Set(Object.keys(workflow.connections || {}));
  for (const outputs of Object.values(workflow.connections || {})) {
    for (const outputGroup of Object.values(outputs || {})) {
      for (const output of outputGroup || []) {
        for (const connection of output || []) {
          if (connection?.node) referencedNodeNames.add(connection.node);
        }
      }
    }
  }
  const renameMap = new Map();

  for (const oldName of new Set([...existingNodeNames, ...referencedNodeNames])) {
    const wanted = nodeNames.get(oldName);
    if (wanted && wanted !== oldName) renameMap.set(oldName, wanted);
  }

  workflow.name = newWorkflowName;
  workflow.nodes = (workflow.nodes || []).map((node) => {
    const nextName = renameMap.get(node.name);
    const renamed = nextName ? { ...node, name: nextName } : { ...node };
    return replaceNodeReferences(renamed, renameMap);
  });

  const nextConnections = {};
  for (const [sourceName, outputs] of Object.entries(workflow.connections || {})) {
    const nextSource = renameMap.get(sourceName) || sourceName;
    nextConnections[nextSource] = replaceNodeReferences(outputs, renameMap);
  }
  workflow.connections = nextConnections;

  if (workflow.pinData) {
    const nextPinData = {};
    for (const [nodeName, pin] of Object.entries(workflow.pinData)) {
      nextPinData[renameMap.get(nodeName) || nodeName] = replaceNodeReferences(pin, renameMap);
    }
    workflow.pinData = nextPinData;
  }

  workflow = replaceNodeExpressionReferences(workflow, nodeNames);

  if (workflow.activeVersion?.nodes && workflow.activeVersion?.connections) {
    const nested = renameWorkflow(workflow.activeVersion);
    workflow.activeVersion = nested.workflow;
  }

  return {
    workflow,
    changed: oldWorkflowName !== newWorkflowName || renameMap.size > 0 || JSON.stringify(workflow) !== originalJson,
    oldWorkflowName,
    newWorkflowName,
    renamedNodes: Object.fromEntries(renameMap),
  };
}

async function readResponse(response) {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateRemote({ baseUrl, apiKey, workflow }) {
  const settings = {};
  if (workflow.settings?.executionOrder) settings.executionOrder = workflow.settings.executionOrder;
  if (workflow.settings?.timezone) settings.timezone = workflow.settings.timezone;
  if (workflow.settings?.saveExecutionProgress !== undefined) {
    settings.saveExecutionProgress = workflow.settings.saveExecutionProgress;
  }
  if (workflow.settings?.saveManualExecutions !== undefined) {
    settings.saveManualExecutions = workflow.settings.saveManualExecutions;
  }
  if (workflow.settings?.saveDataErrorExecution !== undefined) {
    settings.saveDataErrorExecution = workflow.settings.saveDataErrorExecution;
  }
  if (workflow.settings?.saveDataSuccessExecution !== undefined) {
    settings.saveDataSuccessExecution = workflow.settings.saveDataSuccessExecution;
  }
  if (workflow.settings?.executionTimeout !== undefined) settings.executionTimeout = workflow.settings.executionTimeout;

  const response = await fetch(`${baseUrl}/api/v1/workflows/${workflow.id}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings,
    }),
  });
  const payload = await readResponse(response);
  if (!response.ok) {
    throw new Error(`No se pudo actualizar ${workflow.id} (${response.status}): ${JSON.stringify(payload).slice(0, 500)}`);
  }
  return payload?.data || payload;
}

async function activateRemote({ baseUrl, apiKey, workflowId }) {
  let lastPayload = null;
  let lastStatus = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': apiKey,
        Accept: 'application/json',
      },
    });
    const payload = await readResponse(response);
    if (response.ok) return;
    lastPayload = payload;
    lastStatus = response.status;
    const message = String(payload?.message || '').toLowerCase();
    if (!message.includes('too many requests')) break;
    await sleep(2500 * attempt);
  }
  throw new Error(`No se pudo activar ${workflowId} (${lastStatus}): ${JSON.stringify(lastPayload).slice(0, 500)}`);
}

async function listRemote({ baseUrl, apiKey }) {
  const response = await fetch(`${baseUrl}/api/v1/workflows?limit=250`, {
    headers: {
      'X-N8N-API-KEY': apiKey,
      Accept: 'application/json',
    },
  });
  const payload = await readResponse(response);
  if (!response.ok) {
    throw new Error(`No se pudo listar workflows (${response.status}): ${JSON.stringify(payload).slice(0, 500)}`);
  }
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return items.filter((item) => workflowNames.has(item.name) || String(item.name || '').startsWith('Fisio IA |'));
}

async function fetchRemote({ baseUrl, apiKey, workflowId }) {
  const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    headers: {
      'X-N8N-API-KEY': apiKey,
      Accept: 'application/json',
    },
  });
  const payload = await readResponse(response);
  if (!response.ok) {
    throw new Error(`No se pudo leer ${workflowId} (${response.status}): ${JSON.stringify(payload).slice(0, 500)}`);
  }
  return payload?.data || payload;
}

const args = parseArgs(process.argv.slice(2));
const dryRun = String(args.dryRun || args.dry_run || 'false').toLowerCase() === 'true';
const updateLocal = String(args.local || 'true').toLowerCase() === 'true';
const updateRemoteRequested = String(args.remote || 'false').toLowerCase() === 'true';
const activate = String(args.activate || 'true').toLowerCase() === 'true';
const summary = { local: [], remote: [] };

if (updateLocal) {
  const jsonFiles = await walkJson(path.join(projectRoot, 'n8n', 'Fisio_IA_Agent'));
  for (const filePath of jsonFiles) {
    const workflow = await readJson(filePath);
    const result = renameWorkflow(workflow);
    if (result.changed) {
      summary.local.push({
        path: path.relative(projectRoot, filePath).replaceAll(path.sep, '/'),
        from: result.oldWorkflowName,
        to: result.newWorkflowName,
        renamedNodes: result.renamedNodes,
      });
      if (!dryRun) await writeJson(filePath, result.workflow);
    }
  }
}

if (updateRemoteRequested) {
  const env = await loadEnv();
  const baseUrl = String(args.baseUrl || args.base_url || env.N8N_BASE_URL || '').replace(/\/+$/, '');
  const apiKey = String(args.apiKey || args.api_key || env.N8N_API_KEY || '').trim();
  if (!baseUrl || !apiKey) throw new Error('Faltan N8N_BASE_URL o N8N_API_KEY en .env.local');

  const remotes = await listRemote({ baseUrl, apiKey });
  for (const item of remotes) {
    const workflow = await fetchRemote({ baseUrl, apiKey, workflowId: item.id });
    const wasActive = Boolean(workflow.active);
    const result = renameWorkflow(workflow);
    if (result.changed) {
      summary.remote.push({
        id: workflow.id,
        active: wasActive,
        from: result.oldWorkflowName,
        to: result.newWorkflowName,
        renamedNodes: result.renamedNodes,
      });
      if (!dryRun) {
        await updateRemote({ baseUrl, apiKey, workflow: result.workflow });
        if (activate && wasActive) await activateRemote({ baseUrl, apiKey, workflowId: workflow.id });
        await sleep(750);
      }
    }
  }

  if (activate && !dryRun) {
    const afterUpdate = await listRemote({ baseUrl, apiKey });
    for (const item of afterUpdate.filter((workflow) => !workflow.active)) {
      await activateRemote({ baseUrl, apiKey, workflowId: item.id });
      await sleep(750);
    }
  }
}

console.log(JSON.stringify({ ok: true, dryRun, ...summary }, null, 2));
