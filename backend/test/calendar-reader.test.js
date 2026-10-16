import test from 'node:test';
import assert from 'node:assert/strict';
import { readCalendarEventPages } from '../src/lib/calendar-reader.js';

test('Calendar reads continuation pages even after an empty first page', async () => {
  const calls = [];
  const client = { events: { async list(params, options) {
    calls.push(params);
    assert.equal(options.retry, false);
    assert.ok(options.timeout > 0 && options.timeout <= 8000);
    return { data: params.pageToken ? { items: [{ id: 'busy-page-2' }] } : { items: [], nextPageToken: 'page-2' } };
  } } };
  const params = { calendarId: 'fixture-calendar', timeMin: '2040-01-01T00:00Z', showDeleted: false };
  assert.deepEqual(await readCalendarEventPages(client, params), [{ id: 'busy-page-2' }]);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].calendarId, params.calendarId);
  assert.equal(calls[1].timeMin, params.timeMin);
  assert.equal(calls[1].showDeleted, false);
  assert.equal(params.pageToken, undefined);
});

test('Calendar rejects malformed, looping and failed pages without returning partial results', async () => {
  for (const data of [{}, { items: null }, { items: [null] }, { items: [{ id: '' }] },
    ...[false, null, '', 1, 'loop'].map(nextPageToken => ({ items: [], nextPageToken }))]) {
    await assert.rejects(readCalendarEventPages({ events: { list: async () => ({ data }) } }, {}));
  }
  let calls = 0;
  await assert.rejects(readCalendarEventPages({ events: { async list() {
    if (calls++) throw new Error('Fixture network failure');
    return { data: { items: [{ id: 'partial' }], nextPageToken: 'more' } };
  } } }, {}), /Fixture network failure/);
  assert.deepEqual(await readCalendarEventPages({ events: { list: async () => ({ data: { kind: 'calendar#events' } }) } }, {}), []);
});
