import { Router } from 'express';

const router = Router();

export const pickValue = (obj, ...keys) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }
  return null;
};

export const isMissingAgentWebhookConfig = () => !process.env.N8N_AGENT_WEBHOOK_URL;

export const buildAgentFallbackReply = (payload = {}) => {
  const text = String(payload.text || payload.message_text || payload.texto_mensaje || '').trim();
  let reply = 'Mensaje recibido. Queda pendiente de revision clinica.';
  let route = 'register_intake';
  let confidence = 0.45;

  if (/dolor|sintoma|sintomas|molestia|lesion|seguimiento|evolucion/i.test(text)) {
    reply = 'Sintomas registrados. Caso en cola para revision del fisioterapeuta.';
    route = 'session_note';
    confidence = 0.7;
  } else if (/ejercicio|plan|movilidad|fortalecimiento|rehabilitacion/i.test(text)) {
    reply = 'Solicitud de informe de ejercicios recibida. Preparando pautas con imagenes y procedimiento.';
    route = 'exercise';
    confidence = 0.8;
  } else if (/cita|agendar|agenda|reservar|reserva|hueco|hora|calendario/i.test(text)) {
    reply = 'Solicitud de cita recibida. Voy a tramitarla.';
    route = 'appointment';
    confidence = 0.8;
  } else if (text.length > 0) {
    reply = 'Contexto recibido. Puedo preparar un informe de ejercicios basado en sintomas.';
    route = 'unknown';
    confidence = 0.35;
  }

  return {
    ok: true,
    role: payload.role || 'professional',
    route,
    confidence,
    reply_text: reply,
    intent_hint: route,
    normalized_payload: {
      text,
      channel: payload.channel || 'web',
      patient_id: payload.paciente_id || payload.patient_id || null,
      professional_id: payload.profesional_id || payload.professional_id || null,
    },
    received: {
      channel: payload.channel || 'web',
      paciente_id: payload.paciente_id || payload.patient_id || null,
      profesional_id: payload.profesional_id || payload.professional_id || null,
      text,
    },
  };
};

const isEmptyAgentResponse = (responseData) => {
  if (responseData === null || responseData === undefined) return true;
  if (typeof responseData === 'string') return responseData.trim().length === 0;
  if (Array.isArray(responseData)) return responseData.length === 0;

  if (typeof responseData === 'object') {
    const keys = Object.keys(responseData);
    if (keys.length === 0) return true;
    if (keys.length === 1 && keys[0] === 'raw') {
      return !String(responseData.raw || '').trim();
    }
  }

  return false;
};

const hasDeprecatedVideoCopy = (responseData) => {
  if (!responseData || typeof responseData !== 'object') return false;
  const text = String(responseData.reply_text || responseData.message || responseData.raw || '').toLowerCase();
  return /video|generacion de video|crear video/.test(text);
};

const parseAgentResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  if (!rawText.trim()) return {};
  if (!contentType.includes('application/json')) return { raw: rawText };

  try {
    return JSON.parse(rawText);
  } catch {
    return { raw: rawText };
  }
};

export const resolveAgentConversation = async ({
  channel = 'web',
  role = 'professional',
  chatId = null,
  patientId = null,
  professionalId = null,
  text,
  requestId = null,
  timeoutMs = 10000,
}) => {
  const payload = {
    channel,
    role,
    chat_id: chatId,
    paciente_id: patientId,
    profesional_id: professionalId,
    text: String(text || '').trim(),
    request_id: requestId || null,
    timestamp: new Date().toISOString(),
  };

  if (isMissingAgentWebhookConfig()) {
    return {
      data: buildAgentFallbackReply(payload),
      source: 'n8n_agent',
      fallback_used: true,
      n8n_unreachable: true,
      fallback_reason: 'missing_webhook_config',
    };
  }

  let response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      response = await fetch(process.env.N8N_AGENT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (fetchError) {
    return {
      data: buildAgentFallbackReply(payload),
      source: 'n8n_agent',
      fallback_used: true,
      n8n_unreachable: true,
      fallback_reason: fetchError?.name === 'AbortError' ? 'timeout' : 'fetch_failed',
    };
  }

  const responseData = await parseAgentResponse(response);
  if (!response.ok) {
    return {
      data: buildAgentFallbackReply(payload),
      source: 'n8n_agent',
      fallback_used: true,
      n8n_unreachable: false,
      fallback_reason: 'n8n_http_error',
      n8n_status: response.status,
    };
  }

  const fallbackUsed = isEmptyAgentResponse(responseData);
  const shouldOverrideVideoCopy = hasDeprecatedVideoCopy(responseData);
  const finalData = fallbackUsed || shouldOverrideVideoCopy
    ? buildAgentFallbackReply(payload)
    : responseData;

  return {
    data: finalData,
    source: 'n8n_agent',
    fallback_used: fallbackUsed || shouldOverrideVideoCopy,
    n8n_unreachable: false,
    fallback_reason: fallbackUsed ? 'empty_n8n_response' : (shouldOverrideVideoCopy ? 'deprecated_video_copy' : null),
  };
};

router.post('/message', async (req, res, next) => {
  try {
    const channel = req.body.channel || 'web';
    const role = req.body.role || 'professional';
    const chatId = pickValue(req.body, 'chat_id');
    const patientId = pickValue(req.body, 'paciente_id', 'patient_id');
    const professionalId = pickValue(req.body, 'profesional_id', 'professional_id');
    const text = pickValue(req.body, 'text', 'texto_mensaje', 'message_text');

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'text es obligatorio' });
    }

    const result = await resolveAgentConversation({
      channel,
      role,
      chatId,
      patientId,
      professionalId,
      text,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
