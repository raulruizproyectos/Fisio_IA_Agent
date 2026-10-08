import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { isMoney, isDate, respondFinanceError } from '../lib/finance.js';

const router = Router();
const BONOS_TABLE = 'crm_bonos';

const BONO_SELECT = 'id, paciente_id, nombre, sesiones_total, sesiones_usadas, precio, estado, fecha_inicio, fecha_caducidad, notas, created_at, updated_at, crm_pacientes(nombre, apellidos)';

function validateBono(fields) {
  if (fields.sesiones_total !== undefined && (!['string','number'].includes(typeof fields.sesiones_total)
    || !/^\d+$/.test(String(fields.sesiones_total)) || Number(fields.sesiones_total)<1 || Number(fields.sesiones_total)>32767)) return 'El número de sesiones debe ser un entero positivo';
  if (fields.precio !== undefined && !isMoney(fields.precio, true)) return 'El precio debe ser válido y tener como máximo dos decimales';
  if (fields.estado !== undefined && !['activo','agotado','caducado','anulado'].includes(fields.estado)) return 'Estado de bono inválido';
  if (fields.fecha_inicio !== undefined && !isDate(fields.fecha_inicio)) return 'Fecha de inicio inválida';
  if (fields.fecha_caducidad != null && !isDate(fields.fecha_caducidad)) return 'Fecha de caducidad inválida';
  if (fields.fecha_caducidad && fields.fecha_inicio && fields.fecha_caducidad<fields.fecha_inicio) return 'La caducidad no puede ser anterior al inicio';
  return null;
}

const isMissingBonosTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  return code === 'PGRST205' || (message.includes(BONOS_TABLE) && (message.includes('schema cache') || message.includes('could not find the table')));
};

const bonosUnavailableMessage = 'Modulo bonos no disponible: falta tabla crm_bonos. Ejecuta database/migrations/011_crm_bonos.sql en Supabase.';

const respondBonosUnavailable = (res, { write = false } = {}) => {
  if (write) {
    return res.status(503).json({
      error: bonosUnavailableMessage,
      missing_table: BONOS_TABLE,
    });
  }

  return res.json({
    data: [],
    unavailable: true,
    error: bonosUnavailableMessage,
    missing_table: BONOS_TABLE,
  });
};

// GET /api/bonos?paciente_id=X&estado=activo
router.get('/', async (req, res, next) => {
  try {
    const { paciente_id, estado } = req.query;
    let query = supabase.from(BONOS_TABLE).select(BONO_SELECT).order('created_at', { ascending: false }).limit(200);
    if (paciente_id) query = query.eq('paciente_id', paciente_id);
    if (estado) query = query.eq('estado', estado);
    const { data, error } = await query;
    if (error) {
      if (isMissingBonosTableError(error)) return respondBonosUnavailable(res);
      throw error;
    }
    res.json({ data: data || [] });
  } catch (err) { next(err); }
});

// POST /api/bonos - create bono
router.post('/', async (req, res, next) => {
  try {
    const { paciente_id, nombre, sesiones_total, precio, fecha_inicio, fecha_caducidad, notas } = req.body;
    if (!paciente_id || !sesiones_total || precio == null) {
      return res.status(400).json({ error: 'paciente_id, sesiones_total y precio son requeridos' });
    }
    const startDate = fecha_inicio === undefined ? new Date().toISOString().slice(0, 10) : fecha_inicio;
    const validationError = validateBono({ ...req.body, fecha_inicio: startDate });
    if (validationError) return res.status(400).json({ error: validationError });
    const { data, error } = await supabase
      .from(BONOS_TABLE)
      .insert({
        paciente_id,
        nombre: nombre || 'Bono de sesiones',
        sesiones_total: Number(sesiones_total),
        precio: Number(precio),
        fecha_inicio: startDate,
        fecha_caducidad: fecha_caducidad || null,
        notas: notas || null,
      })
      .select(BONO_SELECT)
      .single();
    if (error) {
      if (isMissingBonosTableError(error)) return respondBonosUnavailable(res, { write: true });
      return respondFinanceError(res, error);
    }
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

// GET /api/bonos/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(BONOS_TABLE).select(BONO_SELECT).eq('id', req.params.id).single();
    if (error && isMissingBonosTableError(error)) return respondBonosUnavailable(res);
    if (error || !data) return res.status(404).json({ error: 'Bono no encontrado' });
    res.json({ data });
  } catch (err) { next(err); }
});

// POST /api/bonos/:id/usar - use one session from bono
router.post('/:id/usar', async (req, res, next) => {
  try {
    const { data, error } = await supabase.rpc('consume_clinic_bono', { target_id: req.params.id });

    if (error) {
      if (isMissingBonosTableError(error)) return respondBonosUnavailable(res, { write: true });
      return respondFinanceError(res, error);
    }
    res.json({ data });
  } catch (err) { next(err); }
});

// PATCH /api/bonos/:id - update bono
router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['nombre', 'sesiones_total', 'precio', 'estado', 'fecha_inicio', 'fecha_caducidad', 'notas'];
    const fields = {};
    for (const k of allowed) if (req.body[k] !== undefined) fields[k] = req.body[k];
    if (!Object.keys(fields).length) return res.status(400).json({ error: 'No hay cambios para aplicar' });
    const validationError = validateBono(fields);
    if (validationError) return res.status(400).json({ error: validationError });
    if (fields.sesiones_total !== undefined) fields.sesiones_total = Number(fields.sesiones_total);
    if (fields.precio !== undefined) fields.precio = Number(fields.precio);
    fields.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from(BONOS_TABLE).update(fields).eq('id', req.params.id).select(BONO_SELECT).maybeSingle();
    if (error) {
      if (isMissingBonosTableError(error)) return respondBonosUnavailable(res, { write: true });
      return respondFinanceError(res, error);
    }
    if (!data) return res.status(404).json({ error: 'Bono no encontrado' });
    res.json({ data });
  } catch (err) { next(err); }
});

// DELETE /api/bonos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from(BONOS_TABLE).delete().eq('id', req.params.id);
    if (error) {
      if (isMissingBonosTableError(error)) return respondBonosUnavailable(res, { write: true });
      throw error;
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
