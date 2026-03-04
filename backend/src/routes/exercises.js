import { Router } from 'express';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// â”€â”€â”€ GET /api/exercises/catalog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    res.status(500).json({ ok: false, error: 'Error al obtener catÃ¡logo' });
  }
});

// â”€â”€â”€ GET /api/exercises/:id/media â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ POST /api/exercises/recommend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    const catalogById = new Map((catalog || []).map((entry) => [String(entry.id), entry]));

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

    let n8nResult = null;
    let fallbackReason = '';
    try {
      const n8nResp = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
        signal: AbortSignal.timeout(30000),
      });
      const rawText = await n8nResp.text();
      n8nResult = safeJsonParse(rawText);
      if (!n8nResp.ok) {
        const engineMessage =
          n8nResult?.error ||
          n8nResult?.message ||
          `engine_http_${n8nResp.status}`;
        throw new Error(String(engineMessage));
      }
    } catch (n8nErr) {
      fallbackReason = n8nErr.message || 'engine_unreachable';
      console.warn('[exercises/recommend] fallback activated:', fallbackReason);
      await logComm(supabase, {
        paciente_id: patId,
        channel: n8nUrl ? 'n8n' : 'edge_function',
        direction: 'outbound',
        message_type: 'system',
        message_text: `Engine fallback: ${fallbackReason}`,
        request_id: requestId,
        status: 'error',
      });
    }

    // 3. Parse response and fallback to rules when model engine is unavailable
    let recommendation = n8nResult?.recommendation || n8nResult;
    if (!hasRecommendationShape(recommendation)) {
      if (!fallbackReason) fallbackReason = 'invalid_engine_response';
      recommendation = buildRuleBasedRecommendation({
        requestId,
        symptoms,
        catalog,
        fallbackReason,
      });
    }
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
      message_text: `Recomendacion generada: ${selected_exercises.length} ejercicios`,
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
    const exercises = selected_exercises.map((ex, idx) => {
      const exerciseId = ex.exercise_id || ex.id;
      const catalogEntry = catalogById.get(String(exerciseId)) || {};
      const metadata = catalogEntry.metadata || {};
      const procedimiento =
        ex.procedimiento ||
        ex.procedure ||
        ex.instructions ||
        metadata.procedimiento ||
        metadata.instrucciones ||
        null;

      return {
        exercise_id: exerciseId,
        nombre: ex.nombre || ex.name || catalogEntry.nombre || 'Ejercicio',
        descripcion: ex.descripcion || ex.description || catalogEntry.descripcion || '',
        zona_corporal: ex.zona_corporal || ex.body_area || catalogEntry.zona_corporal || null,
        confidence: ex.confidence || 0.8,
        why: ex.why || ex.reason || '',
        cautions: ex.cautions || [],
        procedimiento,
        series: ex.series ?? metadata.series_defecto ?? null,
        repeticiones: ex.repeticiones ?? metadata.repeticiones_defecto ?? null,
        duracion_segundos: ex.duracion_segundos ?? metadata.duracion_segundos_defecto ?? null,
        imagen_url:
          mediaMap[exerciseId] ||
          ex.imagen_url ||
          metadata.proet_image_url ||
          metadata.image_url ||
          null,
        orden: idx + 1,
      };
    });

    const informeClinico = composeClinicalReport({
      symptomSummary,
      messageToTherapist: message_to_therapist_es,
      messageToPatient: message_to_patient_es,
      escalation: escalation_recommend_medical_attention,
      exercises,
      recommendationId: recoRow.id,
    });

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
      exercises,
      message_to_patient: message_to_patient_es,
      message_to_therapist: message_to_therapist_es,
      selection_rationale,
      informe_clinico: informeClinico,
    };

    res.json(response);
  } catch (err) {
    console.error('[exercises/recommend] Error:', err.message);
    res.status(500).json({
      ok: false,
      error: 'Error generando recomendacion',
      request_id: requestId,
    });
  }
});

// â”€â”€â”€ GET /api/exercises/recommendations/:patientId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Helper: log communication â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function logComm(sb, payload) {
  try {
    await sb.from('crm_comunicaciones').insert(payload);
  } catch (err) {
    console.warn('[logComm] Error:', err.message);
  }
}

function composeClinicalReport({
  symptomSummary,
  messageToTherapist,
  messageToPatient,
  escalation,
  exercises,
  recommendationId,
}) {
  const lines = [];
  lines.push('INFORME DE EJERCICIOS');
  lines.push(`Sintomas: ${symptomSummary || 'No informado'}`);

  if (escalation) {
    lines.push('ALERTA: se recomienda valoracion medica prioritaria.');
  }
  if (messageToTherapist) {
    lines.push(`Nota clinica: ${messageToTherapist}`);
  }

  lines.push('');
  lines.push(`Ejercicios recomendados (${exercises.length}):`);

  exercises.forEach((ex) => {
    lines.push(`${ex.orden}. ${ex.nombre} (${ex.zona_corporal || 'general'})`);
    if (ex.procedimiento) lines.push(`   Procedimiento: ${normalizeProcedure(ex.procedimiento)}`);
    if (ex.series || ex.repeticiones || ex.duracion_segundos) {
      const pauta = [
        ex.series ? `Series ${ex.series}` : null,
        ex.repeticiones ? `Repeticiones ${ex.repeticiones}` : null,
        ex.duracion_segundos ? `Duracion ${ex.duracion_segundos}s` : null,
      ].filter(Boolean);
      lines.push(`   Pauta: ${pauta.join(' · ')}`);
    }
    if (ex.why) lines.push(`   Motivo: ${ex.why}`);
    if (Array.isArray(ex.cautions) && ex.cautions.length) lines.push(`   Cautelas: ${ex.cautions.join('; ')}`);
    if (ex.imagen_url) lines.push(`   Imagen: ${ex.imagen_url}`);
  });

  if (messageToPatient) {
    lines.push('');
    lines.push('Mensaje para paciente:');
    lines.push(messageToPatient);
  }

  lines.push('');
  lines.push(`ID recomendacion: ${recommendationId || '-'}`);
  return lines.join('\n').trim();
}

function normalizeProcedure(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean).join(' ');
  }
  return String(value || '').trim();
}

function safeJsonParse(text) {
  const raw = String(text || '').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function hasRecommendationShape(recommendation) {
  if (!recommendation || typeof recommendation !== 'object') return false;
  if (Array.isArray(recommendation.selected_exercises)) return true;
  if (Array.isArray(recommendation.exercises)) return true;
  return false;
}

function buildRuleBasedRecommendation({ requestId, symptoms, catalog, fallbackReason }) {
  const symptomText = String(symptoms || '').trim();
  const inferredZone = inferZoneFromSymptoms(symptomText);
  const redFlags = extractRedFlags(symptomText);

  const ranked = (catalog || [])
    .map((item) => ({ item, score: scoreExerciseForSymptoms(item, symptomText, inferredZone) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry, idx) => {
      const ex = entry.item;
      return {
        exercise_id: ex.id,
        id: ex.id,
        nombre: ex.nombre,
        descripcion: ex.descripcion || '',
        zona_corporal: ex.zona_corporal || inferredZone || 'general',
        confidence: Math.min(0.9, Math.max(0.55, entry.score / 10)),
        why: `Coincidencia con sintomas (${inferredZone || 'zona general'})`,
        cautions: ex.contraindicaciones ? [String(ex.contraindicaciones)] : [],
        series: ex.metadata?.series_defecto ?? 3,
        repeticiones: ex.metadata?.repeticiones_defecto ?? 10,
        duracion_segundos: ex.metadata?.duracion_segundos_defecto ?? null,
        procedimiento: ex.descripcion || '',
        orden: idx + 1,
      };
    });

  const noExercises = ranked.length === 0;
  const reason = fallbackReason || 'rule_based_fallback';

  return {
    request_id: requestId,
    symptom_summary: symptomText,
    red_flags_present: redFlags.length > 0,
    red_flags_items: redFlags,
    selected_exercises: ranked,
    selection_rationale: noExercises
      ? `Fallback activo (${reason}): sin ejercicios claramente compatibles`
      : `Fallback activo (${reason}): seleccion heuristica por sintomas y zona corporal`,
    message_to_patient_es: noExercises
      ? 'He registrado tus sintomas. Necesito revision manual del fisioterapeuta para pautar ejercicios seguros.'
      : 'He preparado una propuesta inicial de ejercicios. Realizalos sin dolor y para si notas empeoramiento.',
    message_to_therapist_es: noExercises
      ? 'Sin candidatos claros en catalogo para estos sintomas. Revisar manualmente.'
      : 'Recomendacion generada en modo fallback por indisponibilidad del motor IA.',
    escalation_recommend_medical_attention: redFlags.length > 0,
    escalation_reason: redFlags.length > 0 ? `red_flags:${redFlags.join(',')}` : '',
  };
}

function extractRedFlags(symptoms) {
  const text = String(symptoms || '').toLowerCase();
  const flags = [];
  if (/(fiebre|39|40)/.test(text)) flags.push('fiebre');
  if (/(hormigueo persistente|paralisis|perdida de fuerza|incontinencia)/.test(text)) flags.push('neurologico');
  if (/(caida|golpe fuerte|trauma reciente)/.test(text)) flags.push('trauma_reciente');
  if (/(dolor en pecho|falta de aire|disnea)/.test(text)) flags.push('urgencia_respiratoria');
  return [...new Set(flags)];
}

function inferZoneFromSymptoms(symptoms) {
  const text = String(symptoms || '').toLowerCase();
  if (/(cervical|cuello|trapecio)/.test(text)) return 'cervical';
  if (/(hombro|brazo|manguito|escapula)/.test(text)) return 'hombro_brazo';
  if (/(lumbar|espalda|dorsal|columna)/.test(text)) return 'espalda';
  if (/(cadera|gluteo|pelvis)/.test(text)) return 'cadera';
  if (/(rodilla|menisco|ligamento)/.test(text)) return 'rodilla';
  if (/(tobillo|pie|aquiles|gemelo|pantorrilla)/.test(text)) return 'tobillo_pie';
  return null;
}

function scoreExerciseForSymptoms(exercise, symptomText, inferredZone) {
  const name = String(exercise?.nombre || '').toLowerCase();
  const description = String(exercise?.descripcion || '').toLowerCase();
  const zone = String(exercise?.zona_corporal || '').toLowerCase();
  const combined = `${name} ${description} ${zone}`;
  const symptoms = String(symptomText || '').toLowerCase();

  let score = 0;
  if (inferredZone && zone.includes(inferredZone.toLowerCase())) score += 6;
  if (inferredZone && combined.includes(inferredZone.toLowerCase())) score += 2;

  const keywords = symptoms
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .slice(0, 10);

  for (const token of keywords) {
    if (combined.includes(token)) score += 1;
  }

  if (/(movilidad|estiramiento|activacion|fortalecimiento|control motor)/.test(combined)) score += 1;
  return score;
}

export default router;

