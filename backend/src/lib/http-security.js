import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

export function allowedBrowserOrigins(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const values = [env.FRONTEND_URL, ...(env.FRONTEND_URLS || '').split(',')].filter(value => value?.trim());
  const origins = values.map(value => {
    const url = new URL(value.trim());
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/'
      || (production ? url.protocol !== 'https:' : !['http:', 'https:'].includes(url.protocol))) {
      throw new Error('CORS requiere orígenes completos válidos; HTTPS es obligatorio en producción.');
    }
    return url.origin;
  });
  if (!production) origins.push('http://localhost:4321', 'http://127.0.0.1:4321');
  if (production && !origins.length) throw new Error('Configura FRONTEND_URL para restringir CORS en producción.');
  return [...new Set(origins)];
}

// All aliases share a per-professional limit. No browser-supplied ID enters the key.
export const PAID_API_PATHS = [
  '/api/exercises/recommend', '/api/exercises/recommend/async',
  '/api/ejercicios/recommend', '/api/ejercicios/recommend/async',
  '/api/recommendations/generate', '/api/agent/message', '/api/agente/message',
  '/api/notas-clinicas/voice/transcribe', '/api/notas-clinicas/voice/synthesize',
];

export function paidApiLimiter(env = process.env) {
  const raw = Number(env.AI_GENERATION_RATE_LIMIT || 60);
  if (!Number.isSafeInteger(raw) || raw < 1) throw new Error('AI_GENERATION_RATE_LIMIT debe ser un entero positivo.');
  return rateLimit({ windowMs: 60 * 60 * 1000, limit: raw,
    keyGenerator: req => req.auth?.profile_id || ipKeyGenerator(req.ip),
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Límite de IA/audio por hora alcanzado. Inténtalo más tarde.' },
  });
}
