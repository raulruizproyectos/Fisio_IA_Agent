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

async function readJson(response) {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function buildCases({ patientId, professionalId }) {
  return [
    {
      name: 'triage_free_text',
      expectedRoute: 'triage_needed',
      expectedAction: 'create_intake_and_reply',
      body: {
        chat_id: 'dryrun-chat-0',
        texto_mensaje: 'Me duele',
        patient_id: patientId,
        professional_id: professionalId,
      },
    },
    {
      name: 'exercise_free_text',
      expectedRoute: 'exercise',
      expectedAction: 'trigger_w2',
      body: {
        chat_id: 'dryrun-chat-1',
        texto_mensaje: 'Necesito un plan de ejercicios para dolor lumbar con imagenes',
        patient_id: patientId,
        professional_id: professionalId,
      },
    },
    {
      name: 'appointment_free_text',
      expectedRoute: 'appointment',
      expectedAction: 'trigger_w1',
      body: {
        chat_id: 'dryrun-chat-2',
        texto_mensaje: 'Quiero agendar una cita para manana por la tarde',
        patient_id: patientId,
        professional_id: professionalId,
        bot_username: 'fisioterapia_CarlaJL',
      },
    },
    {
      name: 'session_follow_up',
      expectedRoute: 'session_note',
      expectedAction: 'create_intake_and_reply',
      body: {
        chat_id: 'dryrun-chat-3',
        texto_mensaje: 'Paciente refiere dolor de hombro y menos movilidad desde ayer',
        patient_id: patientId,
        professional_id: professionalId,
      },
    },
    {
      name: 'appointment_command',
      expectedRoute: 'appointment',
      expectedAction: 'trigger_w1',
      body: {
        chat_id: 'dryrun-chat-4',
        texto_mensaje: '/cita 2026-03-10T18:00 2026-03-10T18:45 revision hombro',
        patient_id: patientId,
        professional_id: professionalId,
        bot_username: 'fisioterapia_CarlaJL',
      },
    },
    {
      name: 'physio_report_command',
      expectedRoute: 'exercise',
      expectedAction: 'trigger_w2_report',
      body: {
        chat_id: 'dryrun-chat-5',
        texto_mensaje: `/informe ${patientId} | Dolor cervical al girar cuello desde hace 3 dias`,
        professional_id: professionalId,
        bot_username: 'FisioIA_Agent_bot',
      },
    },
  ];
}

async function runCase(baseUrl, testCase) {
  const response = await fetch(`${baseUrl}/api/telegram/incoming?dry_run=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...testCase.body,
      dry_run: true,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await readJson(response);
  return { response, data };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = (args.baseUrl || args.base_url || 'http://localhost:3001').replace(/\/+$/, '');
  const patientId = args.patientId || args.patient_id || '9e8c7184-9805-4562-b0cc-7ecb9b350a0d';
  const professionalId = args.professionalId || args.professional_id || '4a194ec4-3580-4246-9452-0852b589fd63';
  const only = String(args.only || '').trim();

  const cases = buildCases({ patientId, professionalId }).filter((item) => !only || item.name === only);
  if (!cases.length) {
    console.error(`[telegram-dry-run] no cases matched --only=${only}`);
    process.exitCode = 1;
    return;
  }

  console.log('Telegram Dry Run Smoke');
  console.log('----------------------');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`patient_id: ${patientId}`);
  console.log(`professional_id: ${professionalId}`);

  let failed = 0;
  for (const testCase of cases) {
    const { response, data } = await runCase(baseUrl, testCase);
    const route = String(data?.classification?.route || '');
    const nextAction = String(data?.next_action || '');
    const ok =
      response.ok &&
      data?.ok === true &&
      data?.dry_run === true &&
      route === testCase.expectedRoute &&
      nextAction === testCase.expectedAction;

    console.log('');
    console.log(`[${testCase.name}]`);
    console.log(`http: ${response.status}`);
    console.log(`route: ${route || '-'}`);
    console.log(`next_action: ${nextAction || '-'}`);
    console.log(`reply_text: ${data?.reply_text || '-'}`);
    console.log(`result: ${ok ? 'OK' : 'FAILED'}`);

    if (!ok) {
      failed += 1;
      console.log(JSON.stringify(data, null, 2));
    }
  }

  if (failed > 0) {
    console.error('');
    console.error(`[telegram-dry-run] ${failed} case(s) failed`);
    process.exitCode = 1;
    return;
  }

  console.log('');
  console.log(`[telegram-dry-run] all ${cases.length} case(s) passed`);
}

main().catch((error) => {
  console.error('[telegram-dry-run] error:', error?.message || error);
  process.exitCode = 1;
});

