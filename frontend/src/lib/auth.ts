import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = String(import.meta.env.PUBLIC_SUPABASE_URL || '').trim();
const supabaseKey = String(import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '').trim();

const localBackendBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001'
  : '';

export const backendBase = String(import.meta.env.PUBLIC_BACKEND_URL || localBackendBase).replace(/\/+$/, '');

export const authClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

let installed = false;
let currentSession: Session | null = null;

function installAuthenticatedFetch() {
  if (installed) return;
  installed = true;
  const nativeFetch = window.fetch.bind(window);
  const backendOrigin = new URL(backendBase).origin;

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const target = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      window.location.origin
    );
    if (target.origin !== backendOrigin) return nativeFetch(input, init);

    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (currentSession?.access_token) headers.set('Authorization', `Bearer ${currentSession.access_token}`);
    const response = await nativeFetch(input, { ...init, headers });
    if (response.status === 401 && !target.pathname.endsWith('/api/health')) {
      await authClient.auth.signOut({ scope: 'local' });
      window.location.replace('/login?reason=session_expired');
    }
    return response;
  };
}

export async function initializeProtectedApp() {
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase Auth no esta configurado en el frontend');
  if (!backendBase) throw new Error('El backend no esta configurado en el frontend');
  const { data, error } = await authClient.auth.getSession();
  if (error || !data.session) {
    window.location.replace('/login');
    throw new Error('Autenticacion requerida');
  }
  currentSession = data.session;
  installAuthenticatedFetch();

  const response = await window.fetch(`${backendBase}/api/me`);
  if (!response.ok) throw new Error('No se pudo cargar el perfil profesional');
  const profile = await response.json();

  authClient.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
    if (!session) window.location.replace('/login');
  });

  return {
    session: currentSession,
    profileId: profile?.profile_id || '',
    role: profile?.role || 'fisioterapeuta',
    name: profile?.name || currentSession.user.email || 'Profesional',
    email: profile?.email || currentSession.user.email || '',
  };
}

export async function signOut() {
  await authClient.auth.signOut();
  window.location.replace('/login');
}
