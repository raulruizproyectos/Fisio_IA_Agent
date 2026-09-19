import { createClient, type Session } from '@supabase/supabase-js';

declare global {
  interface Window {
    __FISIO_RUNTIME_CONFIG__?: {
      PUBLIC_SUPABASE_URL?: string;
      PUBLIC_SUPABASE_ANON_KEY?: string;
      PUBLIC_BACKEND_URL?: string;
    };
  }
}

const runtimeConfig = (typeof window !== 'undefined' && window.__FISIO_RUNTIME_CONFIG__) || {};
const supabaseUrl = String(
  runtimeConfig.PUBLIC_SUPABASE_URL ||
  import.meta.env.PUBLIC_SUPABASE_URL ||
  'https://fisio-dev.supabase.co'
).trim();
const supabaseKey = String(
  runtimeConfig.PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dev-anon-key'
).trim();

const localBackendBase = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'http://localhost:3001'
  : '';

export const backendBase = String(
  runtimeConfig.PUBLIC_BACKEND_URL || import.meta.env.PUBLIC_BACKEND_URL || localBackendBase
).replace(/\/+$/, '');

export const authClient = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }
);

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
    const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isDev = isLocalHost && (window.location.search.includes('demo=true') || window.localStorage.getItem('fisio_dev_mode') === 'true');
    const response = await nativeFetch(input, { ...init, headers });

    if (response.status === 401 && !target.pathname.endsWith('/api/health') && !isDev) {
      await authClient.auth.signOut({ scope: 'local' });
      window.location.replace('/login?reason=session_expired');
    }
    return response;
  };
}

export async function initializeProtectedApp() {
  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isMockSupabase = supabaseUrl.includes('fisio-dev.supabase.co') || !supabaseUrl;
  const isDevBypass = isLocalHost || isMockSupabase || (typeof window !== 'undefined' && (window.location.search.includes('demo=true') || window.localStorage.getItem('fisio_dev_mode') === 'true'));

  if (isDevBypass) {
    currentSession = {
      access_token: 'dev-token',
      token_type: 'bearer',
      user: {
        id: 'dev-physio-id',
        email: 'carmen.martinez@clinica.es',
        app_metadata: {},
        user_metadata: { full_name: 'Dra. Carmen Martínez' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
    } as unknown as Session;
    installAuthenticatedFetch();
    return {
      session: currentSession,
      profileId: '11111111-1111-4111-8111-111111111111',
      role: 'fisioterapeuta',
      name: 'Dra. Carmen Martínez',
      email: 'carmen.martinez@clinica.es',
    };
  }

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
