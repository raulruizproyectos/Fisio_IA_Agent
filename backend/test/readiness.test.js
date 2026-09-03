import test from 'node:test';
import assert from 'node:assert/strict';

import { buildIntegrationConfigurationReport } from '../src/lib/readiness.js';

test('readiness solo presenta Gmail cuando el puente de errores está configurado', () => {
  const report = buildIntegrationConfigurationReport({});
  const gmail = report.checks.find((item) => item.key === 'gmail');

  assert.equal(gmail.status, 'missing');
  assert.match(gmail.note, /credencial OAuth de Gmail/);

  const configured = buildIntegrationConfigurationReport({
    N8N_ERROR_WEBHOOK_URL: 'https://n8n.example/webhook/errors',
    N8N_WEBHOOK_SECRET: 'secret',
  });
  assert.equal(configured.checks.find((item) => item.key === 'gmail').status, 'configured');
});

test('readiness acepta motor IA directo y Calendar por cuenta de servicio', () => {
  const report = buildIntegrationConfigurationReport({
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    OPENAI_API_KEY: 'sk-test',
    GOOGLE_CALENDAR_ID: 'calendar@example.com',
    GOOGLE_CLIENT_EMAIL: 'service@example.iam.gserviceaccount.com',
    GOOGLE_PRIVATE_KEY: 'private-key',
  });

  assert.equal(report.checks.find((item) => item.key === 'clinical_ai').mode, 'openai_direct');
  assert.equal(report.checks.find((item) => item.key === 'google_calendar').mode, 'service_account');
  assert.equal(report.summary.missing_core, 0);
});

test('readiness exige secreto en los puentes n8n', () => {
  const report = buildIntegrationConfigurationReport({
    N8N_EXERCISE_WEBHOOK_URL: 'https://n8n.example/webhook/exercises',
    W5_CALENDAR_READER_URL: 'https://n8n.example/webhook/read',
    W6_CALENDAR_WRITER_URL: 'https://n8n.example/webhook/write',
  });

  assert.equal(report.checks.find((item) => item.key === 'clinical_ai').status, 'missing');
  assert.equal(report.checks.find((item) => item.key === 'google_calendar').status, 'missing');
});
