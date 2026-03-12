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

const ZONA_LABELS = {
  cervical: 'Cervical / Cuello',
  hombro_brazo: 'Hombro y brazo',
  espalda: 'Espalda / Lumbar',
  cadera: 'Cadera / Glúteo',
  rodilla: 'Rodilla',
  tobillo_pie: 'Tobillo y pie',
  respiratorio: 'Respiratorio',
  general: 'General',
};

/** Remove characters outside Latin-1 range that PDFKit Helvetica cannot render */
function safePdfText(value) {
  const str = String(value ?? '').trim();
  // Replace emoji and chars above U+00FF with safe equivalents or empty
  return str
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')   // emoji blocks
    .replace(/[\u2700-\u27BF]/g, '')            // dingbats
    .replace(/[\u2600-\u26FF]/g, '')            // misc symbols
    .replace(/[\u2190-\u21FF]/g, '->')          // arrows -> ->
    .replace(/[\u2022\u2023\u25AA\u25AB]/g, '-') // bullets -> -
    .replace(/[\u2013\u2014]/g, '-')            // en/em dash -> -
    .replace(/[\u2018\u2019]/g, "'")            // curly single quotes
    .replace(/[\u201C\u201D]/g, '"')            // curly double quotes
    .replace(/[\u2026]/g, '...')                // ellipsis
    .replace(/[^\x00-\xFF]/g, '')               // strip remaining non-Latin-1
    .replace(/\s+/g, ' ')
    .trim();
}

function safeText(value, fallback = '-') {
  if (Array.isArray(value)) {
    const joined = value.map((item) => safePdfText(String(item ?? ''))).filter(Boolean).join(', ');
    return joined || fallback;
  }
  const normalized = safePdfText(String(value ?? ''));
  return normalized || fallback;
}

function normalizeParagraph(value, fallback = '') {
  if (Array.isArray(value)) {
    const joined = value.map((item) => safePdfText(String(item ?? ''))).filter(Boolean).join(' ');
    return joined || fallback;
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
  doc.text('Fisio IA Agent | Informe de ejercicios', bounds.left, footerY, { width: bounds.width - 70, lineBreak: false });
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
  const labelText = safePdfText(String(label || '')).toUpperCase();
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
    { label: 'Con imagen', value: coverageValue },
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
  const imageWidth = hasImageSlot ? 120 : 0;
  const imageHeight = hasImageSlot ? 90 : 0;
  const innerWidth = bounds.width - (pad * 2) - 4; // -4 for the accent bar
  const textWidth = innerWidth - (hasImageSlot ? imageWidth + gap : 0);

  const order = exercise?.orden || index + 1;
  const nombre = safeText(exercise?.nombre || 'Ejercicio');
  const title = `${order}. ${nombre}`;

  const zonaRaw = safeText(exercise?.zona_corporal || '', '');
  const zonaLabel = ZONA_LABELS[zonaRaw] || (zonaRaw ? zonaRaw.replace(/_/g, ' ') : '');
  const area = zonaLabel ? `Zona: ${zonaLabel}` : '';

  const pauta = [
    exercise?.series ? `Series: ${exercise.series}` : null,
    exercise?.repeticiones ? `Reps: ${exercise.repeticiones}` : null,
    exercise?.duracion_segundos ? `Duracion: ${exercise.duracion_segundos}s` : null,
  ].filter(Boolean).join('  |  ');

  // Truncate long descriptions to keep cards manageable
  const rawProcedure = normalizeParagraph(exercise?.procedimiento || exercise?.descripcion, '');
  const procedure = truncate(rawProcedure, 480) || 'Sin descripcion detallada.';
  const why = truncate(normalizeParagraph(exercise?.why, ''), 200);
  const cautions = normalizeList(exercise?.cautions).map((c) => truncate(c, 120));

  // Measure each section
  const titleHeight = measureText(doc, title, textWidth, 12, 'Helvetica-Bold', 2);
  const areaHeight = area ? measureText(doc, area, textWidth, 9, 'Helvetica-Bold', 2) + 4 : 0;
  const pautaHeight = pauta ? measureText(doc, pauta, textWidth, 9.5, 'Helvetica', 2) + 6 : 0;
  const procedureHeight = measureText(doc, procedure, textWidth, 10, 'Helvetica', 3) + 6;
  const whyHeight = why ? measureText(doc, `Motivo: ${why}`, textWidth, 9.5, 'Helvetica', 3) + 4 : 0;
  const cautionHeight = cautions.length ? measureText(doc, `Precauc.: ${cautions.join('; ')}`, textWidth, 9.5, 'Helvetica', 3) + 4 : 0;
  const textHeight = titleHeight + areaHeight + pautaHeight + procedureHeight + whyHeight + cautionHeight;

  // Add safety buffer (+24) to prevent overflow
  const cardHeight = Math.max(140, (pad * 2) + textHeight + 24, hasImageSlot ? (pad * 2) + imageHeight + 20 : 0);

  ensureSpace(doc, state, cardHeight + 14);

  // Card background
  drawRoundedPanel(doc, bounds.left, state.y, bounds.width, cardHeight, COLORS.surface, COLORS.line, 16);
  // Accent left bar
  drawRoundedPanel(doc, bounds.left, state.y, 6, cardHeight, '#dbeafe', '#dbeafe', 16);

  const textX = bounds.left + pad + 6;
  let cursorY = state.y + pad;

  // Title
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.ink);
  doc.text(title, textX, cursorY, { width: textWidth, lineGap: 2 });
  cursorY += titleHeight + 4;

  // Zone + pauta on the same row if short enough
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

  // Separator line under pauta
  if (pauta || area) {
    doc.moveTo(textX, cursorY - 2).lineTo(textX + textWidth, cursorY - 2).lineWidth(0.5).strokeColor(COLORS.line).stroke();
    cursorY += 4;
  }

  // Procedure
  cursorY += drawParagraph(doc, procedure, textX, cursorY, textWidth, 10, COLORS.ink, 3);
  cursorY += 4;

  // Clinical reason
  if (why) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted);
    doc.text('MOTIVO CLINICO', textX, cursorY, { characterSpacing: 1 });
    cursorY += 11;
    cursorY += drawParagraph(doc, why, textX, cursorY, textWidth, 9.5, COLORS.muted, 3);
    cursorY += 4;
  }

  // Cautions
  if (cautions.length) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.warning);
    doc.text('PRECAUCIONES', textX, cursorY, { characterSpacing: 1 });
    cursorY += 11;
    cursorY += drawParagraph(doc, cautions.join(' - '), textX, cursorY, textWidth, 9.5, COLORS.warning, 3, 'Helvetica-Bold');
  }

  // Image slot
  if (hasImageSlot) {
    const imageX = bounds.left + bounds.width - pad - imageWidth;
    const imageY = state.y + pad;
    drawRoundedPanel(doc, imageX, imageY, imageWidth, imageHeight, '#f8fafc', COLORS.line, 10);

    if (imageBuffer) {
      try {
        doc.image(imageBuffer, imageX + 5, imageY + 5, {
          fit: [imageWidth - 10, imageHeight - 10],
          align: 'center',
          valign: 'center',
        });
      } catch {
        doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
        doc.text('Sin imagen', imageX + 10, imageY + 36, { width: imageWidth - 20, align: 'center' });
      }
    } else {
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
      doc.text('Sin imagen', imageX + 10, imageY + 36, { width: imageWidth - 20, align: 'center' });
    }
  }

  state.y += cardHeight + 14;
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
      const dateText = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
      const patientLabel = safeText(payload?.patient_name || payload?.patient_id || 'Sin paciente');
      const redFlags = payload?.red_flags || {};
      const redFlagItems = normalizeList(redFlags?.items).join(', ');
      const recommendationId = safeText(payload?.recommendation_id, '-');
      const requestId = safeText(payload?.request_id, '-');

      drawPageChrome(doc, state.pageNumber);

      // --- HERO BLOCK ---
      const heroTitle = 'Informe de ejercicios terapeuticos';
      const heroSubtitle = 'Plan personalizado generado por Fisio IA Agent para revision y seguimiento clinico.';
      const heroTextWidth = bounds.width - 210;
      doc.font('Helvetica-Bold').fontSize(19);
      const heroTitleHeight = doc.heightOfString(heroTitle, { width: heroTextWidth, lineGap: 2 });
      doc.font('Helvetica').fontSize(10);
      const heroSubtitleHeight = doc.heightOfString(heroSubtitle, { width: heroTextWidth, lineGap: 3 });
      const heroHeight = Math.max(112, 22 + heroTitleHeight + 10 + heroSubtitleHeight + 18);

      drawRoundedPanel(doc, bounds.left, state.y, bounds.width, heroHeight, COLORS.hero, COLORS.heroGlow, 22);
      doc.font('Helvetica-Bold').fontSize(19).fillColor(COLORS.white);
      doc.text(heroTitle, bounds.left + 20, state.y + 18, { width: heroTextWidth, lineGap: 2 });
      doc.font('Helvetica').fontSize(10).fillColor('#dbeafe');
      doc.text(heroSubtitle, bounds.left + 20, state.y + 18 + heroTitleHeight + 8, { width: heroTextWidth, lineGap: 3 });

      // Date + ID card inside hero
      drawRoundedPanel(doc, bounds.right - 160, state.y + 16, 140, 72, '#ffffff', '#cbd5e1', 16);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.muted);
      doc.text('FECHA', bounds.right - 146, state.y + 28, { characterSpacing: 1.2 });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink);
      doc.text(dateText, bounds.right - 146, state.y + 39, { width: 112 });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.muted);
      doc.text('ID RECOMENDACION', bounds.right - 146, state.y + 55, { characterSpacing: 1.2 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.ink);
      doc.text(shortText(recommendationId, 22), bounds.right - 146, state.y + 65, { width: 112 });

      state.y += heroHeight + 18;

      // --- METRICS ROW ---
      drawMetricRow(doc, state, payload);

      // --- CLINICAL CONTEXT ---
      drawSectionHeading(doc, state, 'Contexto clinico', 'Resumen');
      drawInfoPanel(doc, state, 'Paciente', `${patientLabel}  |  ID: ${safeText(payload?.patient_id, '-')}`, 'accent');
      drawInfoPanel(doc, state, 'Sintomas referidos', safeText(payload?.symptom_summary, 'No informado'), 'neutral');
      drawInfoPanel(doc, state, 'Criterio de seleccion', safeText(payload?.selection_rationale, 'No informado'), 'neutral');
      drawInfoPanel(
        doc, state, 'Alertas clinicas',
        redFlags?.present
          ? `Valorar derivacion medica. ${redFlagItems || 'Alertas detectadas.'}`
          : (redFlagItems || 'Sin alertas rojas en la evaluacion.'),
        redFlags?.present ? 'danger' : 'success'
      );

      // --- EXERCISE PLAN ---
      drawSectionHeading(doc, state, `Plan terapeutico (${exercises.length} ejercicio${exercises.length !== 1 ? 's' : ''})`, 'Rutina');
      if (!exercises.length) {
        drawInfoPanel(doc, state, 'Estado', 'No hay ejercicios disponibles en esta recomendacion.', 'warning');
      }

      for (let index = 0; index < exercises.length; index += 1) {
        await drawExerciseCard(doc, state, exercises[index], index);
      }

      // --- MESSAGES ---
      drawSectionHeading(doc, state, 'Mensajes y seguimiento', 'Comunicacion');
      drawInfoPanel(doc, state, 'Mensaje para el paciente', safeText(payload?.message_to_patient, '-'), 'success');
      drawInfoPanel(doc, state, 'Nota para el fisioterapeuta', safeText(payload?.message_to_therapist, '-'), 'accent');
      drawInfoPanel(
        doc, state, 'Trazabilidad',
        `Solicitud: ${requestId}  |  Cobertura imagen: ${coverage?.total ? `${coverage.with_image || 0}/${coverage.total}` : 'Sin dato'}`,
        'neutral'
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
