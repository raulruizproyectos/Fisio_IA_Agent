import crypto from 'node:crypto';
import { reportError } from './approved-exercise-report.js';

export function getMessagingPilotConfig() {
  // ponytail: one pilot clinic per backend; move credentials to clinic records before a multi-clinic launch.
  const clinicId = String(process.env.MESSAGING_PILOT_CLINIC_ID || '').trim();
  const professionalId = String(process.env.MESSAGING_PILOT_PROFESSIONAL_ID || '').trim();
  const uuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
  if (!uuid.test(clinicId) || !uuid.test(professionalId)) throw reportError(503, 'La clínica de pruebas y su profesional no están configurados');
  return { clinicId, professionalId };
}

export function getOpenWAConfig() {
  if (process.env.OPENWA_PILOT_ENABLED !== 'true') throw reportError(503, 'El piloto de WhatsApp está desactivado');
  const config = getMessagingPilotConfig();
  const apiKey = String(process.env.OPENWA_API_KEY || '').trim();
  const secret = String(process.env.OPENWA_WEBHOOK_SECRET || '').trim();
  const sessionId = String(process.env.OPENWA_SESSION_ID || '').trim();
  let base;
  try { base = new URL(process.env.OPENWA_BASE_URL); } catch { throw reportError(503, 'Falta una URL válida de OpenWA'); }
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash
    || !apiKey || secret.length < 32 || !/^[\w-]+$/.test(sessionId) || sessionId.length > 128) throw reportError(503, 'Configuración incompleta del piloto de OpenWA');
  base.pathname = base.pathname.replace(/\/$/, '');
  if (!base.pathname.endsWith('/api')) throw reportError(503, 'OPENWA_BASE_URL debe terminar en /api');
  return { ...config, baseUrl: base.href.replace(/\/$/, ''), apiKey, secret, sessionId };
}

export function verifyOpenWARequest(req, config) {
  if (!Buffer.isBuffer(req.rawBody)) return false;
  const signature = String(req.get('x-openwa-signature') || '');
  if (!/^sha256=[\da-f]{64}$/.test(signature)) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', config.secret).update(req.rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function openWARequest(config, path, body) {
  let response;
  try {
    response = await fetch(config.baseUrl + '/sessions/' + encodeURIComponent(config.sessionId) + path, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'X-API-Key': config.apiKey, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw reportError(502, 'No se conoce el resultado de OpenWA. Revisa el envío antes de repetirlo', 'openwa_outcome_unknown');
  }
  if (!response.ok) throw reportError(502, 'OpenWA no confirmó la operación; revisa el proveedor antes de repetirla', 'openwa_outcome_unknown');
  let payload;
  try { payload = await response.json(); } catch { throw reportError(502, 'Respuesta de OpenWA no válida', 'openwa_outcome_unknown'); }
  if (body && (typeof payload?.messageId !== 'string' || !payload.messageId || payload.messageId.length > 256)) throw reportError(502, 'OpenWA no devolvió el identificador del mensaje', 'openwa_outcome_unknown');
  return payload;
}

export const sendOpenWAText = (config, chatId, text) => openWARequest(config, '/messages/send-text', { chatId, text: text.slice(0,4096), linkPreview: false });
export const sendOpenWAPdf = (config, chatId, buffer, filename, caption) => openWARequest(config, '/messages/send-document', {
  chatId, base64: buffer.toString('base64'), mimetype: 'application/pdf', filename, caption: String(caption || '').slice(0,1024),
});
