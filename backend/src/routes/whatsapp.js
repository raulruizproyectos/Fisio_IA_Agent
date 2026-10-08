import { Router } from 'express';
import { supabase, serviceSupabase } from '../lib/supabase.js';
import { getOpenWAConfig, sendOpenWAPdf, sendOpenWAText } from '../lib/openwa.js';
import { getApprovedExerciseReport, reportError, respondReportError } from '../lib/approved-exercise-report.js';
import { buildExerciseReportPdfBuffer } from '../lib/exercise-report-pdf.js';
import { createPilotLink, getPilotPatient, resolvePilotLink, claimMessagingEvent, finishMessagingEvent, respondToPatientBooking } from '../lib/patient-booking.js';

const router = Router();

function requirePilotSession(req, config) {
  if (!req.auth?.profile_id || req.auth.clinic_id !== config.clinicId) throw reportError(403, 'Se requiere sesión de la clínica de pruebas');
}

async function recordReceipt(config, messageId, status) {
  const { data: delivery, error } = await serviceSupabase.from('crm_whatsapp_envios').select('*')
    .eq('clinica_id', config.clinicId).eq('session_id', config.sessionId).eq('message_id', messageId).maybeSingle();
  if (error) throw error;
  if (!delivery) return;
  const states = { delivered: 'entregado', read: 'leido', failed: 'fallido' };
  const target = states[status];
  if (!target) return;
  const allowed = target === 'leido' ? ['procesando', 'aceptado', 'entregado', 'fallido', 'desconocido']
    : target === 'entregado' ? ['procesando', 'aceptado', 'fallido', 'desconocido'] : ['procesando', 'aceptado', 'desconocido'];
  const update = await serviceSupabase.from('crm_whatsapp_envios').update({ estado: target }).eq('id', delivery.id).in('estado', allowed);
  if (update.error) throw update.error;
  if (['delivered','read'].includes(status)) {
    const record = await serviceSupabase.from('crm_recomendaciones').update({ estado: 'enviada', updated_at: new Date().toISOString() })
      .eq('id', delivery.recomendacion_id).eq('paciente_id', delivery.paciente_id).eq('report_version', delivery.report_version).in('estado', ['aprobada','enviada']);
    if (record.error) throw record.error;
  }
}

router.post('/link-code/:patientId', async (req, res) => {
  try {
    const config = getOpenWAConfig();
    requirePilotSession(req, config);
    res.json(await createPilotLink(req, 'whatsapp'));
  } catch (error) { respondReportError(res, error, 'No se pudo preparar la invitación de WhatsApp'); }
});

router.get('/patient-status/:patientId', async (req, res) => {
  try {
    const config = getOpenWAConfig();
    requirePilotSession(req, config);
    await getPilotPatient(req.params.patientId, config);
    const result = await supabase.from('crm_mensajeria_vinculos').select('chat_id, consentimiento_en, baja_en')
      .eq('paciente_id', req.params.patientId).eq('canal', 'whatsapp').maybeSingle();
    if (result.error) throw result.error;
    const deliveries = await supabase.from('crm_whatsapp_envios').select('id, recomendacion_id, report_version, estado, created_at')
      .eq('paciente_id', req.params.patientId).order('created_at', { ascending: false }).limit(10);
    if (deliveries.error) throw deliveries.error;
    res.json({ linked: Boolean(result.data?.chat_id && result.data.consentimiento_en && !result.data.baja_en), deliveries: deliveries.data || [] });
  } catch (error) { respondReportError(res, error, 'No se pudo consultar el estado de WhatsApp'); }
});

router.post('/patient-report/send', async (req, res) => {
  let delivery;
  try {
    const config = getOpenWAConfig();
    requirePilotSession(req, config);
    if (req.body.dry_run !== undefined && typeof req.body.dry_run !== 'boolean') throw reportError(400, 'dry_run debe ser true o false');
    if (req.body.chat_id || req.body.phone || req.body.telefono) throw reportError(400, 'El destino debe ser el vínculo guardado del paciente');
    const patientId = req.body.patient_id;
    if (!patientId) throw reportError(400, 'patient_id es obligatorio');
    await getPilotPatient(patientId, config);
    const report = await getApprovedExerciseReport(req.body.recommendation_id, patientId);
    const link = await supabase.from('crm_mensajeria_vinculos').select('chat_id, consentimiento_en, baja_en')
      .eq('paciente_id', patientId).eq('canal', 'whatsapp').eq('clinica_id', config.clinicId).maybeSingle();
    if (link.error) throw link.error;
    if (!link.data?.chat_id || !link.data.consentimiento_en || link.data.baja_en) throw reportError(409, 'El paciente debe aceptar la invitación de WhatsApp antes del envío');
    const buffer = await buildExerciseReportPdfBuffer(report);
    if (req.body.dry_run === true) return res.json({ ok: true, dry_run: true, report_version: report.report_version, pdf_bytes: buffer.length });
    const claim = await serviceSupabase.from('crm_whatsapp_envios').insert({ clinica_id: config.clinicId, paciente_id: patientId,
      recomendacion_id: report.recommendation_id, report_version: report.report_version, session_id: config.sessionId, chat_id: link.data.chat_id }).select('*').single();
    if (claim.error?.code === '23505') {
      const prior = await supabase.from('crm_whatsapp_envios').select('id, estado').eq('recomendacion_id', report.recommendation_id).eq('report_version', report.report_version).maybeSingle();
      if (prior.error) throw prior.error;
      return res.json({ ok: true, duplicate: true, delivery_id: prior.data?.id, delivery_status: prior.data?.estado,
        message: 'Este plan ya tiene un envío registrado. Consulta su estado; no se repetirá automáticamente.' });
    }
    if (claim.error) throw claim.error;
    delivery = claim.data;
    const accepted = await sendOpenWAPdf(config, link.data.chat_id, buffer, 'plan-ejercicios-' + report.recommendation_id + '.pdf', report.message_to_patient);
    const saved = await serviceSupabase.from('crm_whatsapp_envios').update({ estado: 'aceptado', message_id: accepted.messageId }).eq('id', delivery.id);
    if (saved.error) throw saved.error;
    // Receipts can race the HTTP response. Reconcile only signed receipts already stored for this session/message.
    const receipts = await serviceSupabase.from('crm_mensajeria_eventos').select('delivery_status').eq('clinica_id', config.clinicId)
      .eq('session_id', config.sessionId).eq('message_id', accepted.messageId).in('evento', ['message.ack','message.failed']);
    if (receipts.error) throw receipts.error;
    const statuses = (receipts.data || []).map(row => row.delivery_status);
    const status = ['read','delivered','failed'].find(value => statuses.includes(value));
    if (status) await recordReceipt(config, accepted.messageId, status);
    return res.status(202).json({ ok: true, delivery_id: delivery.id, delivery_status: status || 'accepted',
      message: 'OpenWA ha aceptado el documento. La entrega al paciente se comprobará con el recibo de WhatsApp.' });
  } catch (error) {
    if (delivery) {
      const saved = await serviceSupabase.from('crm_whatsapp_envios').update({ estado: 'desconocido' }).eq('id', delivery.id).in('estado', ['procesando', 'aceptado']);
      return res.status(202).json({ ok: true, delivery_id: delivery.id, delivery_status: 'unknown', requires_manual_review: true,
        warning: saved.error ? 'El resultado y su registro requieren revisión manual. No repitas el envío.' : 'No se conoce el resultado del envío. Revisa OpenWA antes de repetirlo.' });
    }
    respondReportError(res, error, 'No se pudo preparar el envío de WhatsApp');
  }
});

router.post('/incoming', async (req, res) => {
  let eventId;
  try {
    const config = getOpenWAConfig();
    let payload;
    try { payload = JSON.parse(req.rawBody.toString('utf8')); } catch { throw reportError(400, 'Webhook JSON no válido'); }
    if (payload.sessionId !== config.sessionId) throw reportError(403, 'Sesión de OpenWA fuera del piloto');
    if (!['message.received','message.ack','message.failed'].includes(payload.event)) return res.json({ ok: true, ignored: true });
    const data = payload.data || {};
    const messageId = payload.event === 'message.received' ? data.id : data.messageId;
    if (typeof messageId !== 'string' || !messageId || messageId.length > 256) throw reportError(400, 'Falta un identificador de mensaje válido');
    if (payload.event === 'message.received' && (data.fromMe || data.isGroup || data.kind !== 'individual' || data.type !== 'text')) return res.json({ ok: true, ignored: true });
    const sender = data.chatId || data.from;
    const chatId = /^\d{8,15}@c\.us$/.test(sender) ? sender
      : /^\d+@lid$/.test(sender) && /^[1-9]\d{7,14}$/.test(data.senderPhone) ? data.senderPhone + '@c.us' : null;
    if (payload.event === 'message.received' && (!chatId || typeof data.body !== 'string' || !data.body.trim() || data.body.length > 4096)) throw reportError(400, 'Mensaje o identidad de contacto no válidos');
    if (payload.event !== 'message.received' && !['pending','sent','delivered','read','failed'].includes(data.status)) throw reportError(400, 'Estado de recibo no válido');
    eventId = await claimMessagingEvent({ canal: 'whatsapp', sessionId: config.sessionId, event: payload.event, messageId,
      status: payload.event === 'message.received' ? null : data.status, chatId }, config);
    if (!eventId) return res.json({ ok: true, duplicate: true });
    if (payload.event !== 'message.received') await recordReceipt(config, messageId, data.status);
    else {
      const resolved = await resolvePilotLink('whatsapp', chatId, data.body, config);
      const text = resolved.reply || await respondToPatientBooking(resolved.link, data.body, config);
      await sendOpenWAText(config, chatId, text);
    }
    await finishMessagingEvent(eventId, 'procesado');
    res.json({ ok: true });
  } catch (error) {
    if (eventId) {
      try { await finishMessagingEvent(eventId, 'revision_manual'); } catch { /* The persisted processing claim still prevents duplicate actions. */ }
      return res.json({ ok: true, requires_manual_review: true, request_id: req.id });
    }
    respondReportError(res, error, 'No se pudo aceptar el evento de WhatsApp');
  }
});

export default router;
