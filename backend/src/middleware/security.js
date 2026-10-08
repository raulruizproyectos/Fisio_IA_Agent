import crypto from 'node:crypto';
import { createUserSupabase, runWithRequestContext, serviceSupabase } from '../lib/supabase.js';
import { getMessagingPilotConfig, getOpenWAConfig, verifyOpenWARequest } from '../lib/openwa.js';
import { readBrowserCookie, requireBrowserOrigin, noStoreSession } from '../lib/browser-session.js';

const PUBLIC_BOOKING_ROUTES = new Set([
  'GET /api/professional/public-booking/config',
  'GET /api/profesional/public-booking/config',
  'GET /api/professional/public-booking/slots',
  'GET /api/profesional/public-booking/slots',
  'POST /api/professional/public-booking/appointments',
  'POST /api/profesional/public-booking/appointments',
  'POST /api/professional/public-booking/recovery',
  'POST /api/profesional/public-booking/recovery',
]);

const PUBLIC_HEALTH_ROUTES = new Set(['GET /', 'GET /health', 'GET /api/health']);

export function secureEqual(actual, expected) {
  const actualBuffer = Buffer.from(String(actual || ''));
  const expectedBuffer = Buffer.from(String(expected || ''));
  return actualBuffer.length === expectedBuffer.length
    && expectedBuffer.length > 0
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function bearerToken(req) {
  const match = String(req.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function routeKey(req) {
  return `${req.method.toUpperCase()} ${req.path}`;
}

function runPrivileged(req, next, actorType) {
  return runWithRequestContext({
    supabase: serviceSupabase,
    auth: { actor_type: actorType, request_id: req.id },
  }, next);
}

export function requestIdentity(req, res, next) {
  req.id = String(req.get('x-request-id') || crypto.randomUUID()).slice(0, 128);
  res.setHeader('X-Request-Id', req.id);
  next();
}

export async function authorizeRequest(req, res, next) {
  const key = routeKey(req);

  if (PUBLIC_HEALTH_ROUTES.has(key)) return next();
  if (PUBLIC_BOOKING_ROUTES.has(key)) return runPrivileged(req, next, 'public_booking');

  if (key === 'POST /api/whatsapp/incoming') {
    let config;
    try { config = getOpenWAConfig(); } catch (error) { return res.status(503).json({ error: error.message, request_id: req.id }); }
    if (!verifyOpenWARequest(req, config)) return res.status(401).json({ error: 'Webhook OpenWA no autorizado', request_id: req.id });
    return runPrivileged(req, next, 'openwa');
  }

  if (key === 'POST /api/telegram/pilot-incoming') {
    try { getMessagingPilotConfig(); } catch (error) { return res.status(503).json({ error: error.message }); }
    const secret = process.env.TELEGRAM_PILOT_WEBHOOK_SECRET;
    if (process.env.TELEGRAM_PILOT_BOOKING_ENABLED !== 'true' || !process.env.TELEGRAM_PATIENT_BOT_TOKEN || String(secret || '').length < 32) {
      return res.status(503).json({ error: 'Piloto de Telegram no configurado' });
    }
    if (!secureEqual(req.get('x-telegram-bot-api-secret-token'), secret)) return res.status(401).json({ error: 'Webhook de Telegram no autorizado' });
    return runPrivileged(req, next, 'telegram_pilot');
  }

  const suppliedInternalKey = req.get('x-internal-api-key');
  if (suppliedInternalKey && secureEqual(suppliedInternalKey, process.env.INTERNAL_API_KEY)) {
    return runPrivileged(req, next, 'internal');
  }

  if (key === 'POST /api/telegram/incoming') {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    const supplied = req.get('x-telegram-bot-api-secret-token');
    if (!secureEqual(supplied, expected)) {
      return res.status(expected ? 401 : 503).json({
        error: expected ? 'Webhook no autorizado' : 'Webhook de Telegram no configurado',
        request_id: req.id,
      });
    }
    return runPrivileged(req, next, 'telegram');
  }

  if (req.path.startsWith('/api/cron/')) {
    const expected = process.env.INTERNAL_API_KEY;
    const supplied = req.get('x-internal-api-key') || bearerToken(req);
    if (!secureEqual(supplied, expected)) {
      return res.status(expected ? 401 : 503).json({
        error: expected ? 'Proceso interno no autorizado' : 'Clave interna no configurada',
        request_id: req.id,
      });
    }
    return runPrivileged(req, next, 'internal');
  }

  const bearer = bearerToken(req);
  const token = bearer || readBrowserCookie(req, 'access');
  if (!token) return res.status(401).json({ error: 'Autenticacion requerida', code: 'AUTH_SESSION_REQUIRED', request_id: req.id });
  noStoreSession(res);
  if (!bearer) {
    let allowed = false;
    requireBrowserOrigin(req, res, () => { allowed = true; });
    if (!allowed) return;
  }

  try {
    const context = await authenticateProfessional(token);
    req.auth = context.auth;
    return runWithRequestContext(context, next);
  } catch (error) {
    if ([401, 403, 503].includes(error.status)) return res.status(error.status).json({ error: error.message, code: error.status === 401 ? 'AUTH_SESSION_REQUIRED' : undefined, request_id: req.id });
    return next(error);
  }
}

export async function authenticateProfessional(token) {
    const { data: userResult, error: userError } = await serviceSupabase.auth.getUser(token);
    const user = userResult?.user;
    if (!userError && (typeof user?.id !== 'string' || !user.id)) throw Object.assign(new Error('Respuesta de Auth incompleta'), { status: 503 });
    if (userError) {
      const unavailable = userError?.status >= 500 || userError?.name === 'AuthRetryableFetchError';
      throw Object.assign(new Error(unavailable ? 'No se pudo comprobar la sesión' : 'Sesion no valida o expirada'), { status: unavailable ? 503 : 401 });
    }

    const userSupabase = createUserSupabase(token);
    const { data: profile, error: profileError } = await userSupabase
      .from('crm_perfiles')
      .select('id, auth_user_id, rol, nombre_completo, email, activo, clinica_id, crm_clinicas!inner(id, nombre, activo)')
      .eq('auth_user_id', user.id)
      .eq('activo', true)
      .eq('crm_clinicas.activo', true)
      .maybeSingle();

    if (profileError) throw Object.assign(new Error('No se pudo comprobar el perfil profesional'), { status: 503 });
    if (!profile?.clinica_id || !profile.activo || profile.auth_user_id !== user.id
      || profile.crm_clinicas?.activo !== true || profile.crm_clinicas.id !== profile.clinica_id) {
      throw Object.assign(new Error('Perfil profesional sin una clinica activa autorizada'), { status: 403 });
    }

    const auth = {
      user_id: user.id,
      profile_id: profile.id,
      clinic_id: profile.clinica_id,
      clinic_name: profile.crm_clinicas.nombre,
      role: profile.rol,
      email: profile.email || user.email || null,
      name: profile.nombre_completo || null,
    };
    return { supabase: userSupabase, auth };
}
