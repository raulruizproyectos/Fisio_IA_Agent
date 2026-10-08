import { supabase } from './supabase.js';
import { publicHttpErrorMessage } from './public-error.js';

export const reportError = (status, message, code) => Object.assign(new Error(message), { status, code, expose: true });

export function respondReportError(res, error, fallback) {
  const dbStatus = /^PT(400|404|409)$/.exec(String(error.code || ''));
  const status = error.status || (dbStatus ? Number(dbStatus[1]) : error.code === '42501' ? 403 : 500);
  return res.status(status).json({ ok: false, error: publicHttpErrorMessage(error, status, fallback), code: error.code });
}

export async function getApprovedExerciseReport(recommendationId, patientId = null) {
  if (!recommendationId) throw reportError(400, 'recommendation_id es obligatorio');
  const { data: row, error } = await supabase.from('crm_recomendaciones')
    .select('id, paciente_id, fisioterapeuta_id, estado, reviewed_at, reviewed_by_profile_id, report_snapshot, report_version, request_id, red_flags_present, red_flags_items, crm_pacientes(nombre, apellidos)')
    .eq('id', recommendationId).maybeSingle();
  if (error) throw error;
  if (!row || (patientId && patientId !== row.paciente_id)) throw reportError(404, 'Recomendación no encontrada para este paciente');
  if (!['aprobada', 'enviada'].includes(row.estado) || !row.reviewed_at || !row.reviewed_by_profile_id) {
    throw reportError(409, 'Revisa y aprueba el plan antes de exportarlo o enviarlo', 'professional_approval_required');
  }
  if (!Array.isArray(row.report_snapshot?.exercises) || !row.report_snapshot.exercises.length) {
    throw reportError(409, 'Falta el contenido aprobado del plan; vuelve a revisarlo', 'approved_report_missing');
  }
  const ids = row.report_snapshot.exercises.map((exercise) => exercise.exercise_id);
  const { data: catalog, error: catalogError } = await supabase.from('crm_ejercicios_catalogo').select('id, metadata').in('id', ids);
  if (catalogError) throw catalogError;
  const { data: media, error: mediaError } = await supabase.from('crm_ejercicio_media')
    .select('ejercicio_id, object_key').in('ejercicio_id', ids).eq('es_principal', true);
  if (mediaError) throw mediaError;
  const images = new Map((catalog || []).map((entry) => [entry.id, entry.metadata?.proet_image_url || entry.metadata?.image_url || null]));
  for (const entry of media || []) {
    const { data } = await supabase.storage.from('ejercicios').createSignedUrl(entry.object_key, 3600);
    if (data?.signedUrl) images.set(entry.ejercicio_id, data.signedUrl);
  }
  return {
    ...row.report_snapshot,
    recommendation_id: row.id,
    patient_id: row.paciente_id,
    patient_name: [row.crm_pacientes?.nombre, row.crm_pacientes?.apellidos].filter(Boolean).join(' ') || 'Paciente',
    fisioterapeuta_id: row.fisioterapeuta_id,
    request_id: row.request_id,
    report_version: row.report_version,
    red_flags: { present: row.red_flags_present, items: row.red_flags_items },
    approval_state: row.estado,
    reviewed_at: row.reviewed_at,
    exercises: row.report_snapshot.exercises.map((exercise) => ({ ...exercise, imagen_url: images.get(exercise.exercise_id) || null })),
  };
}
