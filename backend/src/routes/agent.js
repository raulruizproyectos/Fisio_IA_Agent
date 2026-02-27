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

    const n8nResponse = await fetch(process.env.N8N_AGENT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const contentType = n8nResponse.headers.get('content-type') || '';
    let responseData;
    if (contentType.includes('application/json')) {
      responseData = await n8nResponse.json();
    } else {
      responseData = { raw: await n8nResponse.text() };
    }

    if (!n8nResponse.ok) {
      return res.status(502).json({
        error: 'Error al consultar agente n8n',
        details: responseData,
      });
    }

    res.json({
      data: responseData,
      source: 'n8n_agent',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
