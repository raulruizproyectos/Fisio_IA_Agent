// Display name of the clinic for PDFs and patient-facing assistants. Read from
// crm_clinicas (cached 5 min); CLINIC_DISPLAY_NAME is the fallback when the
// table cannot be read or no single active clinic can be chosen. The database
// client is loaded lazily so the PDF builder stays importable without env.
const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_NAME = 'Clínica de fisioterapia';
const cache = new Map();

export function fallbackClinicName() {
  return String(process.env.CLINIC_DISPLAY_NAME || '').trim() || DEFAULT_NAME;
}

async function readClinicName(clinicId) {
  const { serviceSupabase } = await import('./supabase.js');
  let query = serviceSupabase.from('crm_clinicas').select('id, nombre').eq('activo', true);
  query = clinicId ? query.eq('id', clinicId).limit(1) : query.order('created_at', { ascending: true }).limit(2);
  const { data, error } = await query;
  if (error) throw error;
  // Without an explicit clinic, only an unambiguous single active clinic counts.
  if (!Array.isArray(data) || data.length !== 1) return null;
  return String(data[0].nombre || '').trim() || null;
}

export async function getClinicDisplayName(clinicId = null) {
  const key = clinicId || '*';
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.name;
  let name = null;
  try {
    name = await readClinicName(clinicId);
  } catch (error) {
    console.warn('[clinic-brand] No se pudo leer el nombre de la clínica:', error?.message || error);
  }
  const resolved = name || fallbackClinicName();
  // A failed or ambiguous read is cached too, so the fallback does not hammer the database.
  cache.set(key, { name: resolved, expires: Date.now() + CACHE_TTL_MS });
  return resolved;
}

export function clearClinicBrandCache() {
  cache.clear();
}
