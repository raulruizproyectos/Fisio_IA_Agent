import { Router } from 'express';
import { supabase } from '../index.js';

const router = Router();

const NOTE_SELECT = 'id, paciente_id, fecha, zona_corporal, dolor_eva, nota, pruebas_realizadas, created_at, updated_at';

// List notes for a patient
router.get('/', async (req, res, next) => {
  try {
    const { paciente_id } = req.query;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });

    const { data, error } = await supabase
      .from('crm_notas_clinicas')
      .select(NOTE_SELECT)
      .eq('paciente_id', paciente_id)
      .order('fecha', { ascending: false })
      .limit(200);

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    next(err);
  }
});

// Create note
router.post('/', async (req, res, next) => {
  try {
    const { paciente_id, fecha, zona_corporal, dolor_eva, nota, pruebas_realizadas } = req.body;
    if (!paciente_id || !nota) return res.status(400).json({ error: 'paciente_id y nota son requeridos' });

    const { data, error } = await supabase
      .from('crm_notas_clinicas')
      .insert({
        paciente_id,
        fecha: fecha || new Date().toISOString().slice(0, 10),
        zona_corporal: zona_corporal || null,
        dolor_eva: dolor_eva != null ? Number(dolor_eva) : null,
        nota,
        pruebas_realizadas: pruebas_realizadas || null,
      })
      .select(NOTE_SELECT)
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

// Update note
router.patch('/:id', async (req, res, next) => {
  try {
    const fields = {};
    const allowed = ['fecha', 'zona_corporal', 'dolor_eva', 'nota', 'pruebas_realizadas'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }
    fields.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('crm_notas_clinicas')
      .update(fields)
      .eq('id', req.params.id)
      .select(NOTE_SELECT)
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// Delete note
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('crm_notas_clinicas').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
