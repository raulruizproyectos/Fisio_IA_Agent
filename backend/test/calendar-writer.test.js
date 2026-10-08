import test from 'node:test';
import assert from 'node:assert/strict';
import { publicErrorMessage } from '../src/lib/public-error.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the shared writer itself, substituting only its two external transports.
const source = readFileSync(new URL('../src/routes/professional.js', import.meta.url), 'utf8');
const writerSource = source.slice(source.indexOf('async function syncAppointmentViaW6('), source.indexOf('\nasync function resolveCrmPatientId('));
const resultSource = source.slice(source.indexOf('function buildCalendarSyncResult('), source.indexOf('\nfunction getGoogleCalendarClient('));
function writer({ client = null, response = () => Response.json({ ok: true, event_id: 'event-a' }), enabled = true } = {}) {
  const calls = [];
  const context = vm.createContext({
    publicErrorMessage,
    AbortSignal, GOOGLE_CALENDAR_ID: 'fixture-calendar', GOOGLE_CALENDAR_REQUIRED: false,
    W6_CALENDAR_WRITER_URL: 'https://writer.example/test', N8N_WEBHOOK_SECRET: 'fixture-secret',
    calendarIntegrationEnabled: () => enabled, calendarW6Enabled: () => true,
    getGoogleCalendarClient: () => typeof client === 'function' ? client() : client,
    fetch: async (_url, options) => { calls.push(JSON.parse(options.body)); return response(); },
  });
  vm.runInContext(`${resultSource}\n${writerSource}`, context);
  return { calls, sync: options => context.syncAppointmentToGoogleCalendar(options) };
}

test('un resultado directo incierto no repite la escritura a través de W6', async () => {
  for (const action of ['create', 'update', 'cancel']) {
    for (const failure of [new Error('Response lost after commit'), Object.assign(new Error('Unavailable'), { response: { status: 503 } })]) {
      let attempts = 0;
      let requestOptions;
      const mutation = async (_params, options) => {
        attempts++;
        requestOptions = options;
        throw failure;
      };
      const { sync, calls } = writer({ client: { events: { insert: mutation, patch: mutation, delete: mutation } } });
      const result = await sync({ action, eventId: action === 'create' ? null : 'event-a', payload: {} });
      assert.equal(attempts, 1);
      assert.equal(calls.length, 0, 'No debe cambiar de transporte tras una mutación incierta');
      assert.equal(result.status, 'error');
      assert.equal(requestOptions?.retry, false);
      assert.equal(requestOptions?.timeout, 10000);
    }
  }
  const brokenClient = writer({ client: () => { throw new Error('Invalid local credentials'); } });
  assert.equal((await brokenClient.sync({ action: 'create', payload: {} })).status, 'error');
  assert.equal(brokenClient.calls.length, 0);
});

test('Calendar exige confirmaciones completas y usa W6 solamente si no hay cliente directo', async () => {
  const complete = writer({ client: { events: { insert: async () => ({ data: { id: 'event-a' } }) } } });
  assert.equal((await complete.sync({ action: 'create', payload: {} })).status, 'synced');
  assert.equal(complete.calls.length, 0);
  for (const id of [undefined, '', '   ', 42]) {
    const incomplete = writer({ client: { events: { insert: async () => ({ data: { id } }) } } });
    assert.equal((await incomplete.sync({ action: 'create', payload: {} })).status, 'error');
    assert.equal(incomplete.calls.length, 0);
  }
  for (const status of [404, 410]) {
    const cancelled = writer({ client: { events: { delete: async () => { throw { response: { status } }; } } } });
    assert.equal((await cancelled.sync({ action: 'cancel', eventId: 'event-a' })).status, 'synced');
    assert.equal(cancelled.calls.length, 0);
  }
  for (const body of [{ ok: 'false', event_id: 'event-a' }, { ok: true }, { ok: true, event_id: '' }, { ok: true, event_id: 42 }]) {
    const incomplete = writer({ response: () => Response.json(body) });
    assert.equal((await incomplete.sync({ action: 'create', payload: {} })).status, 'error');
    assert.equal(incomplete.calls.length, 1);
  }
  const mismatch = writer({ response: () => Response.json({ ok: true, event_id: 'other-event' }) });
  assert.equal((await mismatch.sync({ action: 'update', eventId: 'event-a', payload: {} })).status, 'error');
  for (const action of ['create', 'update', 'cancel']) {
    const fallback = writer({ response: () => Response.json({ ok: true, event_id: action === 'cancel' ? null : 'event-a' }) });
    assert.equal((await fallback.sync({ action, eventId: action === 'create' ? null : 'event-a', payload: {} })).status, 'synced');
    assert.equal(fallback.calls.length, 1);
    assert.equal(fallback.calls[0].action, action);
  }
  for (const response of [() => { throw new Error('Response lost'); }, () => new Response('', { status: 503 }), () => new Response('not json')]) {
    const failed = writer({ response });
    assert.equal((await failed.sync({ action: 'create', payload: {} })).status, 'error');
    assert.equal(failed.calls.length, 1);
  }
  const disabled = writer({ enabled: false });
  assert.equal((await disabled.sync({ action: 'create', payload: {} })).status, 'skipped');
  assert.equal(disabled.calls.length, 0);
});
