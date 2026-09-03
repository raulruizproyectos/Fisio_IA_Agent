import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import PDFDocument from 'pdfkit';

const router = Router();
const INVOICES_TABLE = 'crm_facturas';

const isMissingInvoicesTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  return code === 'PGRST205' || (message.includes(INVOICES_TABLE) && (message.includes('schema cache') || message.includes('could not find the table')));
};

const invoicesUnavailableMessage = 'Modulo facturacion no disponible: falta tabla crm_facturas. Ejecuta database/migrations/009_crm_facturas.sql en Supabase.';

const respondInvoicesUnavailable = (res, { write = false } = {}) => {
  if (write) {
    return res.status(503).json({
      error: invoicesUnavailableMessage,
      missing_table: INVOICES_TABLE,
    });
  }

  return res.json({
    data: [],
    unavailable: true,
    error: invoicesUnavailableMessage,
    missing_table: INVOICES_TABLE,
  });
};

// Clinic details (hardcoded - could move to config table later)
const CLINIC = {
  nombre: 'Clinica de Fisioterapia',
  nif: '',
  direccion: '',
  telefono: '',
  email: '',
};

// Generate next invoice number: FACT-YYYY-NNNN
async function nextInvoiceNumber(year) {
  const { data, error } = await supabase
    .from(INVOICES_TABLE)
    .select('numero')
    .like('numero', `FACT-${year}-%`)
    .order('numero', { ascending: false })
    .limit(1);

  if (error) throw error;

  if (data?.length) {
    const last = parseInt(data[0].numero.split('-')[2], 10) || 0;
    return `FACT-${year}-${String(last + 1).padStart(4, '0')}`;
  }
  return `FACT-${year}-0001`;
}

// GET /api/facturas - list invoices with filters
router.get('/', async (req, res, next) => {
  try {
    const { anio, mes, paciente_id } = req.query;
    let query = supabase
      .from(INVOICES_TABLE)
      .select('id, numero, paciente_id, fecha, importe_total, iva_pct, importe_iva, importe_bruto, estado, created_at, crm_pacientes(nombre, apellidos)')
      .order('fecha', { ascending: false })
      .limit(200);

    if (anio) {
      query = query.gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`);
    }
    if (mes && anio) {
      const m = String(mes).padStart(2, '0');
      query = query.gte('fecha', `${anio}-${m}-01`).lte('fecha', `${anio}-${m}-31`);
    }
    if (paciente_id) {
      query = query.eq('paciente_id', paciente_id);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingInvoicesTableError(error)) return respondInvoicesUnavailable(res);
      throw error;
    }
    res.json({ data: data || [] });
  } catch (err) {
    next(err);
  }
});

// POST /api/facturas - create invoice from payment(s)
router.post('/', async (req, res, next) => {
  try {
    const { paciente_id, pago_ids, iva_pct = 21, notas } = req.body;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });

    const { data: paciente } = await supabase
      .from('crm_pacientes')
      .select('id, nombre, apellidos, dni, direccion, email, telefono')
      .eq('id', paciente_id)
      .single();

    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });

    let pagosQuery = supabase
      .from('crm_pagos')
      .select('id, fecha, importe, metodo_pago, concepto')
      .eq('paciente_id', paciente_id)
      .order('fecha', { ascending: true });

    if (pago_ids?.length) {
      pagosQuery = pagosQuery.in('id', pago_ids);
    }

    const { data: pagos } = await pagosQuery;
    if (!pagos?.length) return res.status(400).json({ error: 'No hay pagos para facturar' });

    const importe_bruto = pagos.reduce((s, p) => s + Number(p.importe), 0);
    const ivaPct = Number(iva_pct);
    const importe_iva = Math.round(importe_bruto * ivaPct) / 100;
    const importe_total = importe_bruto + importe_iva;

    const year = new Date().getFullYear();
    let numero;
    try {
      numero = await nextInvoiceNumber(year);
    } catch (error) {
      if (isMissingInvoicesTableError(error)) return respondInvoicesUnavailable(res, { write: true });
      throw error;
    }

    const { data: factura, error } = await supabase
      .from(INVOICES_TABLE)
      .insert({
        numero,
        paciente_id,
        fecha: new Date().toISOString().slice(0, 10),
        lineas: pagos.map((p) => ({
          concepto: p.concepto || 'Sesion de fisioterapia',
          fecha: p.fecha,
          importe: Number(p.importe),
        })),
        importe_bruto: Math.round(importe_bruto * 100) / 100,
        iva_pct: ivaPct,
        importe_iva: Math.round(importe_iva * 100) / 100,
        importe_total: Math.round(importe_total * 100) / 100,
        estado: 'emitida',
        notas: notas || null,
      })
      .select('*')
      .single();

    if (error) {
      if (isMissingInvoicesTableError(error)) return respondInvoicesUnavailable(res, { write: true });
      throw error;
    }
    res.status(201).json({ data: { ...factura, paciente } });
  } catch (err) {
    next(err);
  }
});

// GET /api/facturas/:id/pdf - generate and download PDF
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const { data: factura, error } = await supabase
      .from(INVOICES_TABLE)
      .select('*, crm_pacientes(nombre, apellidos, dni, direccion, email, telefono)')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (isMissingInvoicesTableError(error)) return respondInvoicesUnavailable(res, { write: true });
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    const pac = factura.crm_pacientes || {};
    const pacNombre = [pac.nombre, pac.apellidos].filter(Boolean).join(' ');

    const clinic = {
      nombre: req.query.cn || CLINIC.nombre,
      nif: req.query.cnif || CLINIC.nif,
      direccion: req.query.cdir || CLINIC.direccion,
      telefono: req.query.ctel || CLINIC.telefono,
      email: req.query.cemail || CLINIC.email,
    };

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${factura.numero}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text(clinic.nombre, 50, 50);
    if (clinic.nif) doc.fontSize(9).font('Helvetica').text(`NIF: ${clinic.nif}`, 50, 75);
    if (clinic.direccion) doc.text(clinic.direccion, 50, 87);
    if (clinic.telefono) doc.text(`Tel: ${clinic.telefono}`, 50, 99);
    if (clinic.email) doc.text(clinic.email, 50, 111);

    doc.fontSize(14).font('Helvetica-Bold').text(`Factura ${factura.numero}`, 350, 50, { align: 'right' });
    doc.fontSize(10).font('Helvetica').text(`Fecha: ${factura.fecha}`, 350, 70, { align: 'right' });

    const yPac = 140;
    doc.fontSize(11).font('Helvetica-Bold').text('Datos del paciente:', 50, yPac);
    doc.fontSize(10).font('Helvetica');
    let yp = yPac + 18;
    doc.text(pacNombre, 50, yp); yp += 14;
    if (pac.dni) { doc.text(`DNI/NIF: ${pac.dni}`, 50, yp); yp += 14; }
    if (pac.direccion) { doc.text(pac.direccion, 50, yp); yp += 14; }
    if (pac.email) { doc.text(pac.email, 50, yp); yp += 14; }

    const yTable = yp + 20;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Concepto', 50, yTable);
    doc.text('Fecha', 320, yTable);
    doc.text('Importe', 430, yTable, { align: 'right', width: 100 });
    doc.moveTo(50, yTable + 15).lineTo(545, yTable + 15).stroke('#cccccc');

    doc.font('Helvetica');
    let yLine = yTable + 22;
    const lineas = factura.lineas || [];
    for (const linea of lineas) {
      doc.text(linea.concepto || 'Sesion', 50, yLine, { width: 260 });
      doc.text(linea.fecha || '', 320, yLine);
      doc.text(`${Number(linea.importe).toFixed(2)} EUR`, 430, yLine, { align: 'right', width: 100 });
      yLine += 18;
    }

    doc.moveTo(350, yLine + 5).lineTo(545, yLine + 5).stroke('#cccccc');
    yLine += 14;
    doc.font('Helvetica');
    doc.text('Base imponible:', 350, yLine);
    doc.text(`${Number(factura.importe_bruto).toFixed(2)} EUR`, 430, yLine, { align: 'right', width: 100 });
    yLine += 16;
    doc.text(`IVA (${factura.iva_pct}%):`, 350, yLine);
    doc.text(`${Number(factura.importe_iva).toFixed(2)} EUR`, 430, yLine, { align: 'right', width: 100 });
    yLine += 18;
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('TOTAL:', 350, yLine);
    doc.text(`${Number(factura.importe_total).toFixed(2)} EUR`, 430, yLine, { align: 'right', width: 100 });

    if (factura.notas) {
      yLine += 40;
      doc.fontSize(9).font('Helvetica').text(`Notas: ${factura.notas}`, 50, yLine, { width: 490 });
    }

    doc.end();
  } catch (err) {
    next(err);
  }
});

export default router;
