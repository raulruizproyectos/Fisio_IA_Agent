import { Router } from 'express';

const router = Router();

function pickValue(obj, ...keys) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }
  return null;
}

function isMissingWebhookConfig() {
  return !process.env.N8N_AGENT_WEBHOOK_URL;
}

function buildFallbackReply(payload) {
  const text = String(payload.text || '').trim();
  let reply = 'Mensaje recibido. Queda pendiente de revision clinica.';
  let intentHint = 'register_intake';

  if (/dolor|s[ií]ntoma|sintoma|molestia|lesi[oó]n|lesion/i.test(text)) {
    reply = 'Sintomas registrados. Caso en cola para revision del fisioterapeuta.';
  } else if (/video|ejercicio|plan/i.test(text)) {
    reply = 'Solicitud de video recibida. Indica paciente, fase y parametros para generar borrador.';
    intentHint = 'create_video_draft';
  } else if (text.length > 0) {
    reply = 'Contexto recibido. Puedo preparar el payload para revision y generacion de video.';
  }

  return {
    ok: true,
    role: payload.role || 'professional',
    reply_text: reply,
    intent_hint: intentHint,
    received: {
      channel: payload.channel || 'web',
      paciente_id: payload.paciente_id || null,
      profesional_id: payload.profesional_id || null,
      text,
    },
  };
}

function isEmptyAgentResponse(responseData) {
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
}

router.post('/message', async (req, res, next) => {
  try {
    const channel = req.body.channel || 'web';
    const role = req.body.role || 'professional';
    const chatId = pickValue(req.body, 'chat_id');
    const patientId = pickValue(req.body, 'paciente_id', 'patient_id');
    const professionalId = pickValue(req.body, 'profesional_id', 'professional_id');
    const text = pickValue(req.body, 'text');

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'text es obligatorio' });
    }

    if (isMissingWebhookConfig()) {
      return res.status(400).json({
        error: 'N8N_AGENT_WEBHOOK_URL no configurado',
        integration_status: 'Pendiente de integracion tecnica',
      });
    }

    const payload = {
      channel,
      role,
      chat_id: chatId,
      paciente_id: patientId,
      profesional_id: professionalId,
      text: String(text).trim(),
      timestamp: new Date().toISOString(),
    };

    let n8nResponse;
    let timeout;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 10000);
      n8nResponse = await fetch(process.env.N8N_AGENT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchError) {
      return res.json({
        data: buildFallbackReply(payload),
        source: 'n8n_agent',
        fallback_used: true,
        n8n_unreachable: true,
        fallback_reason: fetchError?.name === 'AbortError' ? 'timeout' : 'fetch_failed',
      });
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    const contentType = n8nResponse.headers.get('content-type') || '';
    const rawText = await n8nResponse.text();

    let responseData = {};
    if (rawText.trim().length > 0 && contentType.includes('application/json')) {
      try {
        responseData = JSON.parse(rawText);
      } catch {
        responseData = { raw: rawText };
      }
    } else if (rawText.trim().length > 0) {
      responseData = { raw: rawText };
    }

    if (!n8nResponse.ok) {
      return res.json({
        data: buildFallbackReply(payload),
        source: 'n8n_agent',
        fallback_used: true,
        n8n_unreachable: false,
        fallback_reason: 'n8n_http_error',
        n8n_status: n8nResponse.status,
      });
    }

    const fallbackUsed = isEmptyAgentResponse(responseData);
    const finalData = fallbackUsed ? buildFallbackReply(payload) : responseData;

    res.json({
      data: finalData,
      source: 'n8n_agent',
      fallback_used: fallbackUsed,
      n8n_unreachable: false,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
