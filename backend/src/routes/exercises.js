import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── GET /api/exercises/catalog ───────────────────────────────────
// Returns active exercises from crm_ejercicios_catalogo, optionally filtered
router.get('/catalog', async (req, res) => {
  try {
    const { zona, nivel, q } = req.query;
    let query = supabase
      .from('crm_ejercicios_catalogo')
      .select('id, codigo, nombre, descripcion, zona_corporal, nivel, contraindicaciones, metadata')
      .eq('activo', true)
      .order('zona_corporal')
      .order('nombre');

    if (zona) query = query.eq('zona_corporal', zona);
    if (nivel) query = query.eq('nivel', nivel);
    if (q) query = query.ilike('nombre', `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ ok: true, data, total: data.length });
  } catch (err) {
    console.error('[exercises/catalog] Error:', err.message);
    res.status(500).json({ ok: false, error: 'Error al obtener catálogo' });
  }
});

// ─── GET /api/exercises/:id/media ─────────────────────────────────
// Returns media entries for an exercise with signed URLs
router.get('/:id/media', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: mediaRows, error } = await supabase
      .from('crm_ejercicio_media')
      .select('id, tipo_media, object_key, mime_type, ancho_px, alto_px, es_principal')
      .eq('ejercicio_id', id)
      .order('es_principal', { ascending: false });

    if (error) throw error;
    if (!mediaRows?.length) {
      return res.json({ ok: true, data: [], message: 'Sin media asociada' });
    }

    // Generate signed URLs (1 hour expiry)
    const withUrls = await Promise.all(
      mediaRows.map(async (m) => {
        const { data: signedData, error: signErr } = await supabase.storage
          .from('ejercicios')
          .createSignedUrl(m.object_key, 3600);
        return {
          ...m,
          signed_url: signErr ? null : signedData?.signedUrl,
        };
      })
    );

    res.json({ ok: true, data: withUrls });
  } catch (err) {
    console.error('[exercises/media] Error:', err.message);
    res.status(500).json({ ok: false, error: 'Error al obtener media' });
  }
});

// ─── POST /api/exercises/recommend ────────────────────────────────
// Main W2 endpoint: receives symptoms, queries catalog, calls OpenAI via n8n,
// stores recommendation + items, returns result
router.post('/recommend', async (req, res) => {
  const requestId = crypto.randomUUID();
  try {
    const {
      patient_id,
      paciente_id,
      symptoms,
      channel = 'crm_web',
      fisioterapeuta_id,
    } = req.body;

    const patId = patient_id || paciente_id;
    if (!patId || !symptoms) {
      return res.status(400).json({
        ok: false,
        error: 'Se requiere patient_id y symptoms',
      });
    }

    // 1. Fetch full catalog for OpenAI context
    const { data: catalog, error: catErr } = await supabase
      .from('crm_ejercicios_catalogo')
      .select('id, nombre, descripcion, zona_corporal, nivel, contraindicaciones, metadata')
      .eq('activo', true);

    if (catErr) throw catErr;

    // 2. Call n8n or Edge Function for exercise selection
    const n8nUrl = process.env.N8N_EXERCISE_WEBHOOK_URL;
    const edgeFnUrl = `${process.env.SUPABASE_URL}/functions/v1/exercise-recommend`;
    const targetUrl = n8nUrl || edgeFnUrl;

    const n8nPayload = {
      request_id: requestId,
      patient_id: patId,
      symptoms,
      channel,
      catalog: catalog.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        descripcion: e.descripcion,
        zona_corporal: e.zona_corporal,
        nivel: e.nivel,
        contraindicaciones: e.contraindicaciones,
        fase: e.metadata?.fase_original || null,
        series: e.metadata?.series_defecto || 3,
        repeticiones: e.metadata?.repeticiones_defecto || 10,
      })),
    };

    let n8nResult;
    try {
      const n8nResp = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
        signal: AbortSignal.timeout(30000),
      });
      n8nResult = await n8nResp.json();
    } catch (n8nErr) {
      console.error('[exercises/recommend] n8n error:', n8nErr.message);
      // Log communication error
      await logComm(supabase, {
        paciente_id: patId,
        channel: 'n8n',
        direction: 'outbound',
        message_type: 'system',
        message_text: `Error calling n8n: ${n8nErr.message}`,
        request_id: requestId,
        status: 'error',
      });
      return res.status(502).json({
        ok: false,
        error: 'No se pudo conectar con el agente de ejercicios',
        request_id: requestId,
      });
    }

    // 3. Parse n8n response and store recommendation
    const recommendation = n8nResult?.recommendation || n8nResult;
    const {
      symptom_summary = symptoms,
      red_flags_present = false,
      red_flags_items = [],
      selected_exercises = [],
      selection_rationale = '',
      message_to_patient_es = '',
      message_to_therapist_es = '',
      escalation_recommend_medical_attention = false,
      escalation_reason = '',
    } = recommendation;

    // 3a. Insert crm_recomendaciones
    const { data: recoRow, error: recoErr } = await supabase
      .from('crm_recomendaciones')
      .insert({
        paciente_id: patId,
        fisioterapeuta_id: fisioterapeuta_id || null,
        origen: channel,
        symptom_summary,
        red_flags_present,
        red_flags_items,
        selection_rationale,
        message_to_patient_es,
        message_to_therapist_es,
        escalation_recommend_medical_attention,
        escalation_reason,
        request_id: requestId,
        estado: escalation_recommend_medical_attention ? 'requiere_revision' : 'generada',
      })
      .select('id')
      .single();

    if (recoErr) throw recoErr;

    // 3b. Insert crm_recomendacion_items
    if (selected_exercises.length > 0) {
      const items = selected_exercises.map((ex, idx) => ({
        recomendacion_id: recoRow.id,
        ejercicio_id: ex.exercise_id || ex.id,
        confidence: ex.confidence || 0.8,
        why: ex.why || ex.reason || '',
        cautions: ex.cautions || [],
        orden: idx + 1,
      }));

      const { error: itemsErr } = await supabase
        .from('crm_recomendacion_items')
        .insert(items);

      if (itemsErr) {
        console.warn('[exercises/recommend] Error inserting items:', itemsErr.message);
      }
    }

    // 3c. Log communication
    await logComm(supabase, {
      paciente_id: patId,
      fisioterapeuta_id: fisioterapeuta_id || null,
      recomendacion_id: recoRow.id,
      channel,
      direction: 'internal',
      message_type: 'system',
      message_text: `Recomendación generada: ${selected_exercises.length} ejercicios`,
      request_id: requestId,
      status: 'processed',
    });

    // 4. Fetch media signed URLs for recommended exercises
    const exerciseIds = selected_exercises.map((e) => e.exercise_id || e.id).filter(Boolean);
    let mediaMap = {};

    if (exerciseIds.length > 0) {
      const { data: mediaRows } = await supabase
        .from('crm_ejercicio_media')
        .select('ejercicio_id, object_key, tipo_media, es_principal')
        .in('ejercicio_id', exerciseIds)
        .eq('es_principal', true);

      if (mediaRows?.length) {
        for (const m of mediaRows) {
          const { data: signed } = await supabase.storage
            .from('ejercicios')
            .createSignedUrl(m.object_key, 3600);
          if (signed?.signedUrl) {
            mediaMap[m.ejercicio_id] = signed.signedUrl;
          }
        }
      }
    }

    // 5. Build response
    const response = {
      ok: true,
      request_id: requestId,
      recommendation_id: recoRow.id,
      symptom_summary,
      red_flags: { present: red_flags_present, items: red_flags_items },
      escalation: {
        recommend_medical_attention: escalation_recommend_medical_attention,
        reason: escalation_reason,
      },
      exercises: selected_exercises.map((ex, idx) => ({
        exercise_id: ex.exercise_id || ex.id,
        nombre: ex.nombre || ex.name,
        descripcion: ex.descripcion || ex.description,
        zona_corporal: ex.zona_corporal || ex.body_area,
        confidence: ex.confidence || 0.8,
        why: ex.why || ex.reason,
        cautions: ex.cautions || [],
        imagen_url: mediaMap[ex.exercise_id || ex.id] || null,
        orden: idx + 1,
      })),
      message_to_patient: message_to_patient_es,
      message_to_therapist: message_to_therapist_es,
      selection_rationale,
    };

    res.json(response);
  } catch (err) {
    console.error('[exercises/recommend] Error:', err.message);
    res.status(500).json({
      ok: false,
      error: 'Error generando recomendación',
      request_id: requestId,
    });
  }
});

// ─── GET /api/exercises/recommendations/:patientId ────────────────
// Returns past recommendations for a patient
router.get('/recommendations/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 10 } = req.query;

    const { data, error } = await supabase
      .from('crm_recomendaciones')
      .select(`
        id, origen, symptom_summary, red_flags_present, red_flags_items,
        selection_rationale, message_to_patient_es, message_to_therapist_es,
        escalation_recommend_medical_attention, escalation_reason,
        estado, request_id, created_at,
        crm_recomendacion_items (
          id, ejercicio_id, confidence, why, cautions, orden,
          crm_ejercicios_catalogo ( id, nombre, descripcion, zona_corporal, nivel )
        )
      `)
      .eq('paciente_id', patientId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({ ok: true, data, total: data.length });
  } catch (err) {
    console.error('[exercises/recommendations] Error:', err.message);
    res.status(500).json({ ok: false, error: 'Error al obtener recomendaciones' });
  }
});

// ─── Helper: log communication ────────────────────────────────────
async function logComm(sb, payload) {
  try {
    await sb.from('crm_comunicaciones').insert(payload);
  } catch (err) {
    console.warn('[logComm] Error:', err.message);
  }
}

export default router;
