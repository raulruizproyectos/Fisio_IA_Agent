import { Router } from 'express';
import { supabase } from '../index.js';
import PDFDocument from 'pdfkit';

const router = Router();

const DOC_SELECT = 'id, paciente_id, tipo, titulo, estado, fecha_firma, created_at, updated_at';

const PLANTILLAS = {
  consentimiento_informado: (paciente) => `CONSENTIMIENTO INFORMADO DE INTERVENCIÓN FISIOTERÁPICA

Yo, ${paciente}, con DNI/NIF indicado en mi ficha, DOY MI CONSENTIMIENTO para recibir tratamiento de fisioterapia.

He sido informado/a de:
• La naturaleza del tratamiento y sus posibles variantes
• Los beneficios esperados del tratamiento propuesto
• Los riesgos y efectos secundarios posibles (inflamación temporal, molestias musculares, etc.)
• Las alternativas terapéuticas disponibles
• Mi derecho a revocar este consentimiento en cualquier momento

Declaro que he comprendido la información recibida, he podido formular preguntas y han sido respondidas satisfactoriamente.

El/La paciente confirma su consentimiento con la firma a continuación.`,

  lopd: (paciente) => `CONSENTIMIENTO DE PROTECCIÓN DE DATOS (LOPD/RGPD)

Yo, ${paciente}, en cumplimiento del Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD):

AUTORIZO el tratamiento de mis datos personales y de salud para:
• La gestión de mi historial clínico y tratamientos
• El envío de comunicaciones relacionadas con mis citas y seguimiento
• La facturación de los servicios prestados

MIS DERECHOS: Puedo ejercer mis derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad dirigiéndome al responsable del tratamiento.

Responsable del tratamiento: Clínica de Fisioterapia
Finalidad: Gestión de pacientes y prestación de servicios sanitarios
Conservación: Durante la relación y el tiempo legalmente exigido`,

  revocacion: (paciente) => `REVOCACIÓN DE CONSENTIMIENTO

Yo, ${paciente}, REVOCO el consentimiento informado de intervención fisioterápica firmado anteriormente, con efectos a partir de la fecha de firma de este documento.

Declaro conocer que esta revocación no tendrá efectos retroactivos sobre los tratamientos ya realizados.`,

  otro: (paciente) => `DOCUMENTO DE CONSENTIMIENTO\n\nPaciente: ${paciente}`,
};

// GET /api/documentos?paciente_id=X
router.get('/', async (req, res, next) => {
  try {
    const { paciente_id } = req.query;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });

    const { data, error } = await supabase
      .from('crm_documentos')
      .select(DOC_SELECT)
      .eq('paciente_id', paciente_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) { next(err); }
});

// POST /api/documentos — create document for signing
router.post('/', async (req, res, next) => {
  try {
    const { paciente_id, tipo = 'consentimiento_informado' } = req.body;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });

    const { data: paciente } = await supabase
      .from('crm_pacientes')
      .select('nombre, apellidos')
      .eq('id', paciente_id)
      .single();

    const nombre = paciente ? [paciente.nombre, paciente.apellidos].filter(Boolean).join(' ') : 'Paciente';
    const plantillaFn = PLANTILLAS[tipo] || PLANTILLAS.otro;
    const contenido = plantillaFn(nombre);

    const titulos = {
      consentimiento_informado: 'Consentimiento Informado de Intervención Fisioterápica',
      lopd: 'Consentimiento de Protección de Datos (LOPD/RGPD)',
      revocacion: 'Revocación de Consentimiento',
      otro: 'Documento de Consentimiento',
    };

    const { data, error } = await supabase
      .from('crm_documentos')
      .insert({ paciente_id, tipo, titulo: titulos[tipo] || 'Documento', contenido })
      .select(DOC_SELECT)
      .single();

    if (error) throw error;
    res.status(201).json({ data, contenido });
  } catch (err) { next(err); }
});

// POST /api/documentos/:id/firmar — save signature
router.post('/:id/firmar', async (req, res, next) => {
  try {
    const { firma_base64 } = req.body;
    if (!firma_base64) return res.status(400).json({ error: 'firma_base64 requerida' });

    const { data, error } = await supabase
      .from('crm_documentos')
      .update({
        firma_base64,
        estado: 'firmado',
        fecha_firma: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select('*, crm_pacientes(nombre, apellidos, dni)')
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
});

// GET /api/documentos/:id/pdf — generate signed PDF
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const { data: doc, error } = await supabase
      .from('crm_documentos')
      .select('*, crm_pacientes(nombre, apellidos, dni)')
      .eq('id', req.params.id)
      .single();

    if (error || !doc) return res.status(404).json({ error: 'Documento no encontrado' });

    const pac = doc.crm_pacientes || {};
    const pacNombre = [pac.nombre, pac.apellidos].filter(Boolean).join(' ');

    const pdf = new PDFDocument({ size: 'A4', margin: 60 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.tipo}_${pacNombre.replace(/ /g, '_')}.pdf"`);
    pdf.pipe(res);

    // Header
    pdf.fontSize(16).font('Helvetica-Bold').text('Clínica de Fisioterapia', { align: 'center' });
    pdf.moveDown(0.3);
    pdf.fontSize(13).font('Helvetica-Bold').text(doc.titulo, { align: 'center' });
    pdf.moveDown(0.5);
    pdf.moveTo(60, pdf.y).lineTo(535, pdf.y).stroke('#cccccc');
    pdf.moveDown(0.5);

    // Patient info
    pdf.fontSize(10).font('Helvetica');
    pdf.text(`Paciente: ${pacNombre}`, { continued: true });
    if (pac.dni) pdf.text(`   DNI/NIF: ${pac.dni}`);
    else pdf.text('');
    pdf.text(`Fecha: ${doc.fecha_firma ? new Date(doc.fecha_firma).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES')}`);
    pdf.moveDown(1);

    // Content
    pdf.fontSize(10).font('Helvetica').text(doc.contenido || '', { lineGap: 4 });
    pdf.moveDown(2);

    // Signature area
    pdf.moveTo(60, pdf.y).lineTo(535, pdf.y).stroke('#e5e7eb');
    pdf.moveDown(0.5);
    pdf.fontSize(10).font('Helvetica-Bold').text('Firma del paciente:');
    pdf.moveDown(0.3);

    if (doc.firma_base64 && doc.estado === 'firmado') {
      try {
        const sigData = doc.firma_base64.replace(/^data:image\/png;base64,/, '');
        const sigBuf = Buffer.from(sigData, 'base64');
        pdf.image(sigBuf, { width: 200, height: 80 });
      } catch {
        pdf.rect(60, pdf.y, 200, 60).stroke('#cccccc');
        pdf.moveDown(4);
      }
    } else {
      pdf.rect(60, pdf.y, 200, 60).stroke('#cccccc');
      pdf.moveDown(4);
    }

    pdf.moveDown(0.5);
    const estadoLabel = doc.estado === 'firmado' ? '✓ FIRMADO DIGITALMENTE' : 'PENDIENTE DE FIRMA';
    pdf.fontSize(9).font('Helvetica').fillColor(doc.estado === 'firmado' ? '#166534' : '#b45309').text(estadoLabel);
    if (doc.fecha_firma) {
      pdf.fillColor('#6b7280').text(`Fecha y hora de firma: ${new Date(doc.fecha_firma).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);
    }

    pdf.fillColor('#000000');
    pdf.end();
  } catch (err) { next(err); }
});

// DELETE /api/documentos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('crm_documentos').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
