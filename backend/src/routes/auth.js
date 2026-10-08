import crypto from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticateProfessional } from '../middleware/security.js';
import { serviceSupabase } from '../lib/supabase.js';
import { readBrowserCookie, writeBrowserCookie, writeBrowserSession, clearBrowserSession, requireBrowserOrigin } from '../lib/browser-session.js';

const router = Router();
const refreshes = new Map();
const limit = (count, minutes) => rateLimit({
  windowMs: minutes * 60 * 1000, limit: count, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Demasiados intentos. Inténtalo de nuevo más tarde.' },
});

router.use(requireBrowserOrigin);

function fields(body, names) {
  return body && typeof body === 'object' && !Array.isArray(body)
    && Object.keys(body).every(name => names.includes(name))
    && names.every(name => typeof body[name] === 'string');
}
const emailValid = email => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const invalid = res => res.status(400).json({ error: 'Revisa los datos de acceso' });

async function authRequest(path, body, accessToken) {
  try {
    const response = await fetch(`${String(process.env.SUPABASE_URL).replace(/\/+$/, '')}/auth/v1/${path}`, {
      method: accessToken ? 'PUT' : 'POST', signal: AbortSignal.timeout(10000),
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken || process.env.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let status = 503;
      if (response.status === 429) status = 429;
      else if (accessToken && [400, 422].includes(response.status)) status = 400;
      else if ([400, 401, 403, 422].includes(response.status)) status = 401;
      throw Object.assign(new Error('No se pudo completar la autenticación'), { status });
    }
    return await response.json();
  } catch (error) {
    if ([400, 401, 429, 503].includes(error.status)) throw error;
    throw Object.assign(new Error('Auth no disponible. Inténtalo más tarde.'), { status: 503 });
  }
}

function handle(handler) {
  return async (req, res) => {
    try { await handler(req, res); }
    catch (error) {
      if (error.status === 401 || error.status === 403) clearBrowserSession(res);
      let message = 'No se pudo completar la autenticación. Revisa tus credenciales o inténtalo más tarde.';
      if (error.status === 400) message = 'La contraseña no cumple los requisitos del servicio.';
      else if (error.status === 403) message = 'Perfil profesional sin una clínica activa autorizada';
      res.status([400, 401, 403, 429, 503].includes(error.status) ? error.status : 503).json({ error: message });
    }
  };
}

async function publishSession(res, session) {
  if (typeof session?.access_token !== 'string' || !session.access_token || typeof session?.refresh_token !== 'string' || !session.refresh_token) {
    throw Object.assign(new Error('Respuesta de sesión incompleta'), { status: 503 });
  }
  const context = await authenticateProfessional(session?.access_token);
  writeBrowserSession(res, session);
  return context.auth;
}

router.post('/login', limit(10, 15), handle(async (req, res) => {
  if (!fields(req.body, ['email', 'password']) || !emailValid(req.body.email)
    || !req.body.password.length || req.body.password.length > 1024) return invalid(res);
  const session = await authRequest('token?grant_type=password', req.body);
  res.json(await publishSession(res, session));
}));

router.post('/session', limit(60, 15), handle(async (req, res) => {
  if (!fields(req.body, [])) return invalid(res);
  const access = readBrowserCookie(req, 'access');
  if (access) {
    try { return res.json((await authenticateProfessional(access)).auth); }
    catch (error) { if (error.status !== 401) throw error; }
  }
  const refresh = readBrowserCookie(req, 'refresh');
  if (!refresh) throw Object.assign(new Error('Autenticacion requerida'), { status: 401 });
  const key = crypto.createHash('sha256').update(refresh).digest('hex');
  // ponytail: concurrent refresh is shared within this single instance; review before adding replicas.
  if (!refreshes.has(key)) refreshes.set(key, authRequest('token?grant_type=refresh_token', { refresh_token: refresh })
    .finally(() => refreshes.delete(key)));
  res.json(await publishSession(res, await refreshes.get(key)));
}));

router.post('/logout', handle(async (req, res) => {
  if (!fields(req.body, [])) return invalid(res);
  let access = readBrowserCookie(req, 'access');
  const refresh = readBrowserCookie(req, 'refresh');
  let refreshed = false;
  if (!access && refresh) {
    access = (await authRequest('token?grant_type=refresh_token', { refresh_token: refresh })).access_token;
    refreshed = true;
  }
  if (access) {
    let { error } = await serviceSupabase.auth.admin.signOut(access, 'local');
    if (error?.status === 401 && refresh && !refreshed) {
      const session = await authRequest('token?grant_type=refresh_token', { refresh_token: refresh });
      ({ error } = await serviceSupabase.auth.admin.signOut(session.access_token, 'local'));
    }
    if (error && ![401, 403, 404].includes(error.status)) throw Object.assign(new Error('No se pudo cerrar la sesión'), { status: 503 });
  }
  clearBrowserSession(res);
  res.json({ ok: true });
}));

router.post('/reset-request', limit(5, 60), handle(async (req, res) => {
  if (!fields(req.body, ['email']) || !emailValid(req.body.email)) return invalid(res);
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  // ponytail: only the latest recovery link in the same browser/device can complete PKCE.
  writeBrowserCookie(res, 'verifier', verifier, 60 * 60 * 1000);
  try {
    await authRequest(`recover?redirect_to=${encodeURIComponent(`${req.get('origin')}/reset-password`)}`, {
      email: req.body.email, code_challenge: challenge, code_challenge_method: 's256',
    });
  } catch (error) { if (error.status !== 401) throw error; }
  res.json({ ok: true });
}));

router.post('/recovery', limit(10, 15), handle(async (req, res) => {
  if (!fields(req.body, ['code']) || !/^[A-Za-z0-9_-]{16,256}$/.test(req.body.code)) return invalid(res);
  const verifier = readBrowserCookie(req, 'verifier');
  if (!verifier) throw Object.assign(new Error('Enlace no válido'), { status: 401 });
  const session = await authRequest('token?grant_type=pkce', { auth_code: req.body.code, code_verifier: verifier });
  const profile = await publishSession(res, session);
  writeBrowserCookie(res, 'verifier', '', 0);
  res.json(profile);
}));

router.post('/password', limit(10, 15), handle(async (req, res) => {
  if (!fields(req.body, ['password']) || req.body.password.length < 10 || Buffer.byteLength(req.body.password, 'utf8') > 72) return invalid(res);
  const access = readBrowserCookie(req, 'access');
  if (!access) throw Object.assign(new Error('Autenticacion requerida'), { status: 401 });
  await authenticateProfessional(access);
  await authRequest('user', { password: req.body.password }, access);
  res.json({ ok: true });
}));

export default router;
