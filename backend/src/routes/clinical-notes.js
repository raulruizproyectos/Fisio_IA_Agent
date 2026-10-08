import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { recordAudit } from '../lib/audit.js';
import { transcribeAudio, synthesizeClinicalNote } from '../lib/clinical-voice.js';
import { readClinicalSummary } from '../lib/clinical-summary.js';
import { isDate } from '../lib/finance.js';
import { createOnce } from '../lib/clinic-creation.js';

const router = Router();
const CLINICAL_NOTES_TABLE = 'crm_notas_clinicas';

const NOTE_SELECT = 'id, paciente_id, cita_id, profesional_id, fecha, session_datetime, zona_corporal, dolor_eva, nota, pruebas_realizadas, structured_data, audio_processed, source, created_at, updated_at';

function validateNote(fields) {
  if (fields.nota !== undefined && (typeof fields.nota!=='string' || !fields.nota.trim() || fields.nota.length>50000)) return 'La nota clínica debe contener texto';
  if (fields.dolor_eva != null && (!['string','number'].includes(typeof fields.dolor_eva) || !/^(\d|10)$/.test(String(fields.dolor_eva)))) return 'EVA debe ser un entero entre 0 y 10, o quedar sin informar';
  if (fields.fecha !== undefined && !isDate(fields.fecha)) return 'Fecha de sesión inválida';
  if (fields.session_datetime !== undefined && (typeof fields.session_datetime!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(fields.session_datetime)
    || !isDate(fields.session_datetime.slice(0,10)) || !Number.isFinite(Date.parse(fields.session_datetime)))) return 'Fecha y hora de sesión inválidas';
  if (fields.structured_data !== undefined && (!fields.structured_data || typeof fields.structured_data!=='object' || Array.isArray(fields.structured_data))) return 'Datos clínicos estructurados inválidos';
  if (fields.audio_processed !== undefined && typeof fields.audio_processed!=='boolean') return 'Estado de audio inválido';
  if (fields.source !== undefined && !['manual','text','voice'].includes(fields.source)) return 'Origen de nota inválido';
  return null;
}

const isMissingClinicalNotesTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  return code === 'PGRST205' || (message.includes(CLINICAL_NOTES_TABLE) && (message.includes('schema cache') || message.includes('could not find the table')));
};

const clinicalNotesUnavailableMessage = 'Modulo notas clinicas no disponible: falta tabla crm_notas_clinicas. Ejecuta database/migrations/20260919_voice_session_notes_evolution.sql en Supabase.';

const respondClinicalNotesUnavailable = (res, { write = false } = {}) => {
  if (write) {
    return res.status(503).json({
      error: clinicalNotesUnavailableMessage,
      missing_table: CLINICAL_NOTES_TABLE,
    });
  }

  return res.json({
    data: [],
    unavailable: true,
    error: clinicalNotesUnavailableMessage,
    missing_table: CLINICAL_NOTES_TABLE,
  });
};

// 1. Voice Transcribe (STT via in-memory buffer)
router.post('/voice/transcribe', async (req, res, next) => {
  try {
    const { audio_base64, mime_type, filename } = req.body;
    if (typeof audio_base64 !== 'string' || !audio_base64.length || audio_base64.length > 14000000
      || audio_base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio_base64)) {
      return res.status(400).json({ error: 'Audio inválido o demasiado grande' });
    }
    if (mime_type != null && !['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus'].includes(mime_type)) return res.status(400).json({ error: 'Formato de audio inválido' });
    if (filename != null && (typeof filename !== 'string' || !/^[\w.-]{1,120}$/.test(filename))) return res.status(400).json({ error: 'Nombre de audio inválido' });

    const buffer = Buffer.from(audio_base64, 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Audio vacio o corrupto' });
    }

    const result = await transcribeAudio({
      buffer,
      mimeType: mime_type || 'audio/webm',
      filename: filename || 'recording.webm',
    });

    await recordAudit(req, {
      entity_type: 'clinical_voice_transcribe',
      entity_id: 'voice_stt',
      action: 'transcribe',
      metadata: { bytes: buffer.length, mimeType: mime_type },
    });

    res.json({ ok: true, transcript: result.text });
  } catch (err) {
    next(err);
  }
});

// 2. Clinical Synthesis from text
router.post('/voice/synthesize', async (req, res, next) => {
  try {
    const { text, paciente_id } = req.body;
    if (typeof text !== 'string' || !text.trim() || text.length > 12000) {
      return res.status(400).json({ error: 'El texto de sesión debe contener entre 1 y 12000 caracteres' });
    }

    let patientName = 'Paciente';
    let previousNotes = [];

    if (paciente_id) {
      if (typeof paciente_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paciente_id)) return res.status(400).json({ error: 'Identificador de paciente inválido' });
      const { data: patient, error: patientError } = await supabase
        .from('crm_pacientes')
        .select('nombre, apellidos')
        .eq('id', paciente_id)
        .maybeSingle();

      if (patientError) throw patientError;
      if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

      if (patient) {
        patientName = `${patient.nombre || ''} ${patient.apellidos || ''}`.trim() || 'Paciente';
      }

      const { data: prevNotes } = await supabase
        .from(CLINICAL_NOTES_TABLE)
        .select('id, fecha, session_datetime, dolor_eva, zona_corporal, nota, structured_data')
        .eq('paciente_id', paciente_id)
        .order('session_datetime', { ascending: false, nullsFirst: false }).order('fecha', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false })
        .limit(3);

      if (prevNotes) previousNotes = prevNotes;
    }

    const synthesis = await synthesizeClinicalNote({
      text,
      patientName,
      previousNotes,
    });

    res.json({ ok: true, note_preview: synthesis });
  } catch (err) {
    next(err);
  }
});

// 3. Clinical Evolution & Longitudinal History for a patient
router.get('/evolution/:paciente_id', async (req, res, next) => {
  try {
    const { paciente_id } = req.params;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });

    const limit = Math.max(1,Math.min(Math.floor(Number(req.query.limit)) || 20, 100));
    const offset = Math.max(Math.floor(Number(req.query.offset)) || 0, 0);

    const { data: patient, error: pErr } = await supabase
      .from('crm_pacientes')
      .select('id, nombre, apellidos, resumen_clinico_longitudinal, resumen_actualizado_en')
      .eq('id', paciente_id)
      .maybeSingle();

    if (pErr) throw pErr;
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

    const { data: notes, count, error: nErr } = await supabase
      .from(CLINICAL_NOTES_TABLE)
      .select(NOTE_SELECT, { count: 'exact' })
      .eq('paciente_id', paciente_id)
      .order('session_datetime', { ascending: false, nullsFirst: false }).order('fecha', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (nErr) {
      if (isMissingClinicalNotesTableError(nErr)) return respondClinicalNotesUnavailable(res);
      throw nErr;
    }

    // Calculate pain trend without fabricating numbers
    const validEvaNotes = (notes || [])
      .filter((n) => n.dolor_eva !== null && n.dolor_eva !== undefined)
      .map((n) => ({
        id: n.id,
        date: n.session_datetime || n.fecha,
        eva: Number(n.dolor_eva),
        zona: n.zona_corporal || '',
      }));

    let painTrend = {
      current: null,
      previous: null,
      change: null,
      series: validEvaNotes.reverse(), // chronological
    };

    if (validEvaNotes.length >= 1) {
      painTrend.current = validEvaNotes[validEvaNotes.length - 1].eva;
    }
    if (validEvaNotes.length >= 2) {
      painTrend.previous = validEvaNotes[validEvaNotes.length - 2].eva;
      painTrend.change = painTrend.current - painTrend.previous;
    }

    res.json({
      ok: true,
      paciente: {
        id: patient.id,
        nombre: patient.nombre,
        apellidos: patient.apellidos,
      },
      ...await readClinicalSummary(supabase,patient),
      timeline: notes || [],
      pain_trend: painTrend,
      total: count || (notes || []).length,
      limit,
      offset,
      has_more: (offset + (notes || []).length) < (count || 0),
    });
  } catch (err) {
    next(err);
  }
});

// 4. List notes for a patient (with pagination support)
router.get('/', async (req, res, next) => {
  try {
    const { paciente_id } = req.query;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });

    const limit = Math.max(1,Math.min(Math.floor(Number(req.query.limit)) || 50, 200));
    const offset = Math.max(Math.floor(Number(req.query.offset)) || 0, 0);

    const { data, count, error } = await supabase
      .from(CLINICAL_NOTES_TABLE)
      .select(NOTE_SELECT, { count: 'exact' })
      .eq('paciente_id', paciente_id)
      .order('session_datetime', { ascending: false, nullsFirst: false }).order('fecha', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (isMissingClinicalNotesTableError(error)) return respondClinicalNotesUnavailable(res);
      throw error;
    }

    res.json({
      data: data || [],
      total: count || (data || []).length,
      limit,
      offset,
      has_more: (offset + (data || []).length) < (count || 0),
    });
  } catch (err) {
    next(err);
  }
});

// 5. Create note (enriched with structured_data and longitudinal trigger)
router.post('/', async (req, res, next) => {
  try {
    const {
      paciente_id,
      cita_id,
      fecha,
      session_datetime,
      zona_corporal,
      dolor_eva,
      nota,
      pruebas_realizadas,
      structured_data,
      audio_processed,
      source,
    } = req.body;

    if (!paciente_id || !nota) {
      return res.status(400).json({ error: 'paciente_id y nota son requeridos' });
    }
    const validationError=validateNote(req.body);
    if (validationError) return res.status(400).json({error:validationError});
    const profileId=req.auth?.profile_id;
    if (!profileId) return res.status(403).json({error:'Perfil profesional requerido'});
    const {data:patient,error:patientError}=await supabase.from('crm_pacientes').select('id').eq('id',paciente_id).maybeSingle();
    if (patientError) throw patientError;
    if (!patient) return res.status(404).json({error:'Paciente no encontrado'});
    if (cita_id) {
      const {data:appointment,error:appointmentError}=await supabase.from('crm_citas').select('id').eq('id',cita_id).eq('paciente_id',paciente_id).maybeSingle();
      if (appointmentError) throw appointmentError;
      if (!appointment) return res.status(400).json({error:'La cita no pertenece al paciente'});
    }

    const sessionDt = session_datetime || (fecha ? `${fecha}T12:00:00.000Z` : new Date().toISOString());
    const sessionDate = fecha || sessionDt.slice(0, 10);

    const insertPayload = {
      paciente_id,
      cita_id: cita_id || null,
      profesional_id: profileId,
      fecha: sessionDate,
      session_datetime: sessionDt,
      zona_corporal: zona_corporal || null,
      dolor_eva: dolor_eva != null ? Number(dolor_eva) : null,
      nota,
      pruebas_realizadas: pruebas_realizadas || null,
      structured_data: structured_data || {},
      audio_processed: Boolean(audio_processed),
      source: source || 'text',
    };

    const {profesional_id:_author,...creationFields}=insertPayload;
    creationFields.fecha=fecha || null;
    creationFields.session_datetime=session_datetime || null;
    if (await createOnce(req,res,'note',creationFields)) return;

    const { data, error } = await supabase
      .from(CLINICAL_NOTES_TABLE)
      .insert(insertPayload)
      .select(NOTE_SELECT)
      .single();

    if (error) {
      if (isMissingClinicalNotesTableError(error)) return respondClinicalNotesUnavailable(res, { write: true });
      throw error;
    }

    await recordAudit(req, {
      entity_type: 'clinical_note',
      entity_id: data.id,
      action: 'create',
      after_state: data,
      metadata: { paciente_id, source: insertPayload.source },
    });

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

// 6. Update note
router.patch('/:id', async (req, res, next) => {
  try {
    const fields = {};
    const allowed = [
      'fecha',
      'session_datetime',
      'zona_corporal',
      'dolor_eva',
      'nota',
      'pruebas_realizadas',
      'structured_data',
      'audio_processed',
      'source',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }
    if (!Object.keys(fields).length) return res.status(400).json({error:'No hay cambios para aplicar'});
    const validationError=validateNote(fields);
    if (validationError) return res.status(400).json({error:validationError});
    if (fields.dolor_eva != null) fields.dolor_eva=Number(fields.dolor_eva);
    if (fields.fecha && !fields.session_datetime) fields.session_datetime=`${fields.fecha}T12:00:00.000Z`;
    fields.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(CLINICAL_NOTES_TABLE)
      .update(fields)
      .eq('id', req.params.id)
      .select(NOTE_SELECT)
      .maybeSingle();

    if (error) {
      if (isMissingClinicalNotesTableError(error)) return respondClinicalNotesUnavailable(res, { write: true });
      throw error;
    }

    if (!data) return res.status(404).json({error:'Nota clínica no encontrada'});

    await recordAudit(req, {
      entity_type: 'clinical_note',
      entity_id: req.params.id,
      action: 'update',
      after_state: data,
      metadata: { paciente_id: data?.paciente_id },
    });

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// 7. Delete note
router.delete('/:id', async (req, res, next) => {
  try {
    const { data: existing, error } = await supabase.from(CLINICAL_NOTES_TABLE).delete().eq('id', req.params.id).select('id,paciente_id').maybeSingle();
    if (error) {
      if (isMissingClinicalNotesTableError(error)) return respondClinicalNotesUnavailable(res, { write: true });
      throw error;
    }

    if (!existing) return res.status(404).json({error:'Nota clínica no encontrada'});

    await recordAudit(req, {
      entity_type: 'clinical_note',
      entity_id: req.params.id,
      action: 'delete',
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
