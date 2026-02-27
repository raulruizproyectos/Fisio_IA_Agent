import { Router } from 'express';
import { supabase } from '../index.js';

const router = Router();

function pickValue(obj, ...keys) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }
  return null;
}

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = {
      nombre_completo: pickValue(req.body, 'nombre_completo', 'full_name'),
      fecha_nacimiento: pickValue(req.body, 'fecha_nacimiento', 'birth_date'),
      email: pickValue(req.body, 'email'),
      phone: pickValue(req.body, 'phone'),
      notas_medicas: pickValue(req.body, 'notas_medicas', 'medical_notes') || {},
      profesional_id: pickValue(req.body, 'profesional_id', 'professional_id'),
    };

    const { data, error } = await supabase
      .from('pacientes')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = {
      nombre_completo: pickValue(req.body, 'nombre_completo', 'full_name'),
      fecha_nacimiento: pickValue(req.body, 'fecha_nacimiento', 'birth_date'),
      email: pickValue(req.body, 'email'),
      phone: pickValue(req.body, 'phone'),
      notas_medicas: pickValue(req.body, 'notas_medicas', 'medical_notes'),
    };

    const { data, error } = await supabase
      .from('pacientes')
      .update(payload)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('pacientes')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
