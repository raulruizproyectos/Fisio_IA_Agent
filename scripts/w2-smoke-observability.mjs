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
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = (args.baseUrl || args.base_url || 'http://localhost:3001').replace(/\/+$/, '');
  const symptoms = args.symptoms || 'dolor lumbar moderado desde hace 3 dias';
  const timeoutMs = toNumber(args.timeoutMs || args.timeout_ms, 70000);
  const patientId = args.patientId || args.patient_id || null;
  const professionalId = args.professionalId || args.professional_id || null;
  const requireObservability = toBoolean(args.requireObservability || args.require_observability, false);

  const payload = {
    patient_id: patientId,
    symptoms,
    channel: 'crm_web',
    fisioterapeuta_id: professionalId,
  };

  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/exercises/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const responseText = await response.text();
  let data = null;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = { raw: responseText };
  }

  const elapsedMs = Date.now() - startedAt;
  const engine = data?.engine_observability || {};

  console.log('W2 Smoke Observability');
  console.log('----------------------');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`HTTP: ${response.status}`);
  console.log(`Elapsed(ms): ${elapsedMs}`);
  console.log(`request_id: ${data?.request_id || '-'}`);
  console.log(`ok: ${Boolean(data?.ok)}`);
  console.log(`fallback_used: ${Boolean(engine?.fallback_used)}`);
  console.log(`fallback_reason: ${engine?.fallback_reason || '-'}`);
  console.log(`attempts: ${engine?.attempts ?? '-'}`);
  console.log(`retries_used: ${engine?.retries_used ?? '-'}`);
  console.log(`total_duration_ms(engine): ${engine?.total_duration_ms ?? '-'}`);
  console.log(`image_coverage: ${JSON.stringify(data?.image_coverage || {})}`);

  if (requireObservability) {
    const hasObservabilityFields = typeof engine?.attempts === 'number' && typeof engine?.retries_used === 'number';
    if (!hasObservabilityFields) {
      console.error('observability_check: FAILED (attempts/retries_used missing)');
      process.exitCode = 2;
    } else {
      console.log('observability_check: OK');
    }
  }

  if (!response.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[w2-smoke-observability] error:', error?.message || error);
  process.exitCode = 1;
});
