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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = (args.baseUrl || args.base_url || 'http://localhost:3001').replace(/\/+$/, '');
  const professionalId = args.professionalId || args.professional_id || '4a194ec4-3580-4246-9452-0852b589fd63';
  const patientId = args.patientId || args.patient_id || '923dcae8-0fd8-4070-b7ff-fd1d5e8df1c6';
  const patientName = args.patientName || args.patient_name || 'TestE2E';
  const recommendationId = args.recommendationId || args.recommendation_id || 'dry-run-physio-report';
  const symptomSummary = args.symptomSummary || args.symptom_summary || 'Dolor cervical al girar cuello desde hace 3 dias';

  const response = await fetch(`${baseUrl}/api/telegram/physio-report/send?dry_run=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fisioterapeuta_id: professionalId,
      patient_id: patientId,
      patient_name: patientName,
      recommendation_id: recommendationId,
      symptom_summary: symptomSummary,
      message_to_patient: 'Informe de prueba para validar targeting del bot fisio.',
      exercises: [
        {
          nombre: 'Movilidad cervical suave',
          zona_corporal: 'cervical',
          procedimiento: ['Sentado', 'Gira la cabeza lentamente a ambos lados', 'Repite 8 veces sin dolor agudo'],
          why: 'Ayuda a recuperar rango de movimiento sin sobrecargar la zona.',
          cautions: ['Detener si aparece mareo', 'No forzar el final del rango'],
        },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });

  const data = await readJson(response);
  console.log('Physio Report Dry Run');
  console.log('---------------------');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`HTTP: ${response.status}`);
  console.log(`ok: ${Boolean(data?.ok)}`);
  console.log(`dry_run: ${Boolean(data?.dry_run)}`);
  console.log(`target_source: ${data?.target_source || '-'}`);
  console.log(`recommendation_id: ${data?.recommendation_id || '-'}`);
  console.log(`pdf_bytes: ${data?.pdf_bytes || 0}`);

  if (!response.ok || !data?.ok || !data?.dry_run) {
    console.error(JSON.stringify(data, null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[physio-report-send-dry-run] error:', error?.message || error);
  process.exitCode = 1;
});
