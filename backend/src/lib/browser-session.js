import { allowedBrowserOrigins } from './http-security.js';

const COOKIE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function browserCookieName(name) {
  return `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}fisio-${name}`;
}

export function readBrowserCookie(req, name) {
  const matches = String(req.get('cookie') || '').split(';')
    .map(part => part.trim()).filter(part => part.startsWith(`${browserCookieName(name)}=`));
  if (matches.length !== 1) return null;
  try {
    const value = decodeURIComponent(matches[0].slice(browserCookieName(name).length + 1));
    return value.length <= 3500 && /^[A-Za-z0-9_.~/-]+$/.test(value) ? value : null;
  } catch { return null; }
}

export function writeBrowserCookie(res, name, value, maxAge = COOKIE_AGE_MS) {
  if (value && (value.length > 3500 || !/^[A-Za-z0-9_.~/-]+$/.test(value))) {
    throw Object.assign(new Error('Respuesta de sesión no válida'), { status: 503 });
  }
  res.cookie(browserCookieName(name), value, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge,
  });
}

export function writeBrowserSession(res, session) {
  // Validate both before publishing either cookie.
  for (const value of [session?.access_token, session?.refresh_token]) {
    if (typeof value !== 'string' || !value || value.length > 3500 || !/^[A-Za-z0-9_.~/-]+$/.test(value)) {
      throw Object.assign(new Error('Respuesta de sesión no válida'), { status: 503 });
    }
  }
  writeBrowserCookie(res, 'access', session.access_token);
  writeBrowserCookie(res, 'refresh', session.refresh_token);
}

export function clearBrowserSession(res) {
  for (const name of ['access', 'refresh', 'verifier']) writeBrowserCookie(res, name, '', 0);
}

export function noStoreSession(res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

export function requireBrowserOrigin(req, res, next) {
  noStoreSession(res);
  const origin = req.get('origin');
  const sameOriginRead = !origin && ['GET', 'HEAD'].includes(req.method.toUpperCase()) && req.get('sec-fetch-site') === 'same-origin';
  if ((!sameOriginRead && !allowedBrowserOrigins(process.env).includes(origin)) || req.get('x-fisio-csrf') !== '1'
    || req.get('sec-fetch-site') === 'cross-site') {
    return res.status(403).json({ error: 'Origen de sesión no autorizado', code: 'CSRF_REQUIRED' });
  }
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.status(503).json({ error: 'La sesión requiere HTTPS' });
  }
  return next();
}
