import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import PDFDocument from 'pdfkit';
import { crc32, inflateSync } from 'node:zlib';
import { inlinePdfFilename } from '../lib/pdf-filename.js';

const router = Router();

const DOCUMENTS_TABLE = 'crm_documentos';
const DOC_SELECT = 'id, paciente_id, tipo, titulo, estado, fecha_firma, created_at, updated_at';

function signatureBuffer(value) {
  if (typeof value !== 'string' || value.length > 1400000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error('Invalid signature');
  const buffer = Buffer.from(value.slice(22), 'base64');
  if (buffer.length < 57 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid PNG');
  // Validate framing before PDFKit's parser allocates or decompresses untrusted chunks.
  let end = 8;
  while (end < buffer.length) {
    const start = end;
    if (start + 12 > buffer.length) throw new Error('Incomplete PNG');
    end = start + buffer.readUInt32BE(start) + 12;
    if (end > buffer.length || crc32(buffer.subarray(start + 4, end - 4)) !== buffer.readUInt32BE(end - 4)) throw new Error('Invalid PNG chunk');
  }
  const image = new PDFDocument({ autoFirstPage: false }).openImage(buffer);
  const png = image.image;
  if (image.width < 1 || image.height < 1 || image.width > 2048 || image.height > 1024
    || png.bits !== 8 || ![2, 6].includes(png.colorType) || png.interlaceMethod !== 0) throw new Error('Unsupported signature dimensions or format');
  const stride = image.width * (png.colorType === 6 ? 4 : 3) + 1;
  // Decode synchronously: the PDF renderer's asynchronous PNG decoder throws on corrupt pixel data.
  const pixels = inflateSync(png.imgData, { maxOutputLength: stride * image.height });
  if (pixels.length !== stride * image.height) throw new Error('Incomplete PNG pixels');
  for (let row = 0; row < image.height; row++) if (pixels[row * stride] > 4) throw new Error('Invalid PNG filter');
  return buffer;
}

const isMissingDocumentsTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  return code === 'PGRST205' || (message.includes('crm_documentos') && (message.includes('schema cache') || message.includes('could not find the table')));
};

const documentsUnavailableMessage = 'Modulo documentos no disponible: falta tabla crm_documentos. Ejecuta database/migrations/010_crm_documentos.sql en Supabase.';

const respondDocumentsUnavailable = (res, { write = false } = {}) => {
  if (write) {
    return res.status(503).json({
      error: documentsUnavailableMessage,
      missing_table: DOCUMENTS_TABLE,
    });
  }

  return res.json({
    data: [],
    unavailable: true,
    error: documentsUnavailableMessage,
    missing_table: DOCUMENTS_TABLE,
  });
};

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

// GET /api/documentos?paciente_id=X  (sin paciente_id devuelve todos)
router.get('/', async (req, res, next) => {
  try {
    const { paciente_id } = req.query;
    let query = supabase
      .from(DOCUMENTS_TABLE)
      .select(`${DOC_SELECT}${paciente_id ? ', contenido' : ''}, crm_pacientes(nombre, apellidos)`)
      .order('created_at', { ascending: false })
      .limit(200);
    if (paciente_id) query = query.eq('paciente_id', paciente_id);

    const { data, error } = await query;
    if (error) {
      if (isMissingDocumentsTableError(error)) return respondDocumentsUnavailable(res);
      throw error;
    }
    res.json({ data: data || [] });
  } catch (err) { next(err); }
});

// POST /api/documentos — create document for signing
router.post('/', async (req, res, next) => {
  try {
    const { paciente_id, tipo = 'consentimiento_informado' } = req.body;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });

    if (typeof tipo !== 'string' || !Object.hasOwn(PLANTILLAS, tipo)) return res.status(400).json({ error: 'Tipo de documento inválido' });

    const { data: paciente, error: patientError } = await supabase
      .from('crm_pacientes')
      .select('nombre, apellidos')
      .eq('id', paciente_id)
      .maybeSingle();

    if (patientError) throw patientError;
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });

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
      .from(DOCUMENTS_TABLE)
      .insert({ paciente_id, tipo, titulo: titulos[tipo] || 'Documento', contenido })
      .select(DOC_SELECT)
      .single();

    if (error) {
      if (isMissingDocumentsTableError(error)) return respondDocumentsUnavailable(res, { write: true });
      throw error;
    }
    res.status(201).json({ data, contenido });
  } catch (err) { next(err); }
});

// POST /api/documentos/:id/firmar — save signature
router.post('/:id/firmar', async (req, res, next) => {
  try {
    const { firma_base64 } = req.body;
    try { signatureBuffer(firma_base64); }
    catch { return res.status(400).json({ error: 'Dibuja una firma válida en el recuadro y vuelve a guardarla.' }); }

    const { data, error } = await supabase
      .from(DOCUMENTS_TABLE)
      .update({
        firma_base64,
        estado: 'firmado',
        fecha_firma: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('estado', 'pendiente')
      .select('*, crm_pacientes(nombre, apellidos, dni)')
      .maybeSingle();

    if (error) {
      if (isMissingDocumentsTableError(error)) return respondDocumentsUnavailable(res, { write: true });
      throw error;
    }
    if (!data) {
      const previous = await supabase.from(DOCUMENTS_TABLE).select(DOC_SELECT + ', firma_base64').eq('id', req.params.id).maybeSingle();
      if (previous.error) throw previous.error;
      if (!previous.data) return res.status(404).json({ error: 'Documento no encontrado' });
      if (previous.data.firma_base64 === firma_base64) return res.json({ data: previous.data });
      return res.status(409).json({ error: 'Este documento ya no está pendiente de firma. Recarga para comprobarlo.' });
    }
    res.json({ data });
  } catch (err) { next(err); }
});

// GET /api/documentos/:id/pdf — generate signed PDF
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const { data: doc, error } = await supabase
      .from(DOCUMENTS_TABLE)
      .select('*, crm_pacientes(nombre, apellidos, dni)')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) {
      if (isMissingDocumentsTableError(error)) return respondDocumentsUnavailable(res, { write: true });
      throw error;
    }
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    let signature;
    if (doc.estado === 'firmado') {
      try { signature = signatureBuffer(doc.firma_base64); }
      catch { return res.status(409).json({ error: 'La firma guardada no se puede leer. Revisa el documento con la clínica.' }); }
    }

    const pac = doc.crm_pacientes || {};
    const pacNombre = [pac.nombre, pac.apellidos].filter(Boolean).join(' ');

    const clinicNombre = req.query.cn || 'Clínica de Fisioterapia';
    const clinicNif = req.query.cnif || '';
    const clinicDir = req.query.cdir || '';
    const clinicTel = req.query.ctel || '';
    const clinicEmail = req.query.cemail || '';

    const pdf = new PDFDocument({ size: 'A4', margin: 60 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', inlinePdfFilename(`${doc.tipo}_${pacNombre.replace(/ /g, '_')}.pdf`));
    pdf.pipe(res);

    // Header
    pdf.fontSize(16).font('Helvetica-Bold').text(clinicNombre, { align: 'center' });
    if (clinicNif) { pdf.fontSize(9).font('Helvetica').text(`NIF: ${clinicNif}`, { align: 'center' }); }
    if (clinicDir) { pdf.fontSize(9).font('Helvetica').text(clinicDir, { align: 'center' }); }
    if (clinicTel) { pdf.fontSize(9).font('Helvetica').text(`Tel: ${clinicTel}`, { align: 'center' }); }
    if (clinicEmail) { pdf.fontSize(9).font('Helvetica').text(clinicEmail, { align: 'center' }); }
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

    if (signature) {
      pdf.image(signature, { width: 200, height: 80 });
    } else {
      pdf.rect(60, pdf.y, 200, 60).stroke('#cccccc');
      pdf.moveDown(4);
    }

    pdf.moveDown(0.5);
    const estadoLabel = signature ? 'FIRMA CAPTURADA' : 'PENDIENTE DE FIRMA';
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
    const { error } = await supabase.from(DOCUMENTS_TABLE).delete().eq('id', req.params.id);
    if (error) {
      if (isMissingDocumentsTableError(error)) return respondDocumentsUnavailable(res, { write: true });
      throw error;
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
