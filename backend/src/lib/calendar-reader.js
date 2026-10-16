// A short or empty page may still have a continuation token. Never return a partial calendar.
export async function readCalendarEventPages(client, params) {
  const events = [], tokens = new Set();
  const deadline = Date.now() + 20000;
  let pageToken;
  do {
    if (tokens.size >= 20 || Date.now() >= deadline) throw new Error('La lectura de Calendar no se pudo completar.');
    const { data } = await client.events.list({ ...params, ...(pageToken ? { pageToken } : {}) },
      { retry: false, timeout: Math.min(8000, deadline - Date.now()) });
    const items = data?.items ?? (data?.kind === 'calendar#events' && data.items === undefined ? [] : null);
    if (!Array.isArray(items) || items.some(event => !event || typeof event.id !== 'string' || !event.id)) {
      throw new Error('Calendar devolvió una lectura incompleta.');
    }
    events.push(...items);
    pageToken = data.nextPageToken;
    if (pageToken !== undefined && (typeof pageToken !== 'string' || !pageToken || tokens.has(pageToken))) {
      throw new Error('La paginación de Calendar no se pudo completar.');
    }
    if (pageToken) tokens.add(pageToken);
  } while (pageToken);
  return events;
}
