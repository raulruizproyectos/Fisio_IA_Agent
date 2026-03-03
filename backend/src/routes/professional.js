import { Router } from 'express';
import { supabase } from '../index.js';

const router = Router();

function pickValue(obj, ...keys) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== '') {
      return obj[key];
    }
  }
  return null;
}

function isMissingTableError(error, tableName) {
  const msg = String(error?.message || '');
  return msg.includes(`Could not find the table 'public.${tableName}'`);
}

router.get('/intakes/pending', async (req, res, next) => {
  try {
    const professionalId = pickValue(req.query, 'profesional_id', 'professional_id');
    if (!professionalId) {
      return res.status(400).json({ error: 'profesional_id es obligatorio (o professional_id)' });
    }

    const { data, error } = await supabase
      .from('mensajes_ingesta_paciente')
      .select('id, paciente_id, profesional_id, texto_mensaje, tiene_alertas_rojas, alertas_rojas, estado, creado_en')
      .eq('profesional_id', professionalId)
      .eq('estado', 'pendiente_revision')
      .order('creado_en', { ascending: true });

    if (error) {
      if (isMissingTableError(error, 'mensajes_ingesta_paciente')) {
        return res.status(400).json({
          error: 'Falta tabla mensajes_ingesta_paciente. Ejecuta la migracion SQL de seguimiento.',
        });
      }
      throw error;
    }

    res.json({ data: data || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/video-jobs', async (req, res, next) => {
  try {
    const professionalId = pickValue(req.query, 'profesional_id', 'professional_id');
    if (!professionalId) {
      return res.status(400).json({ error: 'profesional_id es obligatorio (o professional_id)' });
    }

    const statusFilter = pickValue(req.query, 'estado', 'status');
    const patientIdFilter = pickValue(req.query, 'paciente_id', 'patient_id');
    const limitRaw = Number.parseInt(String(req.query?.limit || '30'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30;

    let query = supabase
      .from('trabajos_video_ejercicio')
      .select(`
        id,
        paciente_id,
        profesional_id,
        ejercicio_id,
        trabajo_padre_id,
        numero_revision,
        estado,
        prescripcion,
        prompt_generacion,
        notas_revision,
        url_salida,
        creado_en,
        actualizado_en,
        pacientes!trabajos_video_ejercicio_paciente_id_fkey(nombre_completo),
        ejercicios!trabajos_video_ejercicio_ejercicio_id_fkey(nombre)
      `)
      .eq('profesional_id', professionalId)
      .order('creado_en', { ascending: false })
      .limit(limit);

    if (statusFilter) query = query.eq('estado', statusFilter);
    if (patientIdFilter) query = query.eq('paciente_id', patientIdFilter);

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error, 'trabajos_video_ejercicio')) {
        return res.status(400).json({
          error: 'Falta tabla trabajos_video_ejercicio. Ejecuta la migracion SQL de seguimiento.',
        });
      }
      throw error;
    }

    const normalized = (data || []).map((job) => ({
      ...job,
      nombre_paciente: job?.pacientes?.nombre_completo || null,
      nombre_ejercicio: job?.ejercicios?.nombre || null,
    }));

    res.json({ data: normalized });
  } catch (err) {
    next(err);
  }
});

router.get('/patients/:patientId/history', async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const [videosResp, notesResp] = await Promise.all([
      supabase
        .from('eventos_visualizacion_video')
        .select('id, tipo_evento, segundos_vistos, secuencia, evento_en, trabajo_video_id')
        .eq('paciente_id', patientId)
        .order('evento_en', { ascending: true }),
      supabase
        .from('notas_seguimiento_paciente')
        .select('id, texto_nota, fuente, ingesta_vinculada_id, creado_en, profesional_id')
        .eq('paciente_id', patientId)
        .order('creado_en', { ascending: true }),
    ]);

    if (videosResp.error && !isMissingTableError(videosResp.error, 'eventos_visualizacion_video')) throw videosResp.error;
    if (notesResp.error && !isMissingTableError(notesResp.error, 'notas_seguimiento_paciente')) throw notesResp.error;

    res.json({
      data: {
        videos_vistos: videosResp.data || [],
        notas_seguimiento: notesResp.data || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/notes', async (req, res, next) => {
  try {
    const patientId = pickValue(req.body, 'paciente_id', 'patient_id');
    const professionalId = pickValue(req.body, 'profesional_id', 'professional_id');
    const noteText = pickValue(req.body, 'texto_nota', 'note_text');
    const source = pickValue(req.body, 'fuente', 'source') || 'texto';
    const linkedIntakeId = pickValue(req.body, 'ingesta_vinculada_id', 'linked_intake_id');

    if (!patientId || !professionalId || !noteText) {
      return res.status(400).json({
        error: 'paciente_id/professional_id y texto_nota/note_text son obligatorios',
      });
    }

    const { data, error } = await supabase
      .from('notas_seguimiento_paciente')
      .insert({
        paciente_id: patientId,
        profesional_id: professionalId,
        texto_nota: noteText,
        fuente: source,
        ingesta_vinculada_id: linkedIntakeId,
      })
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error, 'notas_seguimiento_paciente')) {
        return res.status(400).json({
          error: 'Falta tabla notas_seguimiento_paciente. Ejecuta la migracion SQL de seguimiento.',
        });
      }
      throw error;
    }

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/video-jobs', async (req, res, next) => {
  try {
    const patientId = pickValue(req.body, 'paciente_id', 'patient_id');
    const professionalId = pickValue(req.body, 'profesional_id', 'professional_id');
    const exerciseId = pickValue(req.body, 'ejercicio_id', 'exercise_id');
    const prescription = pickValue(req.body, 'prescripcion', 'prescription');
    const generationPrompt = pickValue(req.body, 'prompt_generacion', 'generation_prompt');

    if (!patientId || !professionalId || !prescription) {
      return res.status(400).json({
        error: 'paciente_id/professional_id y prescripcion/prescription son obligatorios',
      });
    }

    const { data, error } = await supabase
      .from('trabajos_video_ejercicio')
      .insert({
        paciente_id: patientId,
        profesional_id: professionalId,
        ejercicio_id: exerciseId,
        prescripcion: prescription,
        prompt_generacion: generationPrompt,
        estado: 'pendiente_revision',
        numero_revision: 1,
      })
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error, 'trabajos_video_ejercicio')) {
        return res.status(400).json({
          error: 'Falta tabla trabajos_video_ejercicio. Ejecuta la migracion SQL de seguimiento.',
        });
      }
      throw error;
    }

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/video-jobs/:jobId/review', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const aprobado = pickValue(req.body, 'aprobado', 'approved');
    const reviewNotes = pickValue(req.body, 'notas_revision', 'review_notes') || '';
    const revisedPrompt = pickValue(req.body, 'prompt_revisado', 'revised_prompt');

    if (typeof aprobado !== 'boolean') {
      return res.status(400).json({ error: 'aprobado/approved (boolean) es obligatorio' });
    }

    const { data: currentJob, error: currentError } = await supabase
      .from('trabajos_video_ejercicio')
      .select('*')
      .eq('id', jobId)
      .single();

    if (currentError) throw currentError;
    if (!currentJob) return res.status(404).json({ error: 'Video job no encontrado' });

    if (aprobado) {
      const { data: aprobadoJob, error: aprobadoError } = await supabase
        .from('trabajos_video_ejercicio')
        .update({
          estado: 'aprobado',
          notas_revision: reviewNotes || null,
        })
        .eq('id', jobId)
        .select()
        .single();

      if (aprobadoError) throw aprobadoError;
      return res.json({ data: aprobadoJob, next: 'ready_to_send' });
    }

    const { data: rechazadoJob, error: rechazadoError } = await supabase
      .from('trabajos_video_ejercicio')
      .update({
        estado: 'rechazado',
        notas_revision: reviewNotes || null,
      })
      .eq('id', jobId)
      .select()
      .single();

    if (rechazadoError) throw rechazadoError;

    const { data: revisionJob, error: revisionError } = await supabase
      .from('trabajos_video_ejercicio')
      .insert({
        paciente_id: currentJob.paciente_id,
        profesional_id: currentJob.profesional_id,
        ejercicio_id: currentJob.ejercicio_id,
        prescripcion: currentJob.prescripcion,
        prompt_generacion: revisedPrompt || currentJob.prompt_generacion,
        trabajo_padre_id: currentJob.id,
        numero_revision: (currentJob.numero_revision || 1) + 1,
        estado: 'pendiente_revision',
      })
      .select()
      .single();

    if (revisionError) throw revisionError;

    res.json({
      data: {
        trabajo_rechazado: rechazadoJob,
        nuevo_trabajo_revision: revisionJob,
      },
      next: 'render_new_revision',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/video-jobs/:jobId/render', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const outputUrl = pickValue(req.body, 'url_salida', 'output_url');
    const provider = pickValue(req.body, 'proveedor', 'provider') || 'simulado';

    const { data: currentJob, error: currentError } = await supabase
      .from('trabajos_video_ejercicio')
      .select('*')
      .eq('id', jobId)
      .single();

    if (currentError) throw currentError;
    if (!currentJob) return res.status(404).json({ error: 'Video job no encontrado' });

    if (!['pendiente_revision', 'rechazado'].includes(currentJob.estado)) {
      return res.status(400).json({
        error: 'Solo se puede renderizar un video en estado pendiente_revision o rechazado',
      });
    }

    const { error: startError } = await supabase
      .from('trabajos_video_ejercicio')
      .update({ estado: 'renderizando' })
      .eq('id', jobId);

    if (startError) throw startError;

    const finalOutputUrl =
      outputUrl ||
      `https://cdn.fisio-ia.local/videos/${jobId}-r${currentJob.numero_revision || 1}.mp4`;

    const { data: renderedJob, error: finishError } = await supabase
      .from('trabajos_video_ejercicio')
      .update({
        estado: 'pendiente_revision',
        url_salida: finalOutputUrl,
      })
      .eq('id', jobId)
      .select()
      .single();

    if (finishError) throw finishError;

    res.json({
      data: renderedJob,
      render: {
        provider,
        status: 'completed',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/video-jobs/:jobId/send', async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const { data, error } = await supabase
      .from('trabajos_video_ejercicio')
      .update({ estado: 'enviado' })
      .eq('id', jobId)
      .eq('estado', 'aprobado')
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(400).json({ error: 'Solo se puede enviar un video en estado aprobado' });
    }

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
