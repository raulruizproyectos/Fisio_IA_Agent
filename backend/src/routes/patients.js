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
    // Fetch from both legacy and CRM patient tables in parallel
    const [legacyResult, crmResult] = await Promise.allSettled([
      supabase.from('pacientes').select('*').order('creado_en', { ascending: false }),
      supabase.from('crm_pacientes').select('id, nombre, apellidos, email, telefono, fecha_nacimiento, activo, created_at').eq('activo', true).order('created_at', { ascending: false }),
    ]);

    const legacyRows = legacyResult.status === 'fulfilled' && !legacyResult.value.error
      ? (legacyResult.value.data || [])
      : [];

    const crmRows = crmResult.status === 'fulfilled' && !crmResult.value.error
      ? (crmResult.value.data || [])
      : [];

    // Normalize CRM rows to match legacy shape
    const crmNormalized = crmRows.map((p) => ({
      id: p.id,
      nombre_completo: [p.nombre, p.apellidos].filter(Boolean).join(' ').trim() || `Paciente ${p.id}`,
      email: p.email || null,
      phone: p.telefono || null,
      fecha_nacimiento: p.fecha_nacimiento || null,
      notas_medicas: {},
      creado_en: p.created_at || null,
      _source: 'crm',
    }));

    // Merge: prefer CRM records; dedup by email (CRM wins over legacy)
    const seenEmails = new Set();
    const seenIds = new Set();
    const merged = [];

    for (const row of crmNormalized) {
      seenIds.add(String(row.id));
      if (row.email) seenEmails.add(String(row.email).toLowerCase());
      merged.push(row);
    }

    for (const row of legacyRows) {
      if (seenIds.has(String(row.id))) continue;
      if (row.email && seenEmails.has(String(row.email).toLowerCase())) continue;
      merged.push({ ...row, _source: 'legacy' });
    }

    merged.sort((a, b) => {
      const dateA = a.creado_en ? new Date(a.creado_en).getTime() : 0;
      const dateB = b.creado_en ? new Date(b.creado_en).getTime() : 0;
      return dateB - dateA;
    });

    res.json({ data: merged });
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
