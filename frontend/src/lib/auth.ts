declare global {
  interface Window {
    __FISIO_RUNTIME_CONFIG__?: {
      PUBLIC_SUPABASE_URL?: string;
      PUBLIC_BACKEND_URL?: string;
    };
  }
}

const runtimeConfig = (typeof window !== 'undefined' && window.__FISIO_RUNTIME_CONFIG__) || {};
const isLocalEnv = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const defaultBackendBase = typeof window !== 'undefined' && window.location.hostname.includes('b5xbaf.easypanel.host')
  ? 'https://fisio-backend.b5xbaf.easypanel.host' : isLocalEnv ? `http://${window.location.hostname}:3001` : '';
export const backendBase = String(runtimeConfig.PUBLIC_BACKEND_URL || import.meta.env.PUBLIC_BACKEND_URL || defaultBackendBase).replace(/\/+$/, '');

// Existing browser sessions must log in again; remove only this project's legacy Supabase storage.
if (typeof window !== 'undefined') {
  try {
    const url = new URL(runtimeConfig.PUBLIC_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL || 'https://fisio-dev.supabase.co');
    const key = `sb-${url.hostname.split('.')[0]}-auth-token`;
    for (const suffix of ['', '-user', '-code-verifier']) window.localStorage.removeItem(key + suffix);
  } catch { /* Storage may be disabled; authentication no longer uses it. */ }
}

let installed = false;
const nativeFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : fetch;
let checkingSession: ReturnType<typeof requestAuth> | null = null;

export async function requestAuth(action: string, body: Record<string, string> = {}) {
  try {
    const response = await nativeFetch(`${backendBase}/api/auth/${action}`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Fisio-CSRF': '1' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return { data: response.ok ? data : null, error: response.ok ? null : String(data.error || 'No se pudo verificar la sesión'), status: response.status };
  } catch { return { data: null, error: 'No se pudo conectar con el servidor', status: 503 }; }
}

function checkSession() {
  if (!checkingSession) checkingSession = requestAuth('session').finally(() => { checkingSession = null; });
  return checkingSession;
}

function installAuthenticatedFetch(demo = false) {
  if (installed) return;
  installed = true;
  const api = new URL(`${backendBase}/api/`, window.location.origin);
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin);
    if (target.origin !== api.origin || !target.pathname.startsWith(api.pathname)) return nativeFetch(input, init);
    const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (demo) {
      headers.set('Authorization', 'Bearer dev-token');
      return nativeFetch(input, { ...init, headers, credentials: 'omit' });
    }
    headers.set('X-Fisio-CSRF', '1');
    const safe = ['GET', 'HEAD', 'OPTIONS'].includes(method);
    if (!safe) {
      const session = await checkSession();
      if (session.error) {
        if (session.status === 401) window.location.replace('/login?reason=session_expired');
        return Response.json({ error: session.error }, { status: session.status });
      }
    }
    const options = { ...init, headers, credentials: 'include' as RequestCredentials };
    let response = await nativeFetch(input, options);
    if (safe && response.status === 401) {
      const failure = await response.clone().json().catch(() => ({}));
      if (failure.code === 'AUTH_SESSION_REQUIRED') {
        const session = await checkSession();
        if (!session.error) response = await nativeFetch(input, options);
        else if (session.status !== 401) return Response.json({ error: session.error }, { status: session.status });
      }
    }
    // Mutations are sent once. Authentication failures never replay a clinical write.
    if (response.status === 401) window.location.replace('/login?reason=session_expired');
    return response;
  };
}

export async function initializeProtectedApp() {
  const isDevBypass = import.meta.env.DEV && typeof window !== 'undefined'
    && (new URLSearchParams(window.location.search).get('demo') === 'true' || window.localStorage.getItem('fisio_dev_mode') === 'true');
  if (isDevBypass) {
    installAuthenticatedFetch(true);
    return { profileId: '6dae4ef6-b6b3-4cb0-91d9-0320d10db255', clinicId: '', clinicName: '', role: 'fisioterapeuta', name: 'Dra. Carmen Martínez', email: 'carmen.martinez@clinica.es' };
  }
  if (!backendBase) throw new Error('El backend no esta configurado en el frontend');
  const session = await checkSession();
  if (session.error) {
    if (session.status === 401) window.location.replace('/login');
    throw new Error(session.status === 401 ? 'Autenticacion requerida' : session.error);
  }
  installAuthenticatedFetch();
  const profile = session.data;
  return { profileId: profile?.profile_id || '', clinicId: profile?.clinic_id || '', clinicName: profile?.clinic_name || '',
    role: profile?.role || 'fisioterapeuta', name: profile?.name || profile?.email || 'Profesional', email: profile?.email || '' };
}

export async function signOut() {
  const { error, status } = await requestAuth('logout');
  if (error && status !== 401) throw new Error(error);
  window.location.replace('/login');
}
