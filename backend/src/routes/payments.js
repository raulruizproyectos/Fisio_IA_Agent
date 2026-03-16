import { Router } from 'express';
import { supabase } from '../index.js';

const router = Router();

const PAGOS_SELECT = 'id, paciente_id, fecha, importe, metodo_pago, concepto, notas, created_at, updated_at, crm_pacientes(nombre, apellidos)';

// GET /api/pagos — list payments with optional filters: mes, anio, paciente_id, metodo_pago
router.get('/', async (req, res, next) => {
  try {
    const { mes, anio, paciente_id, metodo_pago } = req.query;

    let query = supabase
      .from('crm_pagos')
      .select(PAGOS_SELECT)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (paciente_id) query = query.eq('paciente_id', paciente_id);
    if (metodo_pago) query = query.eq('metodo_pago', metodo_pago);

    if (anio) {
      const y = Number(anio);
      const m = mes ? Number(mes) : null;
      const startDate = m
        ? `${y}-${String(m).padStart(2, '0')}-01`
        : `${y}-01-01`;
      const endDate = m
        ? (m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`)
        : `${y + 1}-01-01`;
      query = query.gte('fecha', startDate).lt('fecha', endDate);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/pagos/resumen — monthly summary for reports
router.get('/resumen', async (req, res, next) => {
  try {
    const { anio } = req.query;
    const year = Number(anio) || new Date().getFullYear();

    const { data, error } = await supabase
      .from('crm_pagos')
      .select('fecha, importe, metodo_pago')
      .gte('fecha', `${year}-01-01`)
      .lt('fecha', `${year + 1}-01-01`)
      .order('fecha', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const meses = {};
    for (let m = 1; m <= 12; m++) {
      meses[m] = { mes: m, total: 0, efectivo: 0, tarjeta: 0, sesiones: 0 };
    }
    for (const p of data || []) {
      const m = new Date(p.fecha + 'T00:00:00').getMonth() + 1;
      const importe = Number(p.importe);
      meses[m].total += importe;
      meses[m].sesiones += 1;
      if (p.metodo_pago === 'efectivo') meses[m].efectivo += importe;
      else meses[m].tarjeta += importe;
    }

    res.json({
      anio: year,
      resumen: Object.values(meses),
      total_anual: Object.values(meses).reduce((s, m) => s + m.total, 0),
      total_sesiones: Object.values(meses).reduce((s, m) => s + m.sesiones, 0),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/pagos/gestoria — per-patient per-month breakdown for accounting
router.get('/gestoria', async (req, res, next) => {
  try {
    const { anio } = req.query;
    const year = Number(anio) || new Date().getFullYear();

    const { data, error } = await supabase
      .from('crm_pagos')
      .select('fecha, importe, metodo_pago, paciente_id, crm_pacientes(nombre, apellidos)')
      .gte('fecha', `${year}-01-01`)
      .lt('fecha', `${year + 1}-01-01`)
      .order('fecha', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // Aggregate by patient + month
    const byPatient = {};
    const totalesMes = {};
    for (let m = 1; m <= 12; m++) totalesMes[m] = { sesiones: 0, efectivo: 0, tarjeta: 0, total: 0 };

    for (const p of data || []) {
      const m = new Date(p.fecha + 'T00:00:00').getMonth() + 1;
      const importe = Number(p.importe);
      const pid = p.paciente_id;

      if (!byPatient[pid]) {
        const nom = p.crm_pacientes ? `${p.crm_pacientes.nombre || ''} ${p.crm_pacientes.apellidos || ''}`.trim() : 'Sin nombre';
        byPatient[pid] = { paciente_id: pid, nombre: nom, meses: {}, total_anual: 0, efectivo_anual: 0, tarjeta_anual: 0, sesiones_anual: 0 };
      }
      if (!byPatient[pid].meses[m]) byPatient[pid].meses[m] = { sesiones: 0, efectivo: 0, tarjeta: 0, total: 0 };

      byPatient[pid].meses[m].sesiones += 1;
      byPatient[pid].meses[m].total += importe;
      byPatient[pid].sesiones_anual += 1;
      byPatient[pid].total_anual += importe;
      totalesMes[m].sesiones += 1;
      totalesMes[m].total += importe;

      if (p.metodo_pago === 'efectivo') {
        byPatient[pid].meses[m].efectivo += importe;
        byPatient[pid].efectivo_anual += importe;
        totalesMes[m].efectivo += importe;
      } else {
        byPatient[pid].meses[m].tarjeta += importe;
        byPatient[pid].tarjeta_anual += importe;
        totalesMes[m].tarjeta += importe;
      }
    }

    const pacientes = Object.values(byPatient).sort((a, b) => b.total_anual - a.total_anual);
    const gran_total = {
      efectivo: pacientes.reduce((s, p) => s + p.efectivo_anual, 0),
      tarjeta: pacientes.reduce((s, p) => s + p.tarjeta_anual, 0),
      total: pacientes.reduce((s, p) => s + p.total_anual, 0),
      sesiones: pacientes.reduce((s, p) => s + p.sesiones_anual, 0),
    };

    res.json({ anio: year, pacientes, totales_mes: totalesMes, gran_total });
  } catch (err) {
    next(err);
  }
});

// POST /api/pagos — create payment
router.post('/', async (req, res, next) => {
  try {
    const { paciente_id, fecha, importe, metodo_pago, concepto, notas } = req.body;

    if (!paciente_id) return res.status(400).json({ error: 'paciente_id es obligatorio' });
    if (!importe || Number(importe) <= 0) return res.status(400).json({ error: 'importe debe ser mayor que 0' });
    if (!metodo_pago || !['efectivo', 'tarjeta'].includes(metodo_pago)) {
      return res.status(400).json({ error: 'metodo_pago debe ser "efectivo" o "tarjeta"' });
    }

    const { data, error } = await supabase
      .from('crm_pagos')
      .insert({
        paciente_id,
        fecha: fecha || new Date().toISOString().slice(0, 10),
        importe: Number(importe),
        metodo_pago,
        concepto: concepto || 'Sesion de fisioterapia',
        notas: notas || null,
      })
      .select(PAGOS_SELECT)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/pagos/:id — update payment
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = {};
    const allowed = ['paciente_id', 'fecha', 'importe', 'metodo_pago', 'concepto', 'notas'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.importe) updates.importe = Number(updates.importe);
    if (updates.metodo_pago && !['efectivo', 'tarjeta'].includes(updates.metodo_pago)) {
      return res.status(400).json({ error: 'metodo_pago debe ser "efectivo" o "tarjeta"' });
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('crm_pagos')
      .update(updates)
      .eq('id', id)
      .select(PAGOS_SELECT)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Pago no encontrado' });

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/pagos/:id — delete payment
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('crm_pagos').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
