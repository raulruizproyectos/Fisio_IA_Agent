import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import PDFDocument from 'pdfkit';
import { isMoney, respondFinanceError } from '../lib/finance.js';

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

// GET /api/facturas - list invoices with filters
router.get('/', async (req, res, next) => {
  try {
    const { anio, mes, paciente_id } = req.query;
    if ((anio && !/^\d{4}$/.test(String(anio))) || (mes && (!anio || !/^\d{1,2}$/.test(String(mes)) || Number(mes)<1 || Number(mes)>12))) {
      return res.status(400).json({ error: 'Selecciona un año y mes válidos' });
    }
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
      const nextMonth = Number(mes)===12 ? `${Number(anio)+1}-01-01` : `${anio}-${String(Number(mes)+1).padStart(2,'0')}-01`;
      query = query.gte('fecha', `${anio}-${m}-01`).lt('fecha', nextMonth);
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
    const { paciente_id, pago_ids, iva_pct = 0, notas } = req.body;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });
    if (!isMoney(iva_pct,true) || Number(iva_pct)>100) return res.status(400).json({ error: 'Porcentaje de IVA inválido' });
    if (pago_ids !== undefined && (!Array.isArray(pago_ids) || !pago_ids.length || pago_ids.length>500
      || pago_ids.some(id => typeof id!=='string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) || new Set(pago_ids.map(id=>id.toLowerCase())).size!==pago_ids.length)) {
      return res.status(400).json({ error: 'Selecciona cobros válidos sin duplicados' });
    }
    const { data: factura, error } = await supabase.rpc('issue_clinic_invoice', {
      target_patient: paciente_id, payment_ids: pago_ids || null, tax_percent: Number(iva_pct), invoice_notes: notas || null,
    });
    if (error) {
      if (isMissingInvoicesTableError(error)) return respondInvoicesUnavailable(res, { write: true });
      return respondFinanceError(res, error);
    }
    res.status(201).json({ data: factura });
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

    if (factura.exencion_iva) {
      yLine += 25;
      doc.fontSize(9).font('Helvetica').text(factura.exencion_iva, 50, yLine, { width: 490 });
    }

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
