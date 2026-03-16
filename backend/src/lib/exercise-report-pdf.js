import PDFDocument from 'pdfkit';

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  dark:    '#1e293b',  // headings
  body:    '#334155',  // body text
  muted:   '#64748b',  // labels, captions
  accent:  '#0f766e',  // zone labels, positive highlights
  warn:    '#92400e',  // precautions text
  warnBg:  '#fffbeb',  // precautions background
  border:  '#e2e8f0',  // dividers, card borders
  bg:      '#f8fafc',  // card / info backgrounds
  white:   '#ffffff',
  hdrBg:   '#0f172a',  // page header background
  hdrSub:  '#94a3b8',  // page header subtitle
};

// ─── Font sizes (4 levels) ────────────────────────────────────────────────────
const S = { xl: 18, lg: 13, md: 10, sm: 8 };

// ─── Zone display labels ──────────────────────────────────────────────────────
const ZONE_LABELS = {
  cervical:      'Cervical / Cuello',
  hombro_brazo:  'Hombro y Brazo',
  espalda:       'Espalda / Lumbar',
  cadera:        'Cadera / Gluteo',
  rodilla:       'Rodilla',
  tobillo_pie:   'Tobillo y Pie',
  respiratorio:  'Respiratorio',
  general:       'General',
};

// ─── Text sanitizers ─────────────────────────────────────────────────────────
function safePdfText(value) {
  const str = String(value ?? '').trim();
  return str
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[\u2700-\u27BF]/g, '')
    .replace(/[\u2600-\u26FF]/g, '')
    .replace(/[\u2190-\u21FF]/g, '->')
    .replace(/[\u2022\u2023\u25AA\u25AB]/g, '-')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2026]/g, '...')
    .replace(/[^\x00-\xFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeText(value, fallback = '-') {
  if (Array.isArray(value)) {
    const joined = value.map((item) => safePdfText(String(item ?? ''))).filter(Boolean).join(', ');
    return joined || fallback;
  }
  return safePdfText(String(value ?? '')) || fallback;
}

function normalizeParagraph(value, fallback = '') {
  if (Array.isArray(value)) {
    return value.map((item) => safePdfText(String(item ?? ''))).filter(Boolean).join(' ') || fallback;
  }
  return safePdfText(String(value ?? '')) || fallback;
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => safePdfText(String(item ?? ''))).filter(Boolean);
  }
  const normalized = safePdfText(String(value ?? ''));
  return normalized ? [normalized] : [];
}

function truncate(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  return text.slice(0, maxChars).replace(/\s+\S*$/, '').trim() + '...';
}

// ─── Layout helpers ───────────────────────────────────────────────────────────
function contentBounds(doc) {
  const { left, right, top, bottom } = doc.page.margins;
  return {
    left,
    top,
    right:  doc.page.width - right,
    bottom: doc.page.height - bottom,
    width:  doc.page.width - left - right,
  };
}

function drawPageChrome(doc, pageNumber, patientName) {
  const bounds = contentBounds(doc);
  const footerY = bounds.bottom - 10;
  doc.moveTo(bounds.left, footerY - 8).lineTo(bounds.right, footerY - 8)
    .lineWidth(0.75).strokeColor(C.border).stroke();
  doc.font('Helvetica').fontSize(S.sm).fillColor(C.muted);
  const label = patientName ? `Plan de ejercicios — ${patientName}` : 'Plan de ejercicios terapeuticos';
  doc.text(label, bounds.left, footerY, { width: bounds.width - 70, lineBreak: false });
  doc.text('Pag. ' + pageNumber, bounds.right - 60, footerY, { width: 60, align: 'right', lineBreak: false });
}

function addFreshPage(doc, state) {
  doc.addPage();
  state.pageNumber = (state.pageNumber || 1) + 1;
  drawPageChrome(doc, state.pageNumber, state.patientName);
  state.y = doc.page.margins.top;
}

function ensureSpace(doc, state, needed) {
  const bounds = contentBounds(doc);
  if (state.y + needed > bounds.bottom) addFreshPage(doc, state);
}

function drawLine(doc, x1, y, x2, color = C.border, width = 0.75) {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(width).strokeColor(color).stroke();
}

// ─── Section heading (fixed cursor tracking) ─────────────────────────────────
function drawSectionHeading(doc, state, title) {
  ensureSpace(doc, state, 44);
  const bounds = contentBounds(doc);
  doc.font('Helvetica-Bold').fontSize(S.lg).fillColor(C.dark);
  const titleH = doc.heightOfString(title, { width: bounds.width, lineGap: 2 });
  doc.text(title, bounds.left, state.y, { width: bounds.width, lineGap: 2 });
  state.y += titleH + 8;
  drawLine(doc, bounds.left, state.y, bounds.right);
  state.y += 14;
}

// ─── Info panel ──────────────────────────────────────────────────────────────
function drawInfoPanel(doc, state, label, text, tone = 'neutral') {
  const toneColors = {
    neutral: { bg: C.bg,      border: C.border, label: C.muted,  text: C.body  },
    accent:  { bg: '#f0fdf9', border: '#5eead4', label: C.accent, text: C.body  },
    warn:    { bg: C.warnBg,  border: '#fcd34d', label: C.warn,   text: C.body  },
    danger:  { bg: '#fef2f2', border: '#fca5a5', label: '#b91c1c', text: C.body },
  };
  const pal = toneColors[tone] || toneColors.neutral;
  const bounds = contentBounds(doc);
  const pad = 12;
  const innerW = bounds.width - pad * 2;
  const labelStr = safePdfText(String(label || '')).toUpperCase();
  const valueStr = normalizeParagraph(text, '-');

  const labelH = doc.font('Helvetica-Bold').fontSize(S.sm).heightOfString(labelStr, { width: innerW });
  const valueH = doc.font('Helvetica').fontSize(S.md).heightOfString(valueStr, { width: innerW, lineGap: 3 });
  const panelH = Math.max(52, pad + labelH + 5 + valueH + pad);

  ensureSpace(doc, state, panelH + 10);

  doc.roundedRect(bounds.left, state.y, bounds.width, panelH, 8)
    .fillAndStroke(pal.bg, pal.border);

  doc.font('Helvetica-Bold').fontSize(S.sm).fillColor(pal.label);
  doc.text(labelStr, bounds.left + pad, state.y + pad, { width: innerW, characterSpacing: 1.1, lineBreak: false });

  doc.font('Helvetica').fontSize(S.md).fillColor(pal.text);
  doc.text(valueStr, bounds.left + pad, state.y + pad + labelH + 5, { width: innerW, lineGap: 3 });

  state.y += panelH + 10;
}

// ─── Image fetch ─────────────────────────────────────────────────────────────
async function fetchImageBuffer(url) {
  const source = String(url || '').trim();
  if (!source) return null;

  const supabaseBase = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceKey   = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  for (const candidate of [source, encodeURI(source)]) {
    try {
      const headers = { Accept: 'image/png,image/jpeg,image/*' };
      if (serviceKey && supabaseBase && candidate.startsWith(supabaseBase)) {
        headers['Authorization'] = `Bearer ${serviceKey}`;
        headers['apikey'] = serviceKey;
      }
      const res = await fetch(candidate, { signal: AbortSignal.timeout(12000), redirect: 'follow', headers });
      if (!res.ok) continue;
      const arr = await res.arrayBuffer();
      if (!arr.byteLength) continue;
      return Buffer.from(arr);
    } catch {
      continue;
    }
  }
  return null;
}

// ─── Exercise card ────────────────────────────────────────────────────────────
async function drawExerciseCard(doc, state, exercise, index, total) {
  const bounds = contentBounds(doc);
  const pad    = 14;
  const imgW   = 110;
  const imgH   = 85;
  const gap    = 12;

  const hasImg    = Boolean(String(exercise?.imagen_url || '').trim());
  const imgBuffer = hasImg ? await fetchImageBuffer(exercise.imagen_url) : null;

  const textW = bounds.width - pad * 2 - (hasImg ? imgW + gap : 0);
  const order = exercise?.orden || index + 1;
  const nombre = safeText(exercise?.nombre || 'Ejercicio');

  // ── Texts ──
  const zonaRaw   = safeText(exercise?.zona_corporal || '', '');
  const zonaLabel = ZONE_LABELS[zonaRaw] || (zonaRaw ? zonaRaw.replace(/_/g, ' ') : '');

  const pautaParts = [
    exercise?.series             ? `Series: ${exercise.series}`              : null,
    exercise?.repeticiones       ? `Reps: ${exercise.repeticiones}`          : null,
    exercise?.duracion_segundos  ? `Duracion: ${exercise.duracion_segundos}s`: null,
  ].filter(Boolean);
  const pauta = pautaParts.join('   |   ');

  const rawProc   = normalizeParagraph(exercise?.procedimiento || exercise?.descripcion, '');
  const procedure = truncate(rawProc, 500) || 'Sin descripcion detallada.';
  const why       = truncate(normalizeParagraph(exercise?.why, ''), 200);
  const cautions  = normalizeList(exercise?.cautions).map((c) => truncate(c, 120));

  // ── Measure every element with the EXACT same params used when rendering ──
  const mCounter   = doc.font('Helvetica-Bold').fontSize(S.sm).heightOfString(`EJERCICIO ${order} DE ${total}`, { width: textW });
  const mNombre    = doc.font('Helvetica-Bold').fontSize(S.lg).heightOfString(nombre, { width: textW, lineGap: 2 });
  const mZona      = zonaLabel ? doc.font('Helvetica').fontSize(S.sm).heightOfString(`Zona: ${zonaLabel}`, { width: textW }) : 0;
  const mSeparator = 8;
  const mPauta     = pauta ? doc.font('Helvetica-Bold').fontSize(S.sm).heightOfString(pauta, { width: textW }) : 0;
  const mInstrLbl  = doc.font('Helvetica-Bold').fontSize(S.sm).heightOfString('INSTRUCCIONES', { width: textW });
  const mProcedure = doc.font('Helvetica').fontSize(S.md).heightOfString(procedure, { width: textW, lineGap: 3 });
  const mWhyLbl    = why ? doc.font('Helvetica-Bold').fontSize(S.sm).heightOfString('POR QUE ESTE EJERCICIO', { width: textW }) : 0;
  const mWhyBody   = why ? doc.font('Helvetica').fontSize(S.sm).heightOfString(why, { width: textW, lineGap: 3 }) : 0;
  // Caution text rendered with textW - 16 (8px inner padding each side)
  const cautionInnerW = textW - 16;
  const mCautLbl   = cautions.length ? doc.font('Helvetica-Bold').fontSize(S.sm).heightOfString('PRECAUCIONES', { width: cautionInnerW }) : 0;
  const mCautBody  = cautions.length ? doc.font('Helvetica').fontSize(S.sm).heightOfString(cautions.map((c) => `- ${c}`).join('\n'), { width: cautionInnerW, lineGap: 2 }) : 0;

  // ── Spacers between elements (match rendering exactly) ──
  const spAfterCounter  = 6;
  const spAfterNombre   = 4;
  const spAfterZona     = 4;   // included in zonaH gap
  const spAfterPauta    = 8;
  const spAfterInstrLbl = 4;
  const spAfterProcedure= 6;
  const spAfterWhyLbl   = 4;
  const spAfterWhyBody  = 6;
  const cautionPad      = cautions.length ? 8 + 8 : 0; // top + bottom padding of caution block

  const textContentH = pad
    + mCounter   + spAfterCounter
    + mNombre    + spAfterNombre
    + (zonaLabel ? mZona + spAfterZona : 0)
    + mSeparator
    + (pauta ? mPauta + spAfterPauta : 0)
    + mInstrLbl  + spAfterInstrLbl
    + mProcedure + spAfterProcedure
    + (why ? mWhyLbl + spAfterWhyLbl + mWhyBody + spAfterWhyBody : 0)
    + (cautions.length ? cautionPad + mCautLbl + spAfterWhyLbl + mCautBody : 0)
    + pad;

  const cardH = Math.max(hasImg ? imgH + pad * 2 + 10 : 120, textContentH + 6);

  ensureSpace(doc, state, cardH + 16);

  // ── Card background ──
  doc.roundedRect(bounds.left, state.y, bounds.width, cardH, 8).fillAndStroke(C.white, C.border);
  // Left accent stripe
  doc.rect(bounds.left, state.y, 4, cardH).fill(C.accent);

  const textX = bounds.left + pad + 4;
  let cy = state.y + pad;

  // ── Counter ──
  doc.font('Helvetica-Bold').fontSize(S.sm).fillColor(C.accent);
  doc.text(`EJERCICIO ${order} DE ${total}`, textX, cy, { width: textW, lineBreak: false, characterSpacing: 1.2 });
  cy += mCounter + spAfterCounter;

  // ── Name ──
  doc.font('Helvetica-Bold').fontSize(S.lg).fillColor(C.dark);
  doc.text(nombre, textX, cy, { width: textW, lineGap: 2 });
  cy += mNombre + spAfterNombre;

  // ── Zone ──
  if (zonaLabel) {
    doc.font('Helvetica').fontSize(S.sm).fillColor(C.accent);
    doc.text(`Zona: ${zonaLabel}`, textX, cy, { width: textW, lineBreak: false });
    cy += mZona + spAfterZona;
  }

  // ── Separator ──
  drawLine(doc, textX, cy, textX + textW, C.border);
  cy += mSeparator;

  // ── Pauta ──
  if (pauta) {
    doc.font('Helvetica-Bold').fontSize(S.sm).fillColor(C.muted);
    doc.text(pauta, textX, cy, { width: textW, lineBreak: false });
    cy += mPauta + spAfterPauta;
  }

  // ── Instructions label ──
  doc.font('Helvetica-Bold').fontSize(S.sm).fillColor(C.muted);
  doc.text('INSTRUCCIONES', textX, cy, { width: textW, lineBreak: false, characterSpacing: 1.1 });
  cy += mInstrLbl + spAfterInstrLbl;

  // ── Procedure ──
  doc.font('Helvetica').fontSize(S.md).fillColor(C.body);
  doc.text(procedure, textX, cy, { width: textW, lineGap: 3 });
  cy += mProcedure + spAfterProcedure;

  // ── Why ──
  if (why) {
    doc.font('Helvetica-Bold').fontSize(S.sm).fillColor(C.muted);
    doc.text('POR QUE ESTE EJERCICIO', textX, cy, { width: textW, lineBreak: false, characterSpacing: 1.1 });
    cy += mWhyLbl + spAfterWhyLbl;
    doc.font('Helvetica').fontSize(S.sm).fillColor(C.muted);
    doc.text(why, textX, cy, { width: textW, lineGap: 3 });
    cy += mWhyBody + spAfterWhyBody;
  }

  // ── Cautions ──
  if (cautions.length) {
    const cautionBlockH = 8 + mCautLbl + spAfterWhyLbl + mCautBody + 8;
    doc.roundedRect(textX, cy, textW, cautionBlockH, 6).fill(C.warnBg);
    cy += 8;
    doc.font('Helvetica-Bold').fontSize(S.sm).fillColor(C.warn);
    doc.text('PRECAUCIONES', textX + 8, cy, { width: cautionInnerW, lineBreak: false, characterSpacing: 1.1 });
    cy += mCautLbl + spAfterWhyLbl;
    doc.font('Helvetica').fontSize(S.sm).fillColor(C.warn);
    doc.text(cautions.map((c) => `- ${c}`).join('\n'), textX + 8, cy, { width: cautionInnerW, lineGap: 2 });
  }

  // ── Image ──
  if (hasImg) {
    const imgX = bounds.left + bounds.width - pad - imgW;
    const imgY = state.y + (cardH - imgH) / 2;
    doc.roundedRect(imgX, imgY, imgW, imgH, 6).fillAndStroke(C.bg, C.border);
    if (imgBuffer) {
      try {
        doc.image(imgBuffer, imgX + 4, imgY + 4, { fit: [imgW - 8, imgH - 8], align: 'center', valign: 'center' });
      } catch {
        doc.font('Helvetica').fontSize(S.sm).fillColor(C.muted)
          .text('Sin imagen', imgX, imgY + imgH / 2 - 6, { width: imgW, align: 'center', lineBreak: false });
      }
    } else {
      doc.font('Helvetica').fontSize(S.sm).fillColor(C.muted)
        .text('Sin imagen', imgX, imgY + imgH / 2 - 6, { width: imgW, align: 'center', lineBreak: false });
    }
  }

  state.y += cardH + 14;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function buildExerciseReportPdfBuffer(payload = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 44, bottom: 44, left: 44, right: 44 },
        info: {
          Title:   'Plan de ejercicios terapeuticos',
          Author:  'Fisioterapia Carla JL',
          Subject: 'Plan personalizado de ejercicios',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const exercises    = Array.isArray(payload?.exercises) ? payload.exercises : [];
      const patientName  = safeText(payload?.patient_name, '') || 'Paciente';
      const dateText     = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
      const redFlags     = payload?.red_flags || {};
      const redFlagItems = normalizeList(redFlags?.items).join(', ');
      const requestId    = safeText(payload?.request_id, '-');
      const coverage     = payload?.image_coverage || {};

      const state = { y: doc.page.margins.top, pageNumber: 1, patientName };

      drawPageChrome(doc, 1, patientName);

      const bounds = contentBounds(doc);

      // ─── HEADER BLOCK ────────────────────────────────────────────────────
      const hdrH = 88;
      doc.rect(bounds.left, state.y, bounds.width, hdrH).fill(C.hdrBg);

      doc.font('Helvetica-Bold').fontSize(S.xl).fillColor(C.white);
      doc.text('Plan de ejercicios terapeuticos', bounds.left + 16, state.y + 14, {
        width: bounds.width - 32,
        lineBreak: false,
      });

      doc.font('Helvetica').fontSize(S.md).fillColor(C.hdrSub);
      doc.text(`Paciente: ${patientName}`, bounds.left + 16, state.y + 42, { width: bounds.width - 32, lineBreak: false });

      doc.font('Helvetica').fontSize(S.sm).fillColor(C.hdrSub);
      doc.text(`Fecha: ${dateText}   |   Fisioterapia Carla JL - Terrassa`, bounds.left + 16, state.y + 60, {
        width: bounds.width - 32,
        lineBreak: false,
      });

      state.y += hdrH + 22;

      // ─── CLINICAL CONTEXT ────────────────────────────────────────────────
      drawSectionHeading(doc, state, 'Informacion clinica');
      drawInfoPanel(doc, state, 'Sintomas', safeText(payload?.symptom_summary, 'No informado'), 'neutral');

      if (redFlags?.present) {
        drawInfoPanel(
          doc, state,
          'Alertas clinicas',
          `Consulta con tu fisioterapeuta antes de iniciar. ${redFlagItems || ''}`,
          'danger'
        );
      }

      drawInfoPanel(doc, state, 'Indicacion', safeText(payload?.selection_rationale, 'No informado'), 'neutral');

      // ─── EXERCISE PLAN ───────────────────────────────────────────────────
      const total = exercises.length;
      drawSectionHeading(doc, state, `Tu plan: ${total} ejercicio${total !== 1 ? 's' : ''}`);

      if (!total) {
        drawInfoPanel(doc, state, 'Estado', 'No hay ejercicios en esta recomendacion.', 'warn');
      }

      for (let i = 0; i < total; i++) {
        await drawExerciseCard(doc, state, exercises[i], i, total);
      }

      // ─── MESSAGE FOR PATIENT ─────────────────────────────────────────────
      const patientMsg = normalizeParagraph(payload?.message_to_patient || payload?.message_to_patient_es, '');
      if (patientMsg) {
        drawSectionHeading(doc, state, 'Recomendaciones finales');
        drawInfoPanel(doc, state, 'Mensaje de tu fisioterapeuta', patientMsg, 'accent');
      }

      // ─── CLINICAL NOTE (physio only) ──────────────────────────────────────
      const therapistMsg = normalizeParagraph(payload?.message_to_therapist, '');
      if (therapistMsg || redFlags?.present) {
        addFreshPage(doc, state);
        drawSectionHeading(doc, state, 'Nota clinica (fisioterapeuta)');
        if (therapistMsg) {
          drawInfoPanel(doc, state, 'Observaciones', therapistMsg, 'accent');
        }
        if (redFlags?.present) {
          drawInfoPanel(doc, state, 'Alertas rojas detectadas', redFlagItems || 'Valorar derivacion medica.', 'danger');
        }
        drawInfoPanel(
          doc, state, 'Trazabilidad',
          `Solicitud: ${requestId}  |  Imagenes: ${coverage?.total ? `${coverage.with_image || 0}/${coverage.total}` : 'Sin dato'}`,
          'neutral'
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
