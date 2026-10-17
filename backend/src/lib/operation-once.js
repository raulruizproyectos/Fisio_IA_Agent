import { supabase } from './supabase.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// A PostgREST/Postgres error code means the database answered: nothing was written by this request.
const isDefiniteFailure = (error) => Boolean(error?.code) && !/fetch|network|timeout|abort/i.test(String(error?.message || ''));

/**
 * Runs one finance write at most once per Idempotency-Key (claim → write → finish/release).
 * `write` returns `{ data, error }` like supabase-js. Without a key, or before the receipts migration exists,
 * it behaves exactly as before. A retry after success replays the stored result; a retry whose first
 * attempt has an unknown outcome is refused (PT409) instead of writing again.
 */
export async function writeOnce(req, kind, payload, write) {
  const key = String(req.get?.('Idempotency-Key') || '').trim();
  if (!key) return write();
  if (!UUID.test(key)) return { data: null, error: { code: 'PT400', message: 'Clave de operación inválida' } };

  const claim = await supabase.rpc('claim_clinic_operation', { operation_id: key, kind, payload });
  if (claim.error?.code === 'PGRST202') return write();
  if (claim.error) return { data: null, error: claim.error };
  if (claim.data?.state === 'replay') return { data: claim.data.result, error: null, replayed: true };
  if (claim.data?.state !== 'claimed') {
    return { data: null, error: { code: 'PT409', message: 'La operación anterior no confirmó su resultado. Revisa la lista antes de repetirla.' } };
  }

  const result = await write();
  if (result.error) {
    if (isDefiniteFailure(result.error)) {
      const released = await supabase.rpc('release_clinic_operation', { operation_id: key });
      if (released.error) console.warn('[operation-once] no se pudo liberar el recibo tras un fallo', { kind, code: released.error.code });
    }
    return result;
  }
  const finished = await supabase.rpc('finish_clinic_operation', { operation_id: key, result: result.data });
  // The write is done; a missing receipt only makes a later retry report «uncertain», never duplicate.
  if (finished.error) console.warn('[operation-once] no se pudo cerrar el recibo', { kind, code: finished.error.code });
  return result;
}
