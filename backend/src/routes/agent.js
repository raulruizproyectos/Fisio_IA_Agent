import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();
const GENERIC_AGENT_ROUTES = new Set(['register_intake', 'unknown', 'default']);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() || null;
const COPILOT_MODEL = process.env.OPENAI_COPILOT_MODEL || 'gpt-4o-mini';

async function fetchPatientClinicalContext(patientId) {
  if (!patientId) return null;
  try {
    const { data: patient } = await supabase
      .from('crm_pacientes')
      .select('id, nombre, apellidos, resumen_clinico_longitudinal, antecedentes, alergias')
      .eq('id', patientId)
      .maybeSingle();

    if (!patient) return null;

    const { data: notes } = await supabase
      .from('crm_notas_clinicas')
      .select('id, fecha, session_datetime, dolor_eva, zona_corporal, nota, structured_data')
      .eq('paciente_id', patientId)
      .order('session_datetime', { ascending: false })
      .limit(4);

    return {
      patient,
      notes: notes || [],
    };
  } catch (err) {
    console.error('Error fetching clinical context for Copilot:', err);
    return null;
  }
}

export const pickValue = (obj, ...keys) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }
  return null;
};

export const isMissingAgentWebhookConfig = () => !process.env.N8N_AGENT_WEBHOOK_URL;

export const buildAgentFallbackReply = (payload = {}, clinicalContext = null) => {
  const text = String(payload.text || payload.message_text || payload.texto_mensaje || '').trim();
  let reply = 'Mensaje recibido. Queda pendiente de revision clinica.';
  let route = 'register_intake';
  let confidence = 0.45;

  const mentionsAppointment = /cita|agendar|agenda|reservar|reserva|hueco|hora|calendario/i.test(text);
  const mentionsExercise = /ejercicio|ejercicios|plan|tabla|rutina|pauta|fortalecimiento|rehabilitacion|estiramiento/i.test(text);
  const mentionsEvolution = /evolucion|progreso|resumen|historial|como va|dolor/i.test(text);

  if (mentionsEvolution && clinicalContext?.patient) {
    const p = clinicalContext.patient;
    const name = `${p.nombre || ''} ${p.apellidos || ''}`.trim() || 'Paciente';
    const summary = p.resumen_clinico_longitudinal || 'Sin resumen longitudinal previo.';
    const latestNote = clinicalContext.notes?.[0];
    const evaText = latestNote?.dolor_eva !== null && latestNote?.dolor_eva !== undefined ? ` (EVA ${latestNote.dolor_eva}/10)` : '';
    reply = `Evolución clínica de ${name}:\n\n${summary}\n\nÚltima sesión${evaText}: ${latestNote?.nota || 'Sin notas recientes'}.`;
    route = 'evolution_summary';
    confidence = 0.9;
  } else if (mentionsAppointment) {
    reply = 'Solicitud de cita recibida. Voy a tramitarla.';
    route = 'appointment';
    confidence = 0.8;
  } else if (mentionsExercise) {
    reply = 'Solicitud de informe de ejercicios recibida. Preparando pautas con imagenes y procedimiento.';
    route = 'exercise';
    confidence = 0.8;
  } else if (text.length > 0) {
    reply = 'Contexto clínico recibido. Puedes consultar la evolución, notas de sesión o prescribir planes de recuperación.';
    route = 'session_note';
    confidence = 0.6;
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

const normalizeAgentRoute = (route) => String(route || '').trim().toLowerCase();

const shouldOverrideGenericAgentRoute = (responseData, fallbackData) => {
  const agentRoute = normalizeAgentRoute(responseData?.route || responseData?.intent_hint);
  const fallbackRoute = normalizeAgentRoute(fallbackData?.route || fallbackData?.intent_hint);

  if (!fallbackRoute || GENERIC_AGENT_ROUTES.has(fallbackRoute)) {
    return false;
  }

  return !agentRoute || GENERIC_AGENT_ROUTES.has(agentRoute);
};

const normalizeAgentResponse = (responseData, payload) => {
  const fallbackData = buildAgentFallbackReply(payload);

  if (!shouldOverrideGenericAgentRoute(responseData, fallbackData)) {
    return {
      data: responseData,
      normalized: false,
      reason: null,
    };
  }

  return {
    data: {
      ...responseData,
      route: fallbackData.route,
      intent_hint: fallbackData.route,
      confidence: Math.max(Number(responseData?.confidence || 0), Number(fallbackData.confidence || 0)),
      reply_text: fallbackData.reply_text,
      normalized_by_backend: true,
      normalization_reason: 'generic_n8n_route_overridden',
      n8n_original_route: responseData?.route || responseData?.intent_hint || null,
    },
    normalized: true,
    reason: 'generic_n8n_route_overridden',
  };
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

  const clinicalContext = patientId ? await fetchPatientClinicalContext(patientId) : null;

  // Direct OpenAI Copilot for clinical queries when API key is available
  if (OPENAI_API_KEY && (clinicalContext || /evolucion|paciente|dolor|ejercicio|tratamiento|sintoma/i.test(payload.text))) {
    try {
      let systemPrompt = `Eres el Copiloto Clínico de Fisio Clinical.
Asistes al fisioterapeuta colegiado con rigor técnico, concisión y terminología médica precisa.
NUNCA inventes datos no documentados. Si no hay información de un dato, dilo claramente.`;

      if (clinicalContext?.patient) {
        const p = clinicalContext.patient;
        const pName = `${p.nombre || ''} ${p.apellidos || ''}`.trim() || 'Paciente';
        systemPrompt += `\n\nDATOS DEL PACIENTE SELECCIONADO:
- Nombre: ${pName}
- Antecedentes: ${p.antecedentes || 'Sin antecedentes relevantes'}
- Alergias: ${p.alergias || 'No declaradas'}
- Resumen Longitudinal (Capa 2): ${p.resumen_clinico_longitudinal || 'Sin resumen longitudinal previo.'}
- Sesiones Recientes (Capa 1):
${clinicalContext.notes.map((n, i) => `  ${i + 1}. [${n.session_datetime || n.fecha}] EVA: ${n.dolor_eva ?? '-'} | Zona: ${n.zona_corporal || '-'} | Nota: ${n.nota}`).join('\n') || '  Sin notas previas'}`;
      }

      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: COPILOT_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: payload.text },
          ],
          temperature: 0.2,
          max_tokens: 600,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const replyText = aiData?.choices?.[0]?.message?.content?.trim();
        if (replyText) {
          return {
            data: {
              ok: true,
              role: payload.role,
              route: 'clinical_assistant',
              confidence: 0.95,
              reply_text: replyText,
              intent_hint: 'clinical_assistant',
              normalized_payload: payload,
              received: payload,
            },
            source: 'clinical_engine',
            fallback_used: false,
            n8n_unreachable: false,
          };
        }
      }
    } catch (aiErr) {
      console.error('Error calling direct clinical copilot OpenAI:', aiErr);
    }
  }

  if (isMissingAgentWebhookConfig()) {
    return {
      data: buildAgentFallbackReply(payload, clinicalContext),
      source: 'clinical_copilot',
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
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.N8N_WEBHOOK_SECRET
            ? { 'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET }
            : {}),
        },
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
  const normalizedResponse = !fallbackUsed && !shouldOverrideVideoCopy
    ? normalizeAgentResponse(responseData, payload)
    : null;
  const finalData = fallbackUsed || shouldOverrideVideoCopy
    ? buildAgentFallbackReply(payload)
    : normalizedResponse.data;
  const fallbackReason = fallbackUsed
    ? 'empty_n8n_response'
    : (shouldOverrideVideoCopy
      ? 'deprecated_video_copy'
      : normalizedResponse.reason);

  return {
    data: finalData,
    source: 'n8n_agent',
    fallback_used: fallbackUsed || shouldOverrideVideoCopy || normalizedResponse.normalized,
    n8n_unreachable: false,
    fallback_reason: fallbackReason,
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
