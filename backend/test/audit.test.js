import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

const { recordAudit, resolveActorType } = await import('../src/lib/audit.js');

test('resolveActorType clasifica correctamente los diferentes roles y canales', () => {
  assert.equal(resolveActorType(null), 'system');
  assert.equal(resolveActorType({ role: 'admin' }), 'admin');
  assert.equal(resolveActorType({ role: 'fisioterapeuta' }), 'fisioterapeuta');
  assert.equal(resolveActorType({ actor_type: 'telegram' }), 'telegram');
  assert.equal(resolveActorType({ actor_type: 'public_booking' }), 'paciente');
  assert.equal(resolveActorType({ actor_type: 'internal' }), 'system');
});

test('recordAudit ignora llamadas sin entity_type o action', async () => {
  const result = await recordAudit({}, { entity_type: '', action: '' });
  assert.equal(result, null);
});

test('recordAudit construye payload con sanitizacion de UUID y metadata', async () => {
  const fakeReq = {
    id: '11111111-1111-4111-8111-111111111111',
    ip: '127.0.0.1',
    auth: {
      profile_id: '22222222-2222-4222-8222-222222222222',
      role: 'fisioterapeuta',
    },
    get(header) {
      if (header.toLowerCase() === 'user-agent') return 'TestAgent/1.0';
      return null;
    },
  };

  const result = await recordAudit(fakeReq, {
    entity_type: 'paciente',
    entity_id: '33333333-3333-4333-8333-333333333333',
    action: 'read_ficha',
    metadata: { section: 'clinical_history' },
  });

  assert.ok(result);
  assert.equal(result.payload.entity_type, 'paciente');
  assert.equal(result.payload.entity_id, '33333333-3333-4333-8333-333333333333');
  assert.equal(result.payload.action, 'read_ficha');
  assert.equal(result.payload.actor_type, 'fisioterapeuta');
  assert.equal(result.payload.actor_id, '22222222-2222-4222-8222-222222222222');
  assert.equal(result.payload.request_id, '11111111-1111-4111-8111-111111111111');
  assert.equal(result.payload.metadata.section, 'clinical_history');
  assert.equal(result.payload.metadata.userAgent, 'TestAgent/1.0');
});

test('recordAudit aisla IDs no UUID en metadata sin romper la ejecucion', async () => {
  const fakeReq = {
    id: 'custom-non-uuid-request-id-123',
    ip: '127.0.0.1',
    auth: { role: 'admin' },
  };

  const result = await recordAudit(fakeReq, {
    entity_type: 'paciente',
    entity_id: 'legacy-numeric-999',
    action: 'delete',
  });

  assert.ok(result);
  assert.equal(result.payload.entity_id, null);
  assert.equal(result.payload.request_id, null);
  assert.equal(result.payload.metadata.raw_entity_id, 'legacy-numeric-999');
  assert.equal(result.payload.metadata.custom_request_id, 'custom-non-uuid-request-id-123');
});
