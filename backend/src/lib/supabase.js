import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient } from '@supabase/supabase-js';

const requestStorage = new AsyncLocalStorage();

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

const url = requiredEnv('SUPABASE_URL');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

export const serviceSupabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export function createUserSupabase(accessToken) {
  const publicKey = requiredEnv('SUPABASE_ANON_KEY');
  return createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function runWithRequestContext(context, next) {
  return requestStorage.run(context, next);
}

export function getRequestContext() {
  return requestStorage.getStore() || null;
}

// Compatibility proxy for the existing route modules. The concrete client is
// selected per request and there is deliberately no privileged fallback.
export const supabase = new Proxy({}, {
  get(_target, property) {
    const client = requestStorage.getStore()?.supabase;
    if (!client) throw new Error('Contexto de base de datos no inicializado');
    const value = client[property];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
