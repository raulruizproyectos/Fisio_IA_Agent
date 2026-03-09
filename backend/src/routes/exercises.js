import { Router } from 'express';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const EXERCISE_ENGINE_TIMEOUT_MS = Number(process.env.EXERCISE_ENGINE_TIMEOUT_MS || 30000);
const EXERCISE_ENGINE_MAX_ATTEMPTS = Number(process.env.EXERCISE_ENGINE_MAX_ATTEMPTS || 2);
const EXERCISE_ENGINE_CANDIDATE_LIMIT = Number(process.env.EXERCISE_ENGINE_CANDIDATE_LIMIT || 24);
const EXERCISE_IMAGE_MIN_RATIO = Math.min(
  1,
  Math.max(0.25, Number(process.env.EXERCISE_IMAGE_MIN_RATIO || 0.75))
);
const EXERCISE_REQUIRE_PATIENT_ASSOCIATION = String(
  process.env.EXERCISE_REQUIRE_PATIENT_ASSOCIATION || 'true'
).toLowerCase() !== 'false';
const EXERCISE_ASYNC_JOB_TTL_MS = Number(
  process.env.EXERCISE_ASYNC_JOB_TTL_MS || 15 * 60 * 1000
);
const EXERCISE_ASYNC_JOB_CLEANUP_MS = Number(
  process.env.EXERCISE_ASYNC_JOB_CLEANUP_MS || 60 * 1000
);
const exerciseRecommendationJobs = new Map();
let lastExerciseJobCleanupAt = 0;
const EXERCISE_ASYNC_JOB_TABLE = 'crm_async_jobs';
let exerciseAsyncJobPersistenceEnabled = true;

// --- GET /api/exercises/catalog ---
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

    // Enrich each exercise with resolved imagen_url from metadata
    const enriched = (data || []).map((ex) => {
      const meta = ex.metadata || {};
      return {
        ...ex,
        imagen_url: meta.proet_image_url || meta.image_url || null,
      };
    });

    res.json({ ok: true, data: enriched, total: enriched.length });
  } catch (err) {
    console.error('[exercises/catalog] Error:', err.message);
    res.status(500).json({ ok: false, error: 'Error al obtener catalogo' });
  }
});

// --- POST /api/exercises/recommend/async ---
// Starts W2 in background and lets the frontend poll for status/result.
router.post('/recommend/async', async (req, res) => {
  try {
    const rawInput = normalizeAsyncRecommendationInput(req.body);
    const input = await resolveRecommendationIdentity(rawInput);
    if (rawInput.patient_id && !input.patient_id) {
      throw createRecommendationHttpError(
        400,
        'No se pudo resolver patient_id al modelo CRM (crm_pacientes)',
        'patient_not_resolved'
      );
    }
    const job = await createExerciseRecommendationJob(input);
    startExerciseRecommendationJob(job.job_id);

    res.status(202).json({
      ok: true,
      accepted: true,
      job_id: job.job_id,
      tracking_request_id: job.tracking_request_id,
      status: job.status,
      progress_message: job.progress_message,
      poll_url: '/api/exercises/recommend/jobs/' + job.job_id,
      created_at: job.created_at,
    });
  } catch (err) {
    sendRecommendationError(res, err);
  }
});

// --- GET /api/exercises/recommend/jobs/:jobId ---
// Returns queued/running/done/error so the frontend can poll until the report is ready.
router.get('/recommend/jobs/:jobId', async (req, res) => {
  const job = await getExerciseRecommendationJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({
      ok: false,
      error: 'Trabajo asincrono no encontrado o expirado',
      code: 'async_job_not_found',
    });
  }

  const payload = serializeExerciseRecommendationJob(job);
  res.json({
    ok: job.status !== 'error',
    ...payload,
  });
});

// --- GET /api/exercises/:id/media ---
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

// --- POST /api/exercises/recommend ---
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

    const rawPatientId = patient_id || paciente_id || null;
    const resolvedInput = await resolveRecommendationIdentity({
      patient_id: rawPatientId,
      symptoms,
      channel,
      fisioterapeuta_id,
    });
    const patId = resolvedInput.patient_id;
    const resolvedFisioterapeutaId = resolvedInput.fisioterapeuta_id;

    if (!symptoms || !String(symptoms).trim()) {
      return res.status(400).json({
        ok: false,
        error: 'Se requiere symptoms',
      });
    }
    if (rawPatientId && !patId) {
      return res.status(400).json({
        ok: false,
        error: 'No se pudo resolver patient_id al modelo CRM (crm_pacientes)',
        code: 'patient_not_resolved',
      });
    }
    if (!patId && EXERCISE_REQUIRE_PATIENT_ASSOCIATION) {
      return res.status(400).json({
        ok: false,
        error: 'Selecciona un paciente antes de generar el informe de ejercicios.',
        code: 'patient_required',
      });
    }
    if (resolvedInput.raw_fisioterapeuta_id && !resolvedFisioterapeutaId) {
      console.warn('[exercises/recommend] unresolved fisioterapeuta_id:', resolvedInput.raw_fisioterapeuta_id);
    }
    const persistRecommendation = Boolean(patId);
    let persistenceWarning = null;

    // 1. Fetch full catalog for OpenAI context
    const { data: catalog, error: catErr } = await supabase
      .from('crm_ejercicios_catalogo')
      .select('id, nombre, descripcion, zona_corporal, nivel, contraindicaciones, metadata')
      .eq('activo', true);

    if (catErr) throw catErr;
    const catalogById = new Map((catalog || []).map((entry) => [String(entry.id), entry]));
    const engineCatalog = buildEngineCandidateCatalog(catalog || [], symptoms);

    // 2. Call n8n or Edge Function for exercise selection
    const n8nUrl = process.env.N8N_EXERCISE_WEBHOOK_URL;
    const edgeFnUrl = process.env.SUPABASE_URL
      ? `${process.env.SUPABASE_URL}/functions/v1/exercise-recommend`
      : null;
    const targetUrl = n8nUrl || edgeFnUrl;
    const engineTarget = n8nUrl ? 'n8n' : 'edge_function';

    const n8nPayload = {
      request_id: requestId,
      patient_id: patId,
      symptoms,
      channel,
      catalog_total: catalog.length,
      candidate_count: engineCatalog.length,
      catalog: engineCatalog.map((e) => ({
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
    const engineCall = targetUrl
      ? await callEngineWithRetry({
          targetUrl,
          payload: n8nPayload,
          timeoutMs: EXERCISE_ENGINE_TIMEOUT_MS,
          maxAttempts: EXERCISE_ENGINE_MAX_ATTEMPTS,
        })
      : {
          ok: false,
          error: new Error('engine_target_not_configured'),
          attempts: [],
          totalDurationMs: 0,
        };
    const engineObservability = {
      target: engineTarget,
      timeout_ms: EXERCISE_ENGINE_TIMEOUT_MS,
      max_attempts: EXERCISE_ENGINE_MAX_ATTEMPTS,
      attempts: engineCall.attempts.length,
      retries_used: Math.max(0, engineCall.attempts.length - 1),
      fallback_used: !engineCall.ok,
      fallback_reason: null,
      total_duration_ms: engineCall.totalDurationMs,
      catalog_total: catalog.length,
      candidate_count: engineCatalog.length,
      candidate_limit: EXERCISE_ENGINE_CANDIDATE_LIMIT,
      attempts_detail: engineCall.attempts,
    };

    if (engineCall.ok) {
      n8nResult = engineCall.data;
    } else {
      fallbackReason = engineCall.error?.message || 'engine_unreachable';
      engineObservability.fallback_reason = fallbackReason;
      console.warn('[exercises/recommend] fallback activated:', fallbackReason);
      if (persistRecommendation) {
        await logComm(supabase, {
          paciente_id: patId,
          channel: resolveCommChannel(channel || 'backend'),
          direction: 'outbound',
          message_type: 'system',
          message_text: `Engine fallback: ${fallbackReason} (attempts=${engineObservability.attempts}, retries=${engineObservability.retries_used})`,
          payload: {
            event: 'engine_fallback',
            engine_observability: engineObservability,
          },
          request_id: requestId,
          status: 'error',
        });
      }
    }

    // 3. Parse response and fallback to rules when model engine is unavailable
    let recommendation = n8nResult?.recommendation || n8nResult;
    if (!hasRecommendationShape(recommendation)) {
      if (!fallbackReason) fallbackReason = 'invalid_engine_response';
      engineObservability.fallback_used = true;
      engineObservability.fallback_reason = fallbackReason;
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
      selected_exercises: rawSelectedExercises = [],
      selection_rationale = '',
      message_to_patient_es = '',
      message_to_therapist_es = '',
      escalation_recommend_medical_attention = false,
      escalation_reason = '',
    } = recommendation;
    const selectedExercises = improveSelectionImageCoverage({
      selectedExercises: rawSelectedExercises,
      catalog,
      symptoms,
    });
    engineObservability.image_min_ratio = EXERCISE_IMAGE_MIN_RATIO;
    engineObservability.image_coverage_adjusted = selectedExercises.some((item, index) => {
      const rawId = String(rawSelectedExercises[index]?.exercise_id || rawSelectedExercises[index]?.id || '');
      const currentId = String(item?.exercise_id || item?.id || '');
      return rawId !== currentId;
    });

    // 3a/3b/3c. Persist only when patient_id exists
    let recommendationId = null;
    if (persistRecommendation) {
      try {
        const { data: recoRow, error: recoErr } = await supabase
          .from('crm_recomendaciones')
          .insert({
            paciente_id: patId,
            fisioterapeuta_id: resolvedFisioterapeutaId || null,
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
        recommendationId = recoRow.id;

        if (selectedExercises.length > 0) {
          const items = selectedExercises.map((ex, idx) => ({
            recomendacion_id: recommendationId,
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

        await logComm(supabase, {
          paciente_id: patId,
          fisioterapeuta_id: resolvedFisioterapeutaId || null,
          recomendacion_id: recommendationId,
          channel: resolveCommChannel(channel),
          direction: 'internal',
          message_type: 'system',
          message_text: `Recomendacion generada: ${selectedExercises.length} ejercicios`,
          payload: {
            event: 'recommendation_generated',
            selected_exercises_count: selectedExercises.length,
            engine_observability: engineObservability,
            fallback_reason: engineObservability.fallback_reason || null,
          },
          request_id: requestId,
          status: 'processed',
        });
      } catch (persistenceErr) {
        persistenceWarning = persistenceErr?.message || 'recommendation_persistence_failed';
        console.warn('[exercises/recommend] persistence warning:', persistenceWarning);
      }
    }

    // 4. Fetch media signed URLs for recommended exercises
    // Only query crm_ejercicio_media if it has rows (currently empty; PROET images live in metadata)
    const exerciseIds = selectedExercises.map((e) => e.exercise_id || e.id).filter(Boolean);
    let mediaMap = {};

    if (exerciseIds.length > 0) {
      const { count: mediaCount } = await supabase
        .from('crm_ejercicio_media')
        .select('id', { count: 'exact', head: true });

      if (mediaCount && mediaCount > 0) {
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
    }

    // 5. Build response
    const exercises = selectedExercises.map((ex, idx) => {
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
        imagen_url: getExerciseImageUrl(ex, mediaMap) || getExerciseImageUrl(catalogEntry, mediaMap),
        orden: idx + 1,
      };
    });

    const informeClinico = composeClinicalReport({
      symptomSummary: symptom_summary,
      messageToTherapist: message_to_therapist_es,
      messageToPatient: message_to_patient_es,
      escalation: escalation_recommend_medical_attention,
      exercises,
      recommendationId,
    });

    // Image coverage metric for observability
    const withImage = exercises.filter((e) => e.imagen_url).length;
    const imageCoverage = {
      with_image: withImage,
      total: exercises.length,
      percentage: exercises.length > 0 ? Math.round((withImage / exercises.length) * 100) : 0,
    };

    const response = {
      ok: true,
      request_id: requestId,
      patient_id: patId,
      recommendation_id: recommendationId,
      symptom_summary,
      red_flags: { present: red_flags_present, items: red_flags_items },
      escalation: {
        recommend_medical_attention: escalation_recommend_medical_attention,
        reason: escalation_reason,
      },
      exercises,
      image_coverage: imageCoverage,
      engine_observability: engineObservability,
      message_to_patient: message_to_patient_es,
      message_to_therapist: message_to_therapist_es,
      selection_rationale,
      informe_clinico: informeClinico,
      persistence_skipped: !persistRecommendation || Boolean(persistenceWarning),
      persistence_warning: persistenceWarning,
    };

    if (persistRecommendation && recommendationId) {
      await logComm(supabase, {
        paciente_id: patId,
        fisioterapeuta_id: resolvedFisioterapeutaId || null,
        recomendacion_id: recommendationId,
        channel: resolveCommChannel(channel),
        direction: 'internal',
        message_type: 'event',
        message_text: `Informe clinico generado para recomendacion ${recommendationId}`,
        payload: {
          event: 'exercise_report_snapshot',
          report: {
            request_id: requestId,
            recommendation_id: recommendationId,
            symptom_summary,
            selection_rationale,
            red_flags: { present: red_flags_present, items: red_flags_items },
            escalation: {
              recommend_medical_attention: escalation_recommend_medical_attention,
              reason: escalation_reason,
            },
            message_to_patient: message_to_patient_es,
            message_to_therapist: message_to_therapist_es,
            exercises,
            image_coverage: imageCoverage,
            informe_clinico: informeClinico,
          },
          engine_observability: engineObservability,
        },
        request_id: requestId,
        status: 'processed',
      });
    }

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

// --- GET /api/exercises/recommendations/:patientId ---
// Returns past recommendations for a patient
router.get('/recommendations/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 10 } = req.query;
    const parsedLimit = Number.parseInt(String(limit), 10);
    const safeLimit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 10;

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
      .limit(safeLimit);

    if (error) throw error;

    const recommendationIds = (data || []).map((row) => row.id).filter(Boolean);
    const followUpsByRecommendation = new Map();
    const reportSnapshotByRecommendation = new Map();

    if (recommendationIds.length > 0) {
      const { data: commRows, error: commErr } = await supabase
        .from('crm_comunicaciones')
        .select('id, recomendacion_id, message_text, payload, status, occurred_at, created_at')
        .in('recomendacion_id', recommendationIds)
        .order('occurred_at', { ascending: false })
        .limit(500);

      if (commErr) throw commErr;

      for (const row of commRows || []) {
        const recommendationId = row?.recomendacion_id;
        if (!recommendationId) continue;

        const eventName = String(row?.payload?.event || '').trim();
        if (eventName === 'recommendation_follow_up') {
          const current = followUpsByRecommendation.get(recommendationId) || [];
          current.push(normalizeRecommendationFollowUp(row));
          followUpsByRecommendation.set(recommendationId, current);
          continue;
        }

        if (eventName === 'exercise_report_snapshot' && !reportSnapshotByRecommendation.has(recommendationId)) {
          reportSnapshotByRecommendation.set(recommendationId, row?.payload?.report || null);
        }
      }
    }

    const enriched = (data || []).map((row) => ({
      ...row,
      follow_ups: followUpsByRecommendation.get(row.id) || [],
      report_snapshot: reportSnapshotByRecommendation.get(row.id) || null,
    }));

    res.json({ ok: true, data: enriched, total: enriched.length });
  } catch (err) {
    console.error('[exercises/recommendations] Error:', err.message);
    res.status(500).json({ ok: false, error: 'Error al obtener recomendaciones' });
  }
});

router.post('/recommendations/:recommendationId/follow-up', async (req, res) => {
  try {
    const { recommendationId } = req.params;
    const noteText = String(req.body?.note_text || req.body?.texto_nota || '').trim();
    const adherenceStatus = String(req.body?.adherence_status || '').trim() || null;
    const painScale = parsePainScale(req.body?.pain_scale ?? req.body?.escala_dolor);
    const requestedState = sanitizeRecommendationState(
      req.body?.estado || req.body?.recommendation_state || null
    );
    const fisioterapeutaId = req.body?.fisioterapeuta_id || null;

    if (!noteText && adherenceStatus === null && painScale === null && !requestedState) {
      return res.status(400).json({
        ok: false,
        error: 'Debes enviar al menos uno: note_text, adherence_status, pain_scale o estado',
      });
    }

    const { data: recommendationRow, error: recommendationErr } = await supabase
      .from('crm_recomendaciones')
      .select('id, paciente_id, fisioterapeuta_id, estado, request_id')
      .eq('id', recommendationId)
      .single();

    if (recommendationErr) throw recommendationErr;
    if (!recommendationRow) {
      return res.status(404).json({ ok: false, error: 'Recomendacion no encontrada' });
    }

    let currentState = recommendationRow.estado;
    if (requestedState && requestedState !== currentState) {
      const { data: updatedRow, error: updateErr } = await supabase
        .from('crm_recomendaciones')
        .update({
          estado: requestedState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recommendationId)
        .select('estado')
        .single();
      if (updateErr) throw updateErr;
      currentState = updatedRow?.estado || requestedState;
    }

    const followUpPayload = {
      event: 'recommendation_follow_up',
      note_text: noteText || null,
      adherence_status: adherenceStatus,
      pain_scale: painScale,
      estado_objetivo: requestedState || null,
      estado_actual: currentState,
    };

    const occurredAt = new Date().toISOString();
    await logComm(supabase, {
      paciente_id: recommendationRow.paciente_id,
      fisioterapeuta_id: fisioterapeutaId || recommendationRow.fisioterapeuta_id || null,
      recomendacion_id: recommendationId,
      channel: 'crm_web',
      direction: 'internal',
      message_type: 'event',
      message_text: noteText || 'Seguimiento de recomendacion registrado',
      payload: followUpPayload,
      request_id: recommendationRow.request_id || null,
      status: 'processed',
      occurred_at: occurredAt,
    });

    res.status(201).json({
      ok: true,
      data: {
        recommendation_id: recommendationId,
        estado: currentState,
        follow_up: {
          note_text: noteText || null,
          adherence_status: adherenceStatus,
          pain_scale: painScale,
          created_at: occurredAt,
        },
      },
    });
  } catch (err) {
    console.error('[exercises/recommendations/follow-up] Error:', err.message);
    res.status(500).json({ ok: false, error: 'Error guardando seguimiento de recomendacion' });
  }
});

// --- Helper: log communication ---
router.post('/reports/archive', async (req, res) => {
  try {
    const recommendationId = String(
      req.body?.recommendation_id || req.body?.recomendacion_id || ''
    ).trim();
    const format = String(req.body?.format || 'pdf').trim().toLowerCase();
    const source = resolveCommChannel(req.body?.source || req.body?.channel || 'crm_web');
    const fisioterapeutaId = req.body?.fisioterapeuta_id || null;
    const customNote = String(req.body?.note_text || req.body?.texto_nota || '').trim();

    if (!recommendationId) {
      return res.status(400).json({
        ok: false,
        error: 'recommendation_id es obligatorio',
      });
    }

    const { data: recommendationRow, error: recommendationErr } = await supabase
      .from('crm_recomendaciones')
      .select('id, paciente_id, fisioterapeuta_id, request_id')
      .eq('id', recommendationId)
      .single();

    if (recommendationErr) throw recommendationErr;
    if (!recommendationRow) {
      return res.status(404).json({
        ok: false,
        error: 'Recomendacion no encontrada',
      });
    }

    const archivedAt = new Date().toISOString();
    const noteText =
      customNote ||
      `Informe ${format.toUpperCase()} generado y archivado para recomendacion ${recommendationId}`;

    await logComm(supabase, {
      paciente_id: recommendationRow.paciente_id,
      fisioterapeuta_id: fisioterapeutaId || recommendationRow.fisioterapeuta_id || null,
      recomendacion_id: recommendationId,
      channel: source,
      direction: 'internal',
      message_type: 'event',
      message_text: noteText,
      payload: {
        event: 'exercise_report_archived',
        recommendation_id: recommendationId,
        format,
        source,
        archived_at: archivedAt,
      },
      request_id: recommendationRow.request_id || null,
      status: 'processed',
      occurred_at: archivedAt,
    });

    try {
      await supabase.from('notas_seguimiento_paciente').insert({
        paciente_id: recommendationRow.paciente_id,
        profesional_id: fisioterapeutaId || recommendationRow.fisioterapeuta_id || null,
        fuente: 'texto',
        texto_nota: noteText,
      });
    } catch (noteErr) {
      if (!isMissingTableError(noteErr, 'notas_seguimiento_paciente')) throw noteErr;
    }

    res.status(201).json({
      ok: true,
      data: {
        recommendation_id: recommendationId,
        patient_id: recommendationRow.paciente_id,
        format,
        archived_at: archivedAt,
      },
    });
  } catch (err) {
    console.error('[exercises/reports/archive] Error:', err.message);
    res.status(500).json({
      ok: false,
      error: 'Error archivando informe',
    });
  }
});

async function logComm(sb, payload) {
  try {
    await sb.from('crm_comunicaciones').insert(payload);
  } catch (err) {
    if (isMissingColumnError(err, 'payload') && payload && typeof payload === 'object') {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.payload;
      try {
        await sb.from('crm_comunicaciones').insert(fallbackPayload);
        return;
      } catch (fallbackErr) {
        console.warn('[logComm] Error fallback insert:', fallbackErr.message);
        return;
      }
    }
    console.warn('[logComm] Error:', err.message);
  }
}

function resolveCommChannel(rawChannel) {
  const allowed = new Set(['telegram', 'crm_web', 'backend', 'n8n', 'google_calendar']);
  const channel = String(rawChannel || '').trim().toLowerCase();
  return allowed.has(channel) ? channel : 'backend';
}

function parsePainScale(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0 || parsed > 10) return null;
  return parsed;
}

function sanitizeRecommendationState(value) {
  const allowed = new Set(['generada', 'enviada', 'error', 'requiere_revision']);
  const state = String(value || '').trim().toLowerCase();
  if (!state) return null;
  return allowed.has(state) ? state : null;
}

function normalizeRecommendationFollowUp(row) {
  const payload = row && typeof row.payload === 'object' ? row.payload : {};
  return {
    id: row?.id || null,
    note_text: payload.note_text || row?.message_text || null,
    adherence_status: payload.adherence_status || null,
    pain_scale: parsePainScale(payload.pain_scale),
    estado_objetivo: sanitizeRecommendationState(payload.estado_objetivo),
    estado_actual: sanitizeRecommendationState(payload.estado_actual),
    status: row?.status || null,
    created_at: row?.occurred_at || row?.created_at || null,
  };
}

function isMissingColumnError(error, columnName) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes(`column "${String(columnName || '').toLowerCase()}"`) && msg.includes('does not exist');
}

function isMissingTableError(error, tableName) {
  const msg = String(error?.message || '').toLowerCase();
  const table = String(tableName || '').toLowerCase();
  return msg.includes(`relation "${table}"`) && msg.includes('does not exist');
}

function splitFullName(fullName = '') {
  const value = String(fullName || '').trim();
  if (!value) return { nombre: 'Paciente', apellidos: null };
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { nombre: parts[0], apellidos: null };
  return {
    nombre: parts[0],
    apellidos: parts.slice(1).join(' '),
  };
}

async function resolveCrmPatientId(rawPatientId) {
  if (!rawPatientId) return null;

  const crmPatient = await supabase
    .from('crm_pacientes')
    .select('id')
    .eq('id', rawPatientId)
    .maybeSingle();

  if (crmPatient.error) throw crmPatient.error;
  if (crmPatient.data?.id) return crmPatient.data.id;

  const legacyPatient = await supabase
    .from('pacientes')
    .select('id, nombre_completo, email, phone, fecha_nacimiento')
    .eq('id', rawPatientId)
    .maybeSingle();

  if (legacyPatient.error) throw legacyPatient.error;
  if (!legacyPatient.data) return null;

  if (legacyPatient.data.email) {
    const existingByEmail = await supabase
      .from('crm_pacientes')
      .select('id')
      .eq('email', legacyPatient.data.email)
      .maybeSingle();

    if (existingByEmail.error) throw existingByEmail.error;
    if (existingByEmail.data?.id) return existingByEmail.data.id;
  }

  const { nombre, apellidos } = splitFullName(legacyPatient.data.nombre_completo);
  const inserted = await supabase
    .from('crm_pacientes')
    .insert({
      nombre,
      apellidos,
      telefono: legacyPatient.data.phone || null,
      email: legacyPatient.data.email || null,
      fecha_nacimiento: legacyPatient.data.fecha_nacimiento || null,
      observaciones: 'auto_migrated_from_legacy_patient',
      activo: true,
    })
    .select('id')
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data?.id || null;
}

async function resolveCrmProfessionalId(rawProfessionalId) {
  if (!rawProfessionalId) return null;

  const crmProfile = await supabase
    .from('crm_perfiles')
    .select('id')
    .eq('id', rawProfessionalId)
    .maybeSingle();

  if (crmProfile.error) throw crmProfile.error;
  if (crmProfile.data?.id) return crmProfile.data.id;

  const legacyProfessional = await supabase
    .from('profesionales')
    .select('id, id_usuario_auth, email, nombre_completo')
    .eq('id', rawProfessionalId)
    .maybeSingle();

  if (legacyProfessional.error) throw legacyProfessional.error;
  if (!legacyProfessional.data) return null;

  if (legacyProfessional.data.id_usuario_auth) {
    const byAuth = await supabase
      .from('crm_perfiles')
      .select('id')
      .eq('auth_user_id', legacyProfessional.data.id_usuario_auth)
      .maybeSingle();

    if (byAuth.error) throw byAuth.error;
    if (byAuth.data?.id) return byAuth.data.id;
  }

  if (legacyProfessional.data.email) {
    const byEmail = await supabase
      .from('crm_perfiles')
      .select('id')
      .eq('email', legacyProfessional.data.email)
      .maybeSingle();

    if (byEmail.error) throw byEmail.error;
    if (byEmail.data?.id) return byEmail.data.id;
  }

  if (!legacyProfessional.data.id_usuario_auth) return null;

  const inserted = await supabase
    .from('crm_perfiles')
    .insert({
      auth_user_id: legacyProfessional.data.id_usuario_auth,
      rol: 'fisioterapeuta',
      nombre_completo: legacyProfessional.data.nombre_completo || null,
      email: legacyProfessional.data.email || null,
      activo: true,
    })
    .select('id')
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data?.id || null;
}

async function resolveRecommendationIdentity(input = {}) {
  const rawPatientId = input.patient_id || input.paciente_id || null;
  const rawProfessionalId = input.fisioterapeuta_id || null;
  const patientId = rawPatientId ? await resolveCrmPatientId(rawPatientId) : null;
  const fisioterapeutaId = rawProfessionalId ? await resolveCrmProfessionalId(rawProfessionalId) : null;

  return {
    ...input,
    patient_id: patientId,
    paciente_id: patientId,
    fisioterapeuta_id: fisioterapeutaId,
    raw_patient_id: rawPatientId,
    raw_fisioterapeuta_id: rawProfessionalId,
  };
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
      lines.push(`   Pauta: ${pauta.join(' | ')}`);
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

function isTimeoutLikeError(error) {
  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return (
    name.includes('abort') ||
    name.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('abort')
  );
}

function shouldRetryAttempt({ attemptIndex, maxAttempts, timedOut, statusCode, fetchFailed }) {
  if (attemptIndex >= maxAttempts) return false;
  if (timedOut || fetchFailed) return true;
  if (typeof statusCode === 'number' && (statusCode === 429 || statusCode >= 500)) return true;
  return false;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callEngineWithRetry({
  targetUrl,
  payload,
  timeoutMs = EXERCISE_ENGINE_TIMEOUT_MS,
  maxAttempts = EXERCISE_ENGINE_MAX_ATTEMPTS,
}) {
  const attempts = [];
  const safeMaxAttempts = Math.max(1, Number(maxAttempts) || 1);
  const startedAt = Date.now();
  let lastError = null;

  for (let attemptIndex = 1; attemptIndex <= safeMaxAttempts; attemptIndex += 1) {
    const startedAttemptAt = Date.now();
    let statusCode = null;
    let timedOut = false;
    let fetchFailed = false;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });

      statusCode = response.status;
      const rawText = await response.text();
      const parsed = safeJsonParse(rawText);

      if (response.ok) {
        attempts.push({
          attempt: attemptIndex,
          ok: true,
          status_code: statusCode,
          timed_out: false,
          duration_ms: Date.now() - startedAttemptAt,
        });

        return {
          ok: true,
          data: parsed,
          attempts,
          totalDurationMs: Date.now() - startedAt,
        };
      }

      const engineMessage =
        parsed?.error ||
        parsed?.message ||
        `engine_http_${response.status}`;
      lastError = new Error(String(engineMessage));
    } catch (error) {
      timedOut = isTimeoutLikeError(error);
      fetchFailed = !timedOut;
      lastError = error instanceof Error ? error : new Error(String(error || 'engine_unreachable'));
    }

    attempts.push({
      attempt: attemptIndex,
      ok: false,
      status_code: statusCode,
      timed_out: timedOut,
      duration_ms: Date.now() - startedAttemptAt,
      error: String(lastError?.message || 'engine_error'),
    });

    const retry = shouldRetryAttempt({
      attemptIndex,
      maxAttempts: safeMaxAttempts,
      timedOut,
      statusCode,
      fetchFailed,
    });
    if (!retry) break;

    const backoffMs = 350 * attemptIndex;
    await delay(backoffMs);
  }

  return {
    ok: false,
    error: lastError || new Error('engine_unreachable'),
    attempts,
    totalDurationMs: Date.now() - startedAt,
  };
}

function hasRecommendationShape(recommendation) {
  if (!recommendation || typeof recommendation !== 'object') return false;
  if (Array.isArray(recommendation.selected_exercises)) return true;
  if (Array.isArray(recommendation.exercises)) return true;
  return false;
}

function hasExerciseImage(exercise) {
  return Boolean(getExerciseImageUrl(exercise));
}

function getExerciseImageUrl(exercise, mediaMap = null) {
  const exerciseId = String(exercise?.exercise_id || exercise?.id || '').trim();
  const metadata = exercise?.metadata || {};
  if (exerciseId && mediaMap?.[exerciseId]) return mediaMap[exerciseId];
  return exercise?.imagen_url || metadata.proet_image_url || metadata.image_url || null;
}

function getExerciseLevelPriority(exercise) {
  const level = String(exercise?.nivel || '').toLowerCase();
  if (level === 'bajo') return 2;
  if (level === 'medio') return 1;
  return 0;
}

function buildEngineCandidateCatalog(catalog = [], symptoms) {
  const safeLimit = Math.max(8, Number(EXERCISE_ENGINE_CANDIDATE_LIMIT) || 24);
  if (!Array.isArray(catalog) || catalog.length <= safeLimit) return Array.isArray(catalog) ? catalog : [];

  const symptomText = String(symptoms || '').trim();
  const inferredZone = inferZoneFromSymptoms(symptomText);
  const scored = catalog.map((item, index) => {
    const matchScore = scoreExerciseForSymptoms(item, symptomText, inferredZone);
    const imageBoost = hasExerciseImage(item) ? 1.25 : 0;
    const levelBoost = getExerciseLevelPriority(item) * 0.15;
    return {
      item,
      index,
      matchScore,
      imageBoost,
      levelBoost,
      priority: matchScore + imageBoost + levelBoost,
    };
  });

  const primary = scored
    .filter((entry) => entry.matchScore > 0)
    .sort((a, b) => b.priority - a.priority || a.index - b.index);

  const secondary = scored
    .filter((entry) => entry.matchScore <= 0)
    .sort((a, b) => b.imageBoost - a.imageBoost || b.levelBoost - a.levelBoost || a.index - b.index);

  const selected = [];
  const seen = new Set();
  for (const pool of [primary, secondary]) {
    for (const entry of pool) {
      const exerciseId = String(entry?.item?.id || entry?.item?.exercise_id || '').trim();
      if (!exerciseId || seen.has(exerciseId)) continue;
      seen.add(exerciseId);
      selected.push(entry.item);
      if (selected.length >= safeLimit) return selected;
    }
  }

  return selected;
}

function improveSelectionImageCoverage({ selectedExercises = [], catalog = [], symptoms }) {
  if (!Array.isArray(selectedExercises) || selectedExercises.length < 2) return Array.isArray(selectedExercises) ? selectedExercises : [];
  if (!Array.isArray(catalog) || !catalog.length) return selectedExercises;

  const symptomText = String(symptoms || '').trim();
  const inferredZone = inferZoneFromSymptoms(symptomText);
  const catalogById = new Map(catalog.map((item) => [String(item.id), item]));
  const targetWithImage = Math.min(
    selectedExercises.length,
    Math.max(1, Math.ceil(selectedExercises.length * EXERCISE_IMAGE_MIN_RATIO))
  );

  const countWithImage = (items) =>
    items.filter((item) => {
      const itemId = String(item?.exercise_id || item?.id || '').trim();
      return Boolean(getExerciseImageUrl(item) || getExerciseImageUrl(catalogById.get(itemId)));
    }).length;

  let withImageCount = countWithImage(selectedExercises);
  if (withImageCount >= targetWithImage) return selectedExercises;

  const replacementPool = catalog
    .map((item, index) => {
      const zone = String(item?.zona_corporal || '').toLowerCase();
      const score = scoreExerciseForSymptoms(item, symptomText, inferredZone);
      const zoneBoost = inferredZone && zone.includes(inferredZone.toLowerCase()) ? 2 : 0;
      return {
        item,
        index,
        score,
        priority: score + zoneBoost + getExerciseLevelPriority(item) * 0.15,
      };
    })
    .filter((entry) => hasExerciseImage(entry.item) && entry.score > 0)
    .sort((a, b) => b.priority - a.priority || a.index - b.index);

  const usedIds = new Set(
    selectedExercises
      .map((item) => String(item?.exercise_id || item?.id || '').trim())
      .filter(Boolean)
  );
  const nextSelection = [...selectedExercises];

  for (let idx = 0; idx < nextSelection.length; idx += 1) {
    if (withImageCount >= targetWithImage) break;

    const current = nextSelection[idx];
    const currentId = String(current?.exercise_id || current?.id || '').trim();
    const currentCatalogEntry = catalogById.get(currentId) || current;
    if (getExerciseImageUrl(current) || getExerciseImageUrl(currentCatalogEntry)) continue;

    const currentZone = String(
      currentCatalogEntry?.zona_corporal || current?.zona_corporal || ''
    ).toLowerCase();
    const currentScore = scoreExerciseForSymptoms(currentCatalogEntry, symptomText, inferredZone);

    const replacementIndex = replacementPool.findIndex((entry) => {
      const replacementId = String(entry?.item?.id || '').trim();
      if (!replacementId || usedIds.has(replacementId)) return false;

      const replacementZone = String(entry?.item?.zona_corporal || '').toLowerCase();
      const zoneMatchesInferred = inferredZone && (currentZone.includes(inferredZone) || replacementZone.includes(inferredZone));
      const sameZone = !currentZone || !replacementZone || replacementZone === currentZone || currentZone.includes(replacementZone) || replacementZone.includes(currentZone) || zoneMatchesInferred;
      const closeEnoughScore = entry.score >= Math.max(1, currentScore - 2);
      return sameZone && closeEnoughScore;
    });

    if (replacementIndex === -1) continue;

    const [replacementEntry] = replacementPool.splice(replacementIndex, 1);
    const replacement = replacementEntry.item;
    const replacementId = String(replacement?.id || '').trim();
    if (!replacementId) continue;

    if (currentId) usedIds.delete(currentId);
    usedIds.add(replacementId);

    nextSelection[idx] = {
      ...replacement,
      exercise_id: replacement.id,
      confidence: Math.max(
        Number(current?.confidence || 0),
        Math.min(0.92, Math.max(0.6, replacementEntry.score / 10))
      ),
      why: current?.why
        ? `${current.why}. Ajustado para incluir apoyo visual.`
        : 'Seleccion adaptada para incluir apoyo visual sin perder relevancia clinica.',
      cautions:
        Array.isArray(current?.cautions) && current.cautions.length
          ? current.cautions
          : replacement.contraindicaciones
            ? [String(replacement.contraindicaciones)]
            : [],
      series: current?.series ?? replacement.metadata?.series_defecto ?? 3,
      repeticiones: current?.repeticiones ?? replacement.metadata?.repeticiones_defecto ?? 10,
      duracion_segundos:
        current?.duracion_segundos ?? replacement.metadata?.duracion_segundos_defecto ?? null,
      procedimiento: current?.procedimiento || replacement.descripcion || '',
      imagen_url: getExerciseImageUrl(replacement),
      orden: current?.orden || idx + 1,
    };
    withImageCount += 1;
  }

  return nextSelection;
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
        imagen_url: ex.metadata?.proet_image_url || ex.metadata?.image_url || null,
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


function normalizeAsyncRecommendationInput(body = {}) {
  const symptoms = String(body?.symptoms || '').trim();
  const patientId = body?.patient_id || body?.paciente_id || null;
  const channel = String(body?.channel || 'crm_web').trim() || 'crm_web';
  const fisioterapeutaId = body?.fisioterapeuta_id || null;

  if (!symptoms) {
    throw createRecommendationHttpError(400, 'Se requiere symptoms');
  }

  if (!patientId && EXERCISE_REQUIRE_PATIENT_ASSOCIATION) {
    throw createRecommendationHttpError(
      400,
      'Selecciona un paciente antes de generar el informe de ejercicios.',
      'patient_required'
    );
  }

  return {
    patient_id: patientId,
    symptoms,
    channel,
    fisioterapeuta_id: fisioterapeutaId,
  };
}

function createRecommendationHttpError(status, message, code = null) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

function sendRecommendationError(res, err, requestId = null) {
  const status = Number(err?.status || 500);
  const payload = {
    ok: false,
    error: err?.message || 'Error generando recomendacion',
  };

  if (err?.code) payload.code = err.code;
  if (requestId) payload.request_id = requestId;

  res.status(status).json(payload);
}

function getInternalExerciseRecommendUrl() {
  const base = String(process.env.INTERNAL_API_BASE_URL || ('http://127.0.0.1:' + (process.env.PORT || 3001)))
    .trim()
    .replace(/\/+$/, '');
  return base + '/api/exercises/recommend';
}

function pruneExerciseRecommendationJobs() {
  const now = Date.now();
  if (now - lastExerciseJobCleanupAt < EXERCISE_ASYNC_JOB_CLEANUP_MS) return;

  for (const [jobId, job] of exerciseRecommendationJobs.entries()) {
    const referenceDate = job?.finished_at || job?.updated_at || job?.created_at;
    const ageMs = referenceDate ? now - new Date(referenceDate).getTime() : 0;
    if (ageMs >= EXERCISE_ASYNC_JOB_TTL_MS) {
      exerciseRecommendationJobs.delete(jobId);
    }
  }

  lastExerciseJobCleanupAt = now;
}

function isAsyncJobTableMissingError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return (
    msg.includes("public.crm_async_jobs") ||
    (msg.includes('crm_async_jobs') && msg.includes('does not exist')) ||
    (msg.includes('crm_async_jobs') && msg.includes('could not find the table'))
  );
}

function mapStoredAsyncJob(row) {
  if (!row) return null;
  const requestPayload = row.request_payload && typeof row.request_payload === 'object'
    ? row.request_payload
    : {};

  return {
    job_id: row.id,
    tracking_request_id: row.tracking_request_id || null,
    request_id: row.final_request_id || null,
    patient_id: row.paciente_id || null,
    symptoms: requestPayload.symptoms || '',
    channel: row.channel || 'crm_web',
    fisioterapeuta_id: row.fisioterapeuta_id || null,
    status: row.status || 'queued',
    progress_message: row.progress_message || 'En curso',
    created_at: row.created_at || null,
    updated_at: row.updated_at || row.created_at || null,
    started_at: row.started_at || null,
    finished_at: row.finished_at || null,
    result: row.result_payload || null,
    error: row.error_message || null,
    code: row.error_code || null,
  };
}

function toStoredAsyncJob(job) {
  return {
    id: job.job_id,
    job_type: 'exercise_recommendation',
    tracking_request_id: job.tracking_request_id,
    final_request_id: job.request_id || null,
    paciente_id: job.patient_id || null,
    fisioterapeuta_id: job.fisioterapeuta_id || null,
    channel: job.channel || 'crm_web',
    status: job.status,
    progress_message: job.progress_message || null,
    request_payload: {
      patient_id: job.patient_id || null,
      symptoms: job.symptoms || '',
      channel: job.channel || 'crm_web',
      fisioterapeuta_id: job.fisioterapeuta_id || null,
    },
    result_payload: job.result || null,
    error_message: job.error || null,
    error_code: job.code || null,
    started_at: job.started_at || null,
    finished_at: job.finished_at || null,
  };
}

async function persistExerciseRecommendationJob(job) {
  if (exerciseAsyncJobPersistenceEnabled === false) return null;

  try {
    const { data, error } = await supabase
      .from(EXERCISE_ASYNC_JOB_TABLE)
      .upsert(toStoredAsyncJob(job), { onConflict: 'id' })
      .select('id, job_type, tracking_request_id, final_request_id, paciente_id, fisioterapeuta_id, channel, status, progress_message, request_payload, result_payload, error_message, error_code, started_at, finished_at, created_at, updated_at')
      .single();

    if (error) throw error;
    exerciseAsyncJobPersistenceEnabled = true;

    const mapped = mapStoredAsyncJob(data);
    if (mapped) exerciseRecommendationJobs.set(mapped.job_id, mapped);
    return mapped;
  } catch (error) {
    if (isAsyncJobTableMissingError(error)) {
      exerciseAsyncJobPersistenceEnabled = false;
      return null;
    }
    console.warn('[exercises/recommend/async] persist warning:', error?.message || error);
    return null;
  }
}

async function fetchPersistedExerciseRecommendationJob(jobId) {
  if (exerciseAsyncJobPersistenceEnabled === false) return null;

  try {
    const { data, error } = await supabase
      .from(EXERCISE_ASYNC_JOB_TABLE)
      .select('id, job_type, tracking_request_id, final_request_id, paciente_id, fisioterapeuta_id, channel, status, progress_message, request_payload, result_payload, error_message, error_code, started_at, finished_at, created_at, updated_at')
      .eq('id', String(jobId || '').trim())
      .maybeSingle();

    if (error) throw error;
    exerciseAsyncJobPersistenceEnabled = true;

    const mapped = mapStoredAsyncJob(data);
    if (mapped) exerciseRecommendationJobs.set(mapped.job_id, mapped);
    return mapped;
  } catch (error) {
    if (isAsyncJobTableMissingError(error)) {
      exerciseAsyncJobPersistenceEnabled = false;
      return null;
    }
    console.warn('[exercises/recommend/async] fetch warning:', error?.message || error);
    return null;
  }
}

async function getExerciseRecommendationJob(jobId) {
  pruneExerciseRecommendationJobs();
  const normalizedId = String(jobId || '').trim();
  if (!normalizedId) return null;

  const inMemory = exerciseRecommendationJobs.get(normalizedId) || null;
  if (inMemory) return inMemory;

  return await fetchPersistedExerciseRecommendationJob(normalizedId);
}

async function updateExerciseRecommendationJob(jobId, patch = {}) {
  const current = await getExerciseRecommendationJob(jobId);
  if (!current) return null;

  const next = {
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  exerciseRecommendationJobs.set(next.job_id, next);
  const persisted = await persistExerciseRecommendationJob(next);
  return persisted || next;
}

async function logExerciseAsyncJobEvent(job, asyncStatus, messageText, extraPayload = {}) {
  if (!job?.patient_id) return;

  await logComm(supabase, {
    paciente_id: job.patient_id,
    fisioterapeuta_id: job.fisioterapeuta_id || null,
    channel: resolveCommChannel(job.channel),
    direction: 'internal',
    message_type: 'event',
    message_text: messageText,
    payload: {
      event: 'exercise_async_job',
      async_job_id: job.job_id,
      async_status: asyncStatus,
      tracking_request_id: job.tracking_request_id,
      ...extraPayload,
    },
    request_id: job.request_id || job.tracking_request_id || null,
    status: asyncStatus === 'error' ? 'error' : 'processed',
  });
}

async function createExerciseRecommendationJob(input) {
  pruneExerciseRecommendationJobs();
  const now = new Date().toISOString();
  const job = {
    job_id: crypto.randomUUID(),
    tracking_request_id: crypto.randomUUID(),
    request_id: null,
    patient_id: input.patient_id || null,
    symptoms: input.symptoms,
    channel: input.channel || 'crm_web',
    fisioterapeuta_id: input.fisioterapeuta_id || null,
    status: 'queued',
    progress_message: 'Solicitud recibida. En cola.',
    created_at: now,
    updated_at: now,
    started_at: null,
    finished_at: null,
    result: null,
    error: null,
    code: null,
  };

  exerciseRecommendationJobs.set(job.job_id, job);
  const persisted = await persistExerciseRecommendationJob(job);
  const effectiveJob = persisted || job;
  await logExerciseAsyncJobEvent(effectiveJob, 'queued', 'Trabajo asincrono de ejercicios en cola');
  return effectiveJob;
}
function serializeExerciseRecommendationJob(job) {
  const payload = {
    job_id: job.job_id,
    tracking_request_id: job.tracking_request_id,
    request_id: job.request_id || null,
    status: job.status,
    progress_message: job.progress_message,
    created_at: job.created_at,
    updated_at: job.updated_at,
    finished_at: job.finished_at || null,
  };

  if (job.status === 'done' && job.result) {
    payload.result = job.result;
  }

  if (job.status === 'error') {
    payload.error = job.error || 'Error generando recomendacion';
    payload.code = job.code || null;
  }

  return payload;
}

async function runExerciseRecommendationJob(jobId) {
  let job = await updateExerciseRecommendationJob(jobId, {
    status: 'running',
    progress_message: 'Analizando el caso clinico y generando el informe...',
    started_at: new Date().toISOString(),
    error: null,
    code: null,
  });

  if (!job) return;
  await logExerciseAsyncJobEvent(job, 'running', 'Trabajo asincrono de ejercicios en ejecucion');

  try {
    const timeoutMs = Math.max(
      90000,
      EXERCISE_ENGINE_TIMEOUT_MS * Math.max(1, EXERCISE_ENGINE_MAX_ATTEMPTS) + 15000
    );
    const response = await fetch(getInternalExerciseRecommendUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: job.patient_id,
        symptoms: job.symptoms,
        channel: job.channel,
        fisioterapeuta_id: job.fisioterapeuta_id,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const rawText = await response.text();
    let parsed = {};
    if (rawText.trim()) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = { raw: rawText };
      }
    }

    if (!response.ok || !parsed?.ok) {
      const errorMessage = parsed?.error || ('HTTP ' + response.status);
      job = await updateExerciseRecommendationJob(jobId, {
        status: 'error',
        progress_message: 'No se pudo generar el informe.',
        request_id: parsed?.request_id || job.request_id || null,
        error: errorMessage,
        code: parsed?.code || null,
        finished_at: new Date().toISOString(),
      });
      if (job) {
        await logExerciseAsyncJobEvent(job, 'error', 'Trabajo asincrono de ejercicios con error', {
          error: errorMessage,
          code: parsed?.code || null,
        });
      }
      return;
    }

    job = await updateExerciseRecommendationJob(jobId, {
      status: 'done',
      progress_message: 'Informe generado. Listo para revisar.',
      request_id: parsed?.request_id || job.request_id || null,
      result: parsed,
      finished_at: new Date().toISOString(),
      error: null,
      code: null,
    });
    if (job) {
      await logExerciseAsyncJobEvent(job, 'done', 'Trabajo asincrono de ejercicios completado', {
        recommendation_id: parsed?.recommendation_id || null,
      });
    }
  } catch (error) {
    const errorMessage = error?.name === 'AbortError'
      ? 'exercise_async_timeout'
      : error?.message || 'exercise_async_failed';

    job = await updateExerciseRecommendationJob(jobId, {
      status: 'error',
      progress_message: 'No se pudo generar el informe.',
      error: errorMessage,
      code: error?.name === 'AbortError' ? 'async_timeout' : null,
      finished_at: new Date().toISOString(),
    });
    if (job) {
      await logExerciseAsyncJobEvent(job, 'error', 'Trabajo asincrono de ejercicios interrumpido', {
        error: errorMessage,
        code: job.code || null,
      });
    }
  }
}

function startExerciseRecommendationJob(jobId) {
  Promise.resolve()
    .then(() => runExerciseRecommendationJob(jobId))
    .catch((error) => {
      console.error('[exercises/recommend/async] job runner error:', error?.message || error);
    });
}

export default router;


