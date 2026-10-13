import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const directory = new URL('../../n8n/Fisio_IA_Agent/production/', import.meta.url);
const workflow = name => JSON.parse(readFileSync(new URL(name, directory), 'utf8'));
const writer = workflow('w6-calendar-writer.json');
const validate = writer.nodes.find(n => n.name === 'Validar operación').parameters.jsCode;
const calendarId = JSON.parse(validate.match(/const calendarId=(".*?");/)[1]);
const run = (code, context) => vm.runInNewContext('(function(){' + code + '})()', context)[0].json;

test('W6 rechaza acción, calendario, recurso y horario inválidos antes de llamar Google', () => {
  assert.equal(writer.nodes.find(n => n.name === 'Escribir evento').parameters.sendBody, true);
  assert.equal(writer.nodes.find(n => n.name === 'Leer o cancelar').parameters.sendBody, false);
  for (const body of [{ action: 'unknown' }, { action: 'delete' }, { action: 'create', summary: 'Fixture', start: 'invalid', end: 'invalid' },
    { action: 'get', event_id: '../other' }, { action: 'list' }, { action: 'create', calendar_id: 'other' }]) {
    assert.throws(() => run(validate, { $json: { body: { calendar_id: calendarId, ...body } } }));
  }
  const request = run(validate, { $json: { body: { calendar_id: calendarId, action: 'list', q: 'fixture', page_token: 'page 2' } } });
  assert.equal(request.method, 'GET'); assert.equal(request.sendBody, false);
  assert.match(request.url, /showDeleted=true/); assert.match(request.url, /singleEvents=false/); assert.match(request.url, /pageToken=page%202/);
});

test('W6 conserva evidencia de lectura y no confirma un cambio con ID ajeno o error', () => {
  const code = writer.nodes.find(n => n.name === 'Confirmar resultado').parameters.jsCode;
  const invoke = (action, statusCode, body) => run(code, { $json: { statusCode, body }, $: () => ({ first: () => ({ json: { action, eventId: 'fixture-id' } }) }) });
  assert.equal(invoke('update', 200, { id: 'other' }).ok, false);
  assert.equal(invoke('create', 200, {}).ok, false);
  assert.equal(invoke('get', 404, {}).ok, false);
  assert.equal(invoke('delete', 500, {}).ok, false);
  assert.equal(invoke('delete', 204, null).event_id, 'fixture-id');
  const data = { items: [{ id: 'fixture-id', status: 'cancelled' }], nextPageToken: 'next' };
  assert.equal(invoke('list', 200, data).data, data);
});

test('workflows de producción protegen webhooks y eliminan la segunda reserva del bot', () => {
  for (const filename of readdirSync(directory).filter(f => f.endsWith('.json'))) {
    const w = workflow(filename);
    for (const n of w.nodes.filter(n => n.type === 'n8n-nodes-base.webhook')) {
      assert.equal(n.parameters.authentication, 'headerAuth', filename);
      assert.ok(n.credentials.httpHeaderAuth.id, filename);
    }
    for (const n of w.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest' && n.parameters.sendBody)) {
      assert.equal(n.parameters.contentType, 'json', filename);
    }
  }
  const patient = workflow('bot-pacientes.json');
  assert.ok(!patient.nodes.some(n => ['Forzar cita?', 'Crear cita', 'Buscar vinculo'].includes(n.name)));
  const backend = patient.nodes.find(n => n.name === 'Resolver backend');
  assert.equal(backend.parameters.genericAuthType, 'httpHeaderAuth');
  const reply = patient.nodes.find(n => n.name === 'Preparar respuesta').parameters.jsCode;
  const result = run(reply, { $json: { statusCode: 503, body: { reply_text: 'False confirmation' } } });
  assert.doesNotMatch(result.reply_text, /False confirmation/);
});

test('bot paciente preparado para el agente de citas: reenvía el update completo y solo avisa sin confirmar nada', () => {
  const next = JSON.parse(readFileSync(new URL('../../n8n/Fisio_IA_Agent/pendiente-activacion/bot-pacientes.json', import.meta.url), 'utf8'));
  const agent = next.nodes.find(n => n.name === 'Agente de citas');
  assert.match(agent.parameters.url, /\/api\/telegram\/pilot-incoming$/);
  assert.equal(agent.parameters.genericAuthType, 'httpHeaderAuth');
  assert.equal(agent.parameters.contentType, 'json');
  assert.match(agent.parameters.jsonBody, /update_id: \$json\.update_id, message: \$json\.message/);
  const code = next.nodes.find(n => n.name === 'Sin respuesta del agente').parameters.jsCode;
  const $ = () => ({ item: { json: { message: { chat: { id: 77 } } } } });
  assert.equal(vm.runInNewContext('(function(){' + code + '})()', { $json: { statusCode: 200, body: { ok: true } }, $ }).length, 0);
  assert.equal(vm.runInNewContext('(function(){' + code + '})()', { $json: { statusCode: 503, body: {} }, $ })[0].json.chat_id, 77);
  const notice = next.nodes.find(n => n.name === 'Aviso seguro').parameters.text;
  assert.doesNotMatch(notice, /\{\{|confirmad[ao] para/);
  assert.ok(!next.nodes.some(n => n.type === 'n8n-nodes-base.webhook'));
});

test('avisos del agente: webhooks con secreto, n8n solo transporta y responde si Telegram aceptó', () => {
  const flow = JSON.parse(readFileSync(new URL('../../n8n/Fisio_IA_Agent/pendiente-activacion/avisos-agente-citas.json', import.meta.url), 'utf8'));
  const byName = Object.fromEntries(flow.nodes.map(node => [node.name, node]));
  for (const name of ['Solicitud de contacto', 'Aviso al paciente']) {
    assert.equal(byName[name].parameters.authentication, 'headerAuth');
    assert.ok(byName[name].credentials.httpHeaderAuth.id);
  }
  for (const [sender, ok, failed] of [['Aviso al fisio', 'Aviso al fisio enviado', 'Aviso al fisio no enviado'],
    ['Mensaje al paciente', 'Mensaje al paciente enviado', 'Mensaje al paciente no enviado']]) {
    assert.equal(byName[sender].onError, 'continueErrorOutput');
    assert.match(byName[sender].parameters.text, /\$json\.body\.text/);
    assert.deepEqual(flow.connections[sender].main.map(branch => branch[0].node), [ok, failed]);
    assert.match(byName[ok].parameters.responseBody, /"sent": true/);
    assert.match(byName[failed].parameters.responseBody, /"sent": false/);
  }
  assert.equal(byName['Mensaje al paciente'].credentials.telegramApi.name, 'citas_fisioterapia_bot');
  assert.match(byName['Reenviar avisos pendientes'].parameters.url, /\/api\/cron\/avisos-agente$/);
  assert.equal(byName['Reenviar avisos pendientes'].credentials.httpHeaderAuth.name, 'N8N_INTERNAL_HEADER_CREDENTIAL_ID');
});
