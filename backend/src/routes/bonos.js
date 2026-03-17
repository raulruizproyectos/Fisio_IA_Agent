import { Router } from 'express';
import { supabase } from '../index.js';

const router = Router();

const BONO_SELECT = 'id, paciente_id, nombre, sesiones_total, sesiones_usadas, precio, estado, fecha_inicio, fecha_caducidad, notas, created_at, updated_at, crm_pacientes(nombre, apellidos)';

// GET /api/bonos?paciente_id=X&estado=activo
router.get('/', async (req, res, next) => {
  try {
    const { paciente_id, estado } = req.query;
    let query = supabase.from('crm_bonos').select(BONO_SELECT).order('created_at', { ascending: false }).limit(200);
    if (paciente_id) query = query.eq('paciente_id', paciente_id);
    if (estado) query = query.eq('estado', estado);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) { next(err); }
});

// POST /api/bonos — create bono
router.post('/', async (req, res, next) => {
  try {
    const { paciente_id, nombre, sesiones_total, precio, fecha_inicio, fecha_caducidad, notas } = req.body;
    if (!paciente_id || !sesiones_total || precio == null) {
      return res.status(400).json({ error: 'paciente_id, sesiones_total y precio son requeridos' });
    }
    const { data, error } = await supabase
      .from('crm_bonos')
      .insert({
        paciente_id,
        nombre: nombre || 'Bono de sesiones',
        sesiones_total: Number(sesiones_total),
        precio: Number(precio),
        fecha_inicio: fecha_inicio || new Date().toISOString().slice(0, 10),
        fecha_caducidad: fecha_caducidad || null,
        notas: notas || null,
      })
      .select(BONO_SELECT)
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

// POST /api/bonos/:id/usar — use one session from bono
router.post('/:id/usar', async (req, res, next) => {
  try {
    // Get current bono
    const { data: bono, error: fetchErr } = await supabase
      .from('crm_bonos')
      .select('id, sesiones_total, sesiones_usadas, estado')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !bono) return res.status(404).json({ error: 'Bono no encontrado' });
    if (bono.estado !== 'activo') return res.status(400).json({ error: 'Bono no activo' });
    if (bono.sesiones_usadas >= bono.sesiones_total) return res.status(400).json({ error: 'Bono agotado' });

    const newUsadas = bono.sesiones_usadas + 1;
    const newEstado = newUsadas >= bono.sesiones_total ? 'agotado' : 'activo';

    const { data, error } = await supabase
      .from('crm_bonos')
      .update({ sesiones_usadas: newUsadas, estado: newEstado, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select(BONO_SELECT)
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
});

// PATCH /api/bonos/:id — update bono
router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['nombre', 'sesiones_total', 'precio', 'estado', 'fecha_caducidad', 'notas'];
    const fields: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) fields[k] = req.body[k];
    fields.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('crm_bonos').update(fields).eq('id', req.params.id).select(BONO_SELECT).single();
    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
});

// DELETE /api/bonos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('crm_bonos').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
