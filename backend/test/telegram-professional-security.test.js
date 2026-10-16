import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.DEFAULT_PROFESSIONAL_ID = 'fixture-professional';
process.env.TELEGRAM_PHYSIO_BOT_TOKEN = 'fixture-bot-token';
process.env.OPENAI_API_KEY = 'fixture-openai-key';
delete process.env.TELEGRAM_PHYSIO_REPORTS_CHAT_ID;

const { default: router } = await import('../src/routes/telegram.js');
const { runWithRequestContext } = await import('../src/lib/supabase.js');
const incoming = router.stack.find(layer => layer.route?.path === '/incoming').route.stack[0].handle;
const command = '/informe aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee | Dolor cervical desde ayer';

async function invoke(body, { storedChat = 'professional-chat', environmentChat = null } = {}) {
  const writes = [];
  const requests = [];
  const db = { from(table) {
    const chain = new Proxy({}, { get(_target, key) {
      if (key === 'update' || key === 'insert' || key === 'upsert') return payload => { writes.push({ table, payload }); return chain; };
      if (key === 'maybeSingle' || key === 'single') return async () => ({
        data: table === 'crm_perfiles' ? { id: 'fixture-professional', telegram_chat_id: storedChat } : null,
        error: null,
      });
      return () => chain;
    } });
    return chain;
  } };
  const originalFetch = globalThis.fetch;
  const previousChat = process.env.TELEGRAM_PHYSIO_REPORTS_CHAT_ID;
  if (environmentChat) process.env.TELEGRAM_PHYSIO_REPORTS_CHAT_ID = environmentChat;
  else delete process.env.TELEGRAM_PHYSIO_REPORTS_CHAT_ID;
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    assert.ok(String(url).endsWith('/api/exercises/recommend'), 'No external call is needed for this fixture');
    return Response.json({ ok: true, recommendation_id: 'fixture-recommendation', informe_clinico: 'Fixture draft' });
  };
  const res = { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  try {
    await runWithRequestContext({ supabase: db, auth: { actor_type: 'internal' } }, () => incoming({ body, query: {},
      protocol: 'http', get: () => 'fixture.invalid' }, res, error => { throw error; }));
    return { res, writes, requests };
  } finally {
    globalThis.fetch = originalFetch;
    if (previousChat === undefined) delete process.env.TELEGRAM_PHYSIO_REPORTS_CHAT_ID;
    else process.env.TELEGRAM_PHYSIO_REPORTS_CHAT_ID = previousChat;
  }
}

test('el transporte de confianza no permite que otro chat suplante al profesional o cambie su vínculo', async () => {
  const { res, writes, requests } = await invoke({ chat_id: 'untrusted-chat', texto_mensaje: command,
    agent_mode: 'physio_reports', professional_id: 'fixture-professional' });
  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /chat no está autorizado/);
  assert.equal(writes.length, 0);
  assert.equal(requests.length, 0);
});

test('el rechazo del chat ocurre antes de descargar o transcribir un audio', async () => {
  const { res, writes, requests } = await invoke({ chat_id: 'untrusted-chat', voice_file_id: 'fixture-audio', agent_mode: 'physio_reports' });
  assert.equal(res.statusCode, 403);
  assert.equal(writes.length, 0);
  assert.equal(requests.length, 0);
});

test('sin destino profesional configurado se rechaza en lugar de vincular al primer remitente', async () => {
  const { res, writes, requests } = await invoke({ chat_id: 'first-contact', texto_mensaje: command, agent_mode: 'physio_reports' }, { storedChat: null });
  assert.equal(res.statusCode, 403);
  assert.equal(writes.length, 0);
  assert.equal(requests.length, 0);
});

test('el chat previamente guardado genera el borrador sin modificar su vínculo', async () => {
  const { res, writes, requests } = await invoke({ chat_id: 'professional-chat', texto_mensaje: command, agent_mode: 'physio_reports' });
  assert.equal(res.statusCode, 200);
  assert.match(res.body.reply_text, /BORRADOR PENDIENTE DE REVISIÓN/);
  assert.match(res.body.reply_text, /fixture-recommendation/);
  assert.equal(writes.length, 0);
  assert.equal(requests.length, 1);
  assert.equal(JSON.parse(requests[0].options.body).fisioterapeuta_id, 'fixture-professional');
});

test('el destino explícitamente configurado prevalece sobre el guardado y no sobre el cuerpo recibido', async () => {
  const body = { chat_id: 'environment-chat', texto_mensaje: command, agent_mode: 'physio_reports' };
  assert.equal((await invoke(body, { environmentChat: 'environment-chat' })).res.statusCode, 200);
  const denied = await invoke({ ...body, chat_id: 'professional-chat' }, { environmentChat: 'environment-chat' });
  assert.equal(denied.res.statusCode, 403);
  assert.equal(denied.requests.length, 0);
  assert.equal(denied.writes.length, 0);
});

test('la simulación custom permanece disponible y no vincula ni genera', async () => {
  const { res, writes, requests } = await invoke({ chat_id: 'simulation-chat', texto_mensaje: command, agent_mode: 'physio_reports', dry_run: true }, { storedChat: null });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.dry_run, true);
  assert.equal(writes.length, 0);
  assert.equal(requests.length, 0);
});
