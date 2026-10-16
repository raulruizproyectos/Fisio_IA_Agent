import { fetchJson } from './http';

export const createClinicRecord = async (profileId: string, url: string, body: any, timeoutMs = 8000, editor = 'manual') => {
  // shortcut: pending IDs survive reloads in this tab; cross-device draft recovery would need a server-side draft.
  const storageKey = `fisio.pending-create:${profileId}:${url}:${body.paciente_id || 'patient'}:${body.audio_processed !== undefined ? 'voice' : editor}`;
  const pending = JSON.parse(sessionStorage.getItem(storageKey) || 'null') || {
    key: crypto.randomUUID(),
    ...(body.audio_processed !== undefined ? { fecha: body.fecha, session_datetime: body.session_datetime } : {}),
  };
  sessionStorage.setItem(storageKey, JSON.stringify(pending)); // Fail before writing if durable tab storage is unavailable.
  const fields = { ...body, ...(body.audio_processed !== undefined ? { fecha: pending.fecha, session_datetime: pending.session_datetime } : {}) };
  try {
    const result = await fetchJson(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': pending.key }, body: JSON.stringify(fields),
    }, timeoutMs);
    if (!result?.data?.id) throw new Error('Respuesta de guardado incompleta');
    sessionStorage.removeItem(storageKey);
    return result;
  } catch (err: any) {
    if (err.code === 'CREATE_ALREADY_SAVED' && err.recoveredData?.id) sessionStorage.removeItem(storageKey);
    if (!err.status) throw new Error('No se ha recibido confirmación. Conserva el formulario y vuelve a guardar: se comprobará el mismo guardado sin duplicarlo.', { cause: err });
    throw err;
  }
};
