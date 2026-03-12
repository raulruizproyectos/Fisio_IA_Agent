import PDFDocument from 'pdfkit';

const COLORS = {
  ink: '#0f172a',
  muted: '#475569',
  accent: '#0f766e',
  accentSoft: '#d1fae5',
  accentLine: '#99f6e4',
  warning: '#b45309',
  warningSoft: '#fef3c7',
  warningLine: '#fcd34d',
  danger: '#b91c1c',
  dangerSoft: '#fee2e2',
  dangerLine: '#fca5a5',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  line: '#dbe4ee',
  hero: '#0f172a',
  heroGlow: '#1d4ed8',
  white: '#ffffff',
};

function safeText(value, fallback = '-') {
  if (Array.isArray(value)) {
    const joined = value.map((item) => String(item ?? '').trim()).filter(Boolean).join(', ');
    return joined || fallback;
  }

  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function normalizeParagraph(value, fallback = '') {
  if (Array.isArray(value)) {
    const joined = value.map((item) => String(item ?? '').trim()).filter(Boolean).join(' ');
    return joined || fallback;
  }

  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  const normalized = String(value ?? '').trim();
  return normalized ? [normalized] : [];
}

function shortText(value, maxLength = 32) {
  const normalized = safeText(value, '-');
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function contentBounds(doc) {
  const { left, right, top, bottom } = doc.page.margins;
  return {
    left,
    top,
    right: doc.page.width - right,
    bottom: doc.page.height - bottom,
    width: doc.page.width - left - right,
  };
}

function resetCursor(doc, state) {
  state.y = doc.page.margins.top;
}

function drawPageChrome(doc, pageNumber = 1) {
  const bounds = contentBounds(doc);
  const footerY = bounds.bottom - 10;

  doc.moveTo(bounds.left, footerY - 8).lineTo(bounds.right, footerY - 8).lineWidth(1).strokeColor(COLORS.line).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
  doc.text('Fisio IA Agent | Informe profesional', bounds.left, footerY, { width: bounds.width - 70, lineBreak: false });
  doc.text('Pagina ' + pageNumber, bounds.right - 60, footerY, { width: 60, align: 'right', lineBreak: false });
}

function addFreshPage(doc, state) {
  doc.addPage();
  state.pageNumber = (state.pageNumber || 1) + 1;
  drawPageChrome(doc, state.pageNumber);
  resetCursor(doc, state);
}

function ensureSpace(doc, state, needed) {
  const bounds = contentBounds(doc);
  if (state.y + needed <= bounds.bottom) return;
  addFreshPage(doc, state);
}

function drawRoundedPanel(doc, x, y, width, height, fillColor, strokeColor, radius = 16) {
  doc.roundedRect(x, y, width, height, radius);
  doc.fillAndStroke(fillColor, strokeColor);
}

function measureText(doc, text, width, fontSize = 10.5, fontName = 'Helvetica', lineGap = 3) {
  const value = normalizeParagraph(text, '');
  if (!value) return 0;
  doc.font(fontName).fontSize(fontSize);
  return doc.heightOfString(value, { width, lineGap });
}

function drawParagraph(doc, text, x, y, width, fontSize = 10.5, color = COLORS.ink, lineGap = 3, fontName = 'Helvetica') {
  const value = normalizeParagraph(text, '');
  if (!value) return 0;
  doc.font(fontName).fontSize(fontSize).fillColor(color);
  doc.text(value, x, y, { width, lineGap });
  return doc.heightOfString(value, { width, lineGap });
}

function drawSectionHeading(doc, state, title, eyebrow = '') {
  ensureSpace(doc, state, 34);
  const bounds = contentBounds(doc);

  if (eyebrow) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.accent);
    doc.text(String(eyebrow).toUpperCase(), bounds.left, state.y, { characterSpacing: 1.4 });
    state.y += 12;
  }

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.ink);
  doc.text(title, bounds.left, state.y);
  state.y += 8;

  doc.moveTo(bounds.left, state.y).lineTo(bounds.right, state.y).lineWidth(1).strokeColor(COLORS.line).stroke();
  state.y += 12;
}

function drawInfoPanel(doc, state, label, text, tone = 'neutral') {
  const bounds = contentBounds(doc);
  const toneMap = {
    neutral: { fill: COLORS.surfaceAlt, line: COLORS.line, label: COLORS.muted, text: COLORS.ink },
    accent: { fill: '#eff6ff', line: '#bfdbfe', label: '#1d4ed8', text: COLORS.ink },
    success: { fill: COLORS.accentSoft, line: COLORS.accentLine, label: COLORS.accent, text: COLORS.ink },
    warning: { fill: COLORS.warningSoft, line: COLORS.warningLine, label: COLORS.warning, text: COLORS.ink },
    danger: { fill: COLORS.dangerSoft, line: COLORS.dangerLine, label: COLORS.danger, text: COLORS.ink },
  };
  const palette = toneMap[tone] || toneMap.neutral;
  const pad = 14;
  const labelText = String(label || '').toUpperCase();
  const valueText = normalizeParagraph(text, '-');
  const textWidth = bounds.width - (pad * 2);
  const labelHeight = measureText(doc, labelText, textWidth, 8, 'Helvetica-Bold', 1);
  const valueHeight = measureText(doc, valueText, textWidth, 10.5, 'Helvetica', 3);
  const panelHeight = Math.max(58, pad + labelHeight + 6 + valueHeight + pad);

  ensureSpace(doc, state, panelHeight + 10);
  drawRoundedPanel(doc, bounds.left, state.y, bounds.width, panelHeight, palette.fill, palette.line, 14);

  doc.font('Helvetica-Bold').fontSize(8).fillColor(palette.label);
  doc.text(labelText, bounds.left + pad, state.y + pad, { width: textWidth, characterSpacing: 1.2 });

  doc.font('Helvetica').fontSize(10.5).fillColor(palette.text);
  doc.text(valueText, bounds.left + pad, state.y + pad + labelHeight + 6, { width: textWidth, lineGap: 3 });

  state.y += panelHeight + 10;
}

function buildMetricCards(payload) {
  const exercises = Array.isArray(payload?.exercises) ? payload.exercises : [];
  const coverage = payload?.image_coverage || {};
  const patientValue = shortText(payload?.patient_name || payload?.patient_id || 'Sin paciente', 26);
  const coverageValue = coverage?.total ? `${coverage.with_image || 0}/${coverage.total}` : 'Sin dato';
  const reviewValue = payload?.red_flags?.present ? 'Revisar alertas' : 'Revision estandar';

  return [
    { label: 'Paciente', value: patientValue },
    { label: 'Ejercicios', value: String(exercises.length) },
    { label: 'Cobertura imagen', value: coverageValue },
    { label: 'Revision', value: reviewValue },
  ];
}

function drawMetricRow(doc, state, payload) {
  const bounds = contentBounds(doc);
  const cards = buildMetricCards(payload);
  const gap = 10;
  const cardWidth = (bounds.width - (gap * (cards.length - 1))) / cards.length;
  const cardHeight = 58;

  ensureSpace(doc, state, cardHeight + 12);

  cards.forEach((card, index) => {
    const x = bounds.left + ((cardWidth + gap) * index);
    drawRoundedPanel(doc, x, state.y, cardWidth, cardHeight, COLORS.surfaceAlt, COLORS.line, 14);

    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted);
    doc.text(card.label.toUpperCase(), x + 12, state.y + 10, { width: cardWidth - 24, characterSpacing: 1.1 });

    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.ink);
    doc.text(card.value, x + 12, state.y + 26, { width: cardWidth - 24, lineGap: 2 });
  });

  state.y += cardHeight + 14;
}

function buildImageSourceCandidates(url) {
  const source = String(url || '').trim();
  if (!source) return [];

  const variants = new Set();
  const compacted = source.replace(/s+.(png|jpe?g)$/i, '.$1');
  const encodedSource = encodeURI(source);
  const encodedCompacted = encodeURI(compacted);

  [source, compacted, encodedSource, encodedCompacted].forEach((candidate) => {
    const value = String(candidate || '').trim();
    if (value) variants.add(value);
  });

  return Array.from(variants);
}

async function fetchImageBuffer(url) {
  const candidates = buildImageSourceCandidates(url);
  if (!candidates.length) return null;

  const supabaseBase = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  for (const source of candidates) {
    try {
      const headers = {
        Accept: 'image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5',
        'User-Agent': 'FisioIAAgent/1.0',
      };

      // Bucket ejercicios es privado: añadir service role key para URLs de Supabase Storage
      if (serviceKey && supabaseBase && source.startsWith(supabaseBase)) {
        headers['Authorization'] = `Bearer ${serviceKey}`;
        headers['apikey'] = serviceKey;
      }

      const response = await fetch(source, {
        signal: AbortSignal.timeout(12000),
        redirect: 'follow',
        headers,
      });
      if (!response.ok) continue;
      const arr = await response.arrayBuffer();
      if (!arr.byteLength) continue;
      return Buffer.from(arr);
    } catch {
      continue;
    }
  }

  return null;
}

async function drawExerciseCard(doc, state, exercise, index) {
  const bounds = contentBounds(doc);
  const hasImageSlot = Boolean(String(exercise?.imagen_url || '').trim());
  const imageBuffer = hasImageSlot ? await fetchImageBuffer(exercise.imagen_url) : null;
  const pad = 14;
  const gap = hasImageSlot ? 16 : 0;
  const imageWidth = hasImageSlot ? 118 : 0;
  const imageHeight = hasImageSlot ? 88 : 0;
  const innerWidth = bounds.width - (pad * 2);
  const textWidth = innerWidth - (hasImageSlot ? imageWidth + gap : 0);

  const order = exercise?.orden || index + 1;
  const title = `${order}. ${safeText(exercise?.nombre || 'Ejercicio')}`;
  const area = exercise?.zona_corporal ? `Zona corporal: ${safeText(exercise.zona_corporal)}` : '';
  const pauta = [
    exercise?.series ? `Series: ${exercise.series}` : null,
    exercise?.repeticiones ? `Repeticiones: ${exercise.repeticiones}` : null,
    exercise?.duracion_segundos ? `Duracion: ${exercise.duracion_segundos}s` : null,
  ].filter(Boolean).join(' | ');
  const procedure = normalizeParagraph(exercise?.procedimiento || exercise?.descripcion, 'Sin procedimiento detallado.');
  const why = normalizeParagraph(exercise?.why, '');
  const cautions = normalizeList(exercise?.cautions);

  const titleHeight = measureText(doc, title, textWidth, 12, 'Helvetica-Bold', 2);
  const areaHeight = area ? measureText(doc, area, textWidth, 9, 'Helvetica-Bold', 2) + 4 : 0;
  const pautaHeight = pauta ? measureText(doc, pauta, textWidth, 9.5, 'Helvetica', 2) + 4 : 0;
  const procedureHeight = measureText(doc, procedure, textWidth, 10, 'Helvetica', 3) + 4;
  const whyHeight = why ? measureText(doc, `Motivo clinico: ${why}`, textWidth, 9.5, 'Helvetica', 3) + 4 : 0;
  const cautionHeight = cautions.length ? measureText(doc, `Precauciones: ${cautions.join('; ')}`, textWidth, 9.5, 'Helvetica', 3) + 4 : 0;
  const textHeight = titleHeight + areaHeight + pautaHeight + procedureHeight + whyHeight + cautionHeight;
  const cardHeight = Math.max(132, (pad * 2) + textHeight, hasImageSlot ? (pad * 2) + imageHeight : 0);

  ensureSpace(doc, state, cardHeight + 12);

  drawRoundedPanel(doc, bounds.left, state.y, bounds.width, cardHeight, COLORS.surface, COLORS.line, 16);
  drawRoundedPanel(doc, bounds.left, state.y, 7, cardHeight, '#dbeafe', '#dbeafe', 16);

  const textX = bounds.left + pad + 4;
  let cursorY = state.y + pad;

  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.ink);
  doc.text(title, textX, cursorY, { width: textWidth, lineGap: 2 });
  cursorY += titleHeight + 4;

  if (area) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.accent);
    doc.text(area, textX, cursorY, { width: textWidth, lineGap: 2 });
    cursorY += areaHeight;
  }

  if (pauta) {
    doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.muted);
    doc.text(pauta, textX, cursorY, { width: textWidth, lineGap: 2 });
    cursorY += pautaHeight;
  }

  cursorY += drawParagraph(doc, procedure, textX, cursorY, textWidth, 10, COLORS.ink, 3);
  cursorY += 4;

  if (why) {
    cursorY += drawParagraph(doc, `Motivo clinico: ${why}`, textX, cursorY, textWidth, 9.5, COLORS.muted, 3);
    cursorY += 4;
  }

  if (cautions.length) {
    cursorY += drawParagraph(doc, `Precauciones: ${cautions.join('; ')}`, textX, cursorY, textWidth, 9.5, COLORS.warning, 3, 'Helvetica-Bold');
  }

  if (hasImageSlot) {
    const imageX = bounds.left + bounds.width - pad - imageWidth;
    const imageY = state.y + pad;
    drawRoundedPanel(doc, imageX, imageY, imageWidth, imageHeight, '#f8fafc', COLORS.line, 12);

    if (imageBuffer) {
      try {
        doc.image(imageBuffer, imageX + 6, imageY + 6, {
          fit: [imageWidth - 12, imageHeight - 12],
          align: 'center',
          valign: 'center',
        });
      } catch {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted);
        doc.text('Imagen no disponible', imageX + 10, imageY + 34, { width: imageWidth - 20, align: 'center' });
      }
    } else {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted);
      doc.text('Imagen no disponible', imageX + 10, imageY + 34, { width: imageWidth - 20, align: 'center' });
    }
  }

  state.y += cardHeight + 12;
}

export async function buildExerciseReportPdfBuffer(payload = {}) {
  return await new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 42, bottom: 42, left: 42, right: 42 },
        info: {
          Title: 'Informe de ejercicios - Fisio IA Agent',
          Author: 'Fisio IA Agent',
          Subject: 'Informe clinico de ejercicios',
        },
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const state = { y: doc.page.margins.top, pageNumber: 1 };
      const bounds = contentBounds(doc);
      const exercises = Array.isArray(payload?.exercises) ? payload.exercises : [];
      const coverage = payload?.image_coverage || {};
      const dateText = new Date().toLocaleString('es-ES');
      const patientLabel = safeText(payload?.patient_name || payload?.patient_id || 'Sin paciente');
      const redFlags = payload?.red_flags || {};
      const redFlagItems = normalizeList(redFlags?.items).join(', ');
      const recommendationId = safeText(payload?.recommendation_id, '-');
      const requestId = safeText(payload?.request_id, '-');

      drawPageChrome(doc, state.pageNumber);
      const heroTitle = 'Informe profesional de ejercicios';
      const heroSubtitle = 'Resumen estructurado para revisar, exportar y compartir con criterio clinico.';
      const heroTextWidth = bounds.width - 210;
      doc.font('Helvetica-Bold').fontSize(20);
      const heroTitleHeight = doc.heightOfString(heroTitle, { width: heroTextWidth, lineGap: 2 });
      doc.font('Helvetica').fontSize(10.5);
      const heroSubtitleHeight = doc.heightOfString(heroSubtitle, { width: heroTextWidth, lineGap: 3 });
      const heroHeight = Math.max(116, 24 + heroTitleHeight + 10 + heroSubtitleHeight + 18);

      drawRoundedPanel(doc, bounds.left, state.y, bounds.width, heroHeight, COLORS.hero, COLORS.heroGlow, 22);
      doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.white);
      doc.text(heroTitle, bounds.left + 20, state.y + 18, { width: heroTextWidth, lineGap: 2 });
      doc.font('Helvetica').fontSize(10.5).fillColor('#dbeafe');
      doc.text(heroSubtitle, bounds.left + 20, state.y + 18 + heroTitleHeight + 8, { width: heroTextWidth, lineGap: 3 });

      drawRoundedPanel(doc, bounds.right - 160, state.y + 16, 140, 72, '#ffffff', '#cbd5e1', 16);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted);
      doc.text('FECHA', bounds.right - 146, state.y + 28, { characterSpacing: 1.2 });
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.ink);
      doc.text(dateText, bounds.right - 146, state.y + 40, { width: 112 });
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted);
      doc.text('RECOMENDACION', bounds.right - 146, state.y + 56, { characterSpacing: 1.2 });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink);
      doc.text(shortText(recommendationId, 24), bounds.right - 146, state.y + 68, { width: 112 });

      state.y += heroHeight + 18;
      drawMetricRow(doc, state, payload);

      drawSectionHeading(doc, state, 'Contexto clinico', 'Resumen');
      drawInfoPanel(doc, state, 'Paciente', `${patientLabel} | ID interno: ${safeText(payload?.patient_id, '-')}`, 'accent');
      drawInfoPanel(doc, state, 'Sintomas reportados', safeText(payload?.symptom_summary, 'No informado'), 'neutral');
      drawInfoPanel(doc, state, 'Criterio de seleccion', safeText(payload?.selection_rationale, 'No informado'), 'neutral');
      drawInfoPanel(
        doc,
        state,
        'Red flags',
        redFlags?.present
          ? `Se recomienda valorar derivacion medica. ${redFlagItems || 'Hay alertas clinicas marcadas.'}`
          : (redFlagItems || 'Sin alertas rojas detectadas en la evaluacion.'),
        redFlags?.present ? 'danger' : 'success'
      );

      drawSectionHeading(doc, state, `Plan terapeutico (${exercises.length} ejercicios)`, 'Rutina');
      if (!exercises.length) {
        drawInfoPanel(doc, state, 'Estado del plan', 'No hay ejercicios disponibles en la recomendacion actual.', 'warning');
      }

      for (let index = 0; index < exercises.length; index += 1) {
        await drawExerciseCard(doc, state, exercises[index], index);
      }

      drawSectionHeading(doc, state, 'Mensajes de apoyo', 'Comunicacion');
      drawInfoPanel(doc, state, 'Mensaje para paciente', safeText(payload?.message_to_patient, '-'), 'success');
      drawInfoPanel(doc, state, 'Nota para fisioterapeuta', safeText(payload?.message_to_therapist, '-'), 'accent');
      drawInfoPanel(
        doc,
        state,
        'Trazabilidad',
        `Solicitud: ${requestId} | Cobertura imagen: ${coverage?.total ? `${coverage.with_image || 0}/${coverage.total}` : 'Sin dato'}`,
        'neutral'
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}


