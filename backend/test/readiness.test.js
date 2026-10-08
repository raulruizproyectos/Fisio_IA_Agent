import test from 'node:test';
import assert from 'node:assert/strict';

import { buildIntegrationConfigurationReport, buildReadinessReport, getReadinessStatusCode } from '../src/lib/readiness.js';
const rpc = async () => ({error:{code:'42501'}});

test('readiness falla si falta el estado durable de comprobación de Calendar', async () => {
  const report = await buildReadinessReport({
    env: { SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'local', SUPABASE_SERVICE_ROLE_KEY: 'local', OPENAI_API_KEY: 'local' },
    supabase: { rpc, from() { return { select(columns) { this.columns = columns; return this; }, async limit() {
      return this.columns.includes('calendar_sync_in_flight') ? { error: { code: '42703', message: 'missing Calendar verification state' } } : {};
    } }; } },
  });
  assert.equal(report.checks.find(c => c.key === 'calendar_verification').status, 'error');
  assert.equal(getReadinessStatusCode(report), 503);
});

test('readiness falla si falta la marca persistente de Calendar', async () => {
  const report = await buildReadinessReport({
    env: { SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'local', SUPABASE_SERVICE_ROLE_KEY: 'local', OPENAI_API_KEY: 'local' },
    supabase: { rpc, from() { return { select(columns) { this.columns = columns; return this; }, async limit() {
      return this.columns.includes('calendar_sync_pending') ? { error: { code: '42703', message: 'column calendar_sync_pending does not exist' } } : {};
    } }; } },
  });
  assert.equal(report.checks.find(c => c.key === 'calendar_persistence').status, 'error');
  assert.equal(getReadinessStatusCode(report), 503);
});

test('readiness falla si falta la recuperación de reservas públicas', async () => {
  const report=await buildReadinessReport({
    env:{SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'local',SUPABASE_SERVICE_ROLE_KEY:'local',OPENAI_API_KEY:'local'},
    supabase:{rpc,from(){return {select(columns){this.columns=columns;return this;},async limit(){
      return this.columns.includes('public_booking_hash') ? {error:{code:'42703',message:'column public_booking_hash does not exist'}} : {};
    }};}},
  });
  assert.equal(report.checks.find(c=>c.key==='citas').status,'error');
  assert.equal(getReadinessStatusCode(report),503);
});

test('readiness verifica la RPC sin escribir y falla si falta la protección de altas',async()=>{
  const env={SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'local',SUPABASE_SERVICE_ROLE_KEY:'local',OPENAI_API_KEY:'local'};
  const supabase={from(){return {select(){return this;},async limit(){return {};}};},async rpc(name,args){
    assert.equal(name,'create_clinic_record_once');assert.deepEqual(args,{operation_id:null,kind:null,fields:null});
    return {error:{code:'PGRST202'}};
  }};
  const report=await buildReadinessReport({supabase,env});
  assert.equal(report.checks.find(c=>c.key==='creation_retries').status,'missing');assert.equal(getReadinessStatusCode(report),503);
});

test('readiness impide desplegar facturación sin la vinculación de cobros', async () => {
  const report = await buildReadinessReport({
    env: { SUPABASE_URL:'https://example.supabase.co', SUPABASE_ANON_KEY:'anon', SUPABASE_SERVICE_ROLE_KEY:'service', OPENAI_API_KEY:'test' },
    supabase: { rpc, from() { return { select(columns) { this.columns=columns; return this; }, async limit() {
      return this.columns==='factura_id' ? {error:{code:'42703',message:'column factura_id does not exist'}} : {};
    } }; } },
  });
  assert.equal(report.checks.find(check=>check.key==='financial_integrity').status,'error');
  assert.equal(getReadinessStatusCode(report),503);
});

test('piloto desactivado no exige tablas nuevas; activado detecta configuración y migración ausentes', async () => {
  const env={ SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service',OPENAI_API_KEY:'test' };
  const supabase={ rpc, from(table) { return { select() { return this; }, async limit() { return table.startsWith('crm_mensajeria') || table === 'crm_whatsapp_envios' ? { error:{ code:'PGRST205',message:'missing '+table } } : {}; } }; } };
  const disabled=await buildReadinessReport({supabase,env});
  assert.equal(disabled.checks.some(check=>check.table === 'crm_whatsapp_envios'),false);
  assert.equal(disabled.integrations.find(check=>check.key==='whatsapp_pilot').status,'not_used');
  const active=await buildReadinessReport({supabase,env:{...env,OPENWA_PILOT_ENABLED:'true'}});
  assert.equal(active.checks.find(check=>check.table==='crm_whatsapp_envios').status,'missing');
  assert.equal(active.integrations.find(check=>check.key==='whatsapp_pilot').status,'missing');
  assert.equal(getReadinessStatusCode(active),503);
});

test('readiness detecta que falta la migracion de contenido y revision aunque la tabla ya exista', async () => {
  const report = await buildReadinessReport({
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service', OPENAI_API_KEY: 'test' },
    supabase: { rpc, from() { return { select(columns) { this.columns = columns; return this; }, async limit() {
      return this.columns.includes('report_snapshot') ? { error: { code: '42703', message: 'column report_snapshot does not exist' } } : {};
    } }; } },
  });
  const check = report.checks.find((item) => item.key === 'exercise_approval');
  assert.equal(check.status, 'error');
  assert.match(check.migration, /clinical_approval_integrity/);
  assert.equal(getReadinessStatusCode(report), 503);
});

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
