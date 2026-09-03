import crypto from 'node:crypto';
import { createUserSupabase, runWithRequestContext, serviceSupabase } from '../lib/supabase.js';

const PUBLIC_BOOKING_ROUTES = new Set([
  'GET /api/professional/public-booking/config',
  'GET /api/profesional/public-booking/config',
  'GET /api/professional/public-booking/slots',
  'GET /api/profesional/public-booking/slots',
  'POST /api/professional/public-booking/appointments',
  'POST /api/profesional/public-booking/appointments',
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

  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'Autenticacion requerida', request_id: req.id });

  try {
    const { data: userResult, error: userError } = await serviceSupabase.auth.getUser(token);
    const user = userResult?.user;
    if (userError || !user) {
      return res.status(401).json({ error: 'Sesion no valida o expirada', request_id: req.id });
    }

    const userSupabase = createUserSupabase(token);
    const { data: profile, error: profileError } = await userSupabase
      .from('crm_perfiles')
      .select('id, auth_user_id, rol, nombre_completo, email, activo')
      .eq('auth_user_id', user.id)
      .eq('activo', true)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'Perfil profesional no autorizado', request_id: req.id });
    }

    req.auth = {
      user_id: user.id,
      profile_id: profile.id,
      role: profile.rol,
      email: profile.email || user.email || null,
      name: profile.nombre_completo || null,
    };
    return runWithRequestContext({ supabase: userSupabase, auth: req.auth }, next);
  } catch (error) {
    return next(error);
  }
}
