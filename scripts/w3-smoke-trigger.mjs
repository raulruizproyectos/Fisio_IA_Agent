#!/usr/bin/env node
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

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const webhookUrl = args.webhookUrl || args.webhook_url;
  const timeoutMs = toNumber(args.timeoutMs || args.timeout_ms, 12000);
  const patientId = args.patientId || args.patient_id || null;
  const therapistId = args.professionalId || args.professional_id || null;
  const symptomsText = args.symptoms || 'dolor cervical al girar el cuello desde hace 3 dias';

  if (!webhookUrl) {
    throw new Error('Falta --webhookUrl');
  }

  const payload = {
    patient_id: patientId,
    therapist_id: therapistId,
    symptoms_text: symptomsText,
    source: 'crm_web',
    context: {
      pain_level: 5,
      latest_session_note: 'Molestia al girar la cabeza y rigidez matinal.',
    },
  };

  const startedAt = Date.now();
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const data = await readJson(response);
  const elapsedMs = Date.now() - startedAt;

  console.log('W3 Smoke Trigger');
  console.log('----------------');
  console.log(`Webhook URL: ${webhookUrl}`);
  console.log(`HTTP: ${response.status}`);
  console.log(`Elapsed(ms): ${elapsedMs}`);
  console.log(`accepted: ${Boolean(data?.accepted)}`);
  console.log(`tracking_status: ${data?.tracking_status || '-'}`);
  console.log(`job_id: ${data?.job_id || '-'}`);
  console.log(`tracking_request_id: ${data?.tracking_request_id || '-'}`);
  console.log(`poll_url: ${data?.poll_url || '-'}`);
  console.log(`progress_message: ${data?.progress_message || '-'}`);
  console.log(`error: ${data?.error || '-'}`);

  const looksValid = response.ok
    && data?.accepted === true
    && typeof data?.job_id === 'string'
    && data.job_id.length > 0
    && ['queued', 'running'].includes(String(data?.tracking_status || '').toLowerCase());

  if (!looksValid) {
    console.error('w3_ack_check: FAILED');
    console.error(JSON.stringify(data, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log('w3_ack_check: OK');
}

main().catch((error) => {
  console.error('[w3-smoke-trigger] error:', error?.message || error);
  process.exitCode = 1;
});