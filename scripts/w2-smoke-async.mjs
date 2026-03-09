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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const baseUrl = (args.baseUrl || args.base_url || 'http://localhost:3001').replace(/\/+$/, '');
  const symptoms = args.symptoms || 'dolor lumbar moderado desde hace 3 dias';
  const patientId = args.patientId || args.patient_id || null;
  const professionalId = args.professionalId || args.professional_id || null;
  const pollIntervalMs = toNumber(args.pollIntervalMs || args.poll_interval_ms, 1500);
  const maxPolls = toNumber(args.maxPolls || args.max_polls, 90);
  const requestTimeoutMs = toNumber(args.requestTimeoutMs || args.request_timeout_ms, 12000);
  const pollTimeoutMs = toNumber(args.pollTimeoutMs || args.poll_timeout_ms, 8000);

  const payload = {
    patient_id: patientId,
    symptoms,
    channel: 'crm_web',
    fisioterapeuta_id: professionalId,
  };

  const startAt = Date.now();
  const startResponse = await fetch(`${baseUrl}/api/exercises/recommend/async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  const startData = await readJson(startResponse);
  const jobId = String(startData?.job_id || '').trim();
  const pollUrl = String(startData?.poll_url || '').trim();

  console.log('W2 Async Smoke');
  console.log('--------------');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Start HTTP: ${startResponse.status}`);
  console.log(`Accepted: ${Boolean(startData?.accepted || startData?.ok)}`);
  console.log(`job_id: ${jobId || '-'}`);
  console.log(`tracking_request_id: ${startData?.tracking_request_id || '-'}`);
  console.log(`poll_url: ${pollUrl || '-'}`);
  console.log(`progress_message: ${startData?.progress_message || '-'}`);

  if (!startResponse.ok || !jobId) {
    console.error('async_start: FAILED');
    process.exitCode = 1;
    return;
  }

  let finalPayload = null;
  let lastStatus = String(startData?.status || 'queued');
  for (let attempt = 1; attempt <= maxPolls; attempt += 1) {
    const pollResponse = await fetch(`${baseUrl}/api/exercises/recommend/jobs/${jobId}`, {
      signal: AbortSignal.timeout(pollTimeoutMs),
    });
    const pollData = await readJson(pollResponse);
    lastStatus = String(pollData?.status || '').toLowerCase() || 'unknown';

    console.log(`[poll ${attempt}] http=${pollResponse.status} status=${lastStatus} progress=${pollData?.progress_message || '-'}`);

    if (!pollResponse.ok) {
      console.error('async_poll: FAILED');
      console.error(JSON.stringify(pollData, null, 2));
      process.exitCode = 1;
      return;
    }

    if (lastStatus === 'done') {
      finalPayload = pollData;
      break;
    }

    if (lastStatus === 'error') {
      console.error('async_job: ERROR');
      console.error(JSON.stringify(pollData, null, 2));
      process.exitCode = 1;
      return;
    }

    await wait(pollIntervalMs);
  }

  const elapsedMs = Date.now() - startAt;
  if (!finalPayload) {
    console.error(`async_poll: TIMEOUT after ${maxPolls} polls (${elapsedMs}ms)`);
    process.exitCode = 2;
    return;
  }

  const result = finalPayload?.result || {};
  const exercises = Array.isArray(result?.exercises)
    ? result.exercises.length
    : Array.isArray(result?.selected_exercises)
      ? result.selected_exercises.length
      : 0;
  const imageCoverage = result?.image_coverage || {};
  console.log('Result');
  console.log('------');
  console.log(`Final status: ${finalPayload?.status || lastStatus}`);
  console.log(`Elapsed(ms): ${elapsedMs}`);
  console.log(`request_id: ${result?.request_id || finalPayload?.request_id || '-'}`);
  console.log(`recommendation_id: ${result?.recommendation_id || '-'}`);
  console.log(`exercises: ${exercises}`);
  if (typeof imageCoverage?.with_image === 'number' && typeof imageCoverage?.total === 'number') {
    console.log(`image_coverage: ${imageCoverage.with_image}/${imageCoverage.total} (${imageCoverage.percentage ?? 0}%)`);
  }
  console.log(`engine_observability: ${JSON.stringify(result?.engine_observability || {})}`);
}

main().catch((error) => {
  console.error('[w2-smoke-async] error:', error?.message || error);
  process.exitCode = 1;
});
