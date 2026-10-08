import { generateLongitudinalSummary } from './clinical-voice.js';

// ponytail: summarize the latest 30 saved notes; paginate the full history separately.
export async function readClinicalSummary(db,patient) {
  const {data,error} = await db.from('crm_notas_clinicas').select('*').eq('paciente_id',patient.id)
    .order('session_datetime',{ascending:false,nullsFirst:false}).order('fecha',{ascending:false}).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(30);
  if (error) throw error;
  const notes=data || [];
  const summary=await generateLongitudinalSummary({patientName:[patient.nombre,patient.apellidos].filter(Boolean).join(' ') || 'Paciente',notes,useAi:false});
  return {longitudinal_summary:summary,longitudinal_updated_at:notes.length ? notes.map(note=>note.updated_at || note.created_at || note.session_datetime || note.fecha).filter(Boolean).sort().at(-1) || null : null};
}
