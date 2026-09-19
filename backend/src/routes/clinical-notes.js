import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { recordAudit } from '../lib/audit.js';
import { transcribeAudio, synthesizeClinicalNote, generateLongitudinalSummary } from '../lib/clinical-voice.js';

const router = Router();
const CLINICAL_NOTES_TABLE = 'crm_notas_clinicas';

const NOTE_SELECT = 'id, paciente_id, cita_id, profesional_id, fecha, session_datetime, zona_corporal, dolor_eva, nota, pruebas_realizadas, structured_data, audio_processed, source, created_at, updated_at';

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

// Update Layer 2 longitudinal summary in crm_pacientes
async function updatePatientLongitudinalSummary(pacienteId) {
  try {
    const { data: patient } = await supabase
      .from('crm_pacientes')
      .select('id, nombre, apellidos')
      .eq('id', pacienteId)
      .maybeSingle();

    if (!patient) return null;

    const patientName = `${patient.nombre || ''} ${patient.apellidos || ''}`.trim() || 'Paciente';

    const { data: notes } = await supabase
      .from(CLINICAL_NOTES_TABLE)
      .select(NOTE_SELECT)
      .eq('paciente_id', pacienteId)
      .order('session_datetime', { ascending: true })
      .limit(30);

    if (!notes || notes.length === 0) return null;

    const summary = await generateLongitudinalSummary({ patientName, notes });
    const now = new Date().toISOString();

    await supabase
      .from('crm_pacientes')
      .update({
        resumen_clinico_longitudinal: summary,
        resumen_actualizado_en: now,
      })
      .eq('id', pacienteId);

    return summary;
  } catch (err) {
    console.error('Error updating longitudinal summary for patient', pacienteId, err);
    return null;
  }
}

// 1. Voice Transcribe (STT via in-memory buffer)
router.post('/voice/transcribe', async (req, res, next) => {
  try {
    const { audio_base64, mime_type, filename } = req.body;
    if (!audio_base64) {
      return res.status(400).json({ error: 'audio_base64 es requerido' });
    }

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
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'El texto de la sesion es requerido' });
    }

    let patientName = 'Paciente';
    let previousNotes = [];

    if (paciente_id) {
      const { data: patient } = await supabase
        .from('crm_pacientes')
        .select('nombre, apellidos')
        .eq('id', paciente_id)
        .maybeSingle();

      if (patient) {
        patientName = `${patient.nombre || ''} ${patient.apellidos || ''}`.trim() || 'Paciente';
      }

      const { data: prevNotes } = await supabase
        .from(CLINICAL_NOTES_TABLE)
        .select('id, fecha, session_datetime, dolor_eva, zona_corporal, nota, structured_data')
        .eq('paciente_id', paciente_id)
        .order('session_datetime', { ascending: false })
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

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

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
      .order('session_datetime', { ascending: false })
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
      longitudinal_summary: patient.resumen_clinico_longitudinal || null,
      longitudinal_updated_at: patient.resumen_actualizado_en || null,
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

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const { data, count, error } = await supabase
      .from(CLINICAL_NOTES_TABLE)
      .select(NOTE_SELECT, { count: 'exact' })
      .eq('paciente_id', paciente_id)
      .order('session_datetime', { ascending: false })
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
      profesional_id,
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

    const sessionDt = session_datetime || (fecha ? `${fecha}T12:00:00.000Z` : new Date().toISOString());
    const sessionDate = fecha || sessionDt.slice(0, 10);

    const insertPayload = {
      paciente_id,
      cita_id: cita_id || null,
      profesional_id: profesional_id || null,
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

    const { data, error } = await supabase
      .from(CLINICAL_NOTES_TABLE)
      .insert(insertPayload)
      .select(NOTE_SELECT)
      .single();

    if (error) {
      if (isMissingClinicalNotesTableError(error)) return respondClinicalNotesUnavailable(res, { write: true });
      throw error;
    }

    // Trigger Layer 2 longitudinal summary update in background
    updatePatientLongitudinalSummary(paciente_id).catch(() => {});

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
    fields.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(CLINICAL_NOTES_TABLE)
      .update(fields)
      .eq('id', req.params.id)
      .select(NOTE_SELECT)
      .single();

    if (error) {
      if (isMissingClinicalNotesTableError(error)) return respondClinicalNotesUnavailable(res, { write: true });
      throw error;
    }

    if (data?.paciente_id) {
      updatePatientLongitudinalSummary(data.paciente_id).catch(() => {});
    }

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
    const { data: existing } = await supabase
      .from(CLINICAL_NOTES_TABLE)
      .select('id, paciente_id')
      .eq('id', req.params.id)
      .maybeSingle();

    const { error } = await supabase.from(CLINICAL_NOTES_TABLE).delete().eq('id', req.params.id);
    if (error) {
      if (isMissingClinicalNotesTableError(error)) return respondClinicalNotesUnavailable(res, { write: true });
      throw error;
    }

    if (existing?.paciente_id) {
      updatePatientLongitudinalSummary(existing.paciente_id).catch(() => {});
    }

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
