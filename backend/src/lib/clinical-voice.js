import { Buffer } from 'node:buffer';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() || null;
const TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1';
const SYNTHESIS_MODEL = process.env.OPENAI_SYNTHESIS_MODEL || 'gpt-4o-mini';

/**
 * Transcribe un buffer de audio usando OpenAI Whisper API.
 * El audio se procesa en memoria y no se almacena permanentemente.
 */
export async function transcribeAudio({
  buffer,
  filename = 'session-voice.webm',
  mimeType = 'audio/webm',
  timeoutMs = 30000,
}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Buffer de audio inválido o ausente');
  }

  if (buffer.length < 100) {
    throw new Error('El archivo de audio está vacío o es demasiado corto');
  }

  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada en el servidor');
  }

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType || 'audio/webm' }), filename);
  form.append('model', TRANSCRIPTION_MODEL);
  form.append('language', 'es');
  form.append('response_format', 'json');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: form,
      signal: controller.signal,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const errMsg = payload?.error?.message || `Error en transcripción (${response.status})`;
      throw new Error(errMsg);
    }

    const text = String(payload?.text || '').trim();
    if (!text) {
      throw new Error('Transcripción vacía: no se detectó voz audible en el audio');
    }

    return { text };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al transcribir el audio (timeout)');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Síntesis clínica con Human-in-the-loop:
 * Extrae datos estructurados y resumen telegráfico con máxima señal clínica / mínimo texto.
 * NUNCA inventa datos o números no expresados por el clínico.
 */
export async function synthesizeClinicalNote({
  text,
  patientName = null,
  previousNotes = [],
  timeoutMs = 25000,
}) {
  const cleanText = String(text || '').trim();
  if (!cleanText || cleanText.length < 5) {
    throw new Error('El texto proporcionado es demasiado corto para sintetizar una nota clínica');
  }

  // Si no hay clave OpenAI, aplicamos extracción determinista de respaldo
  if (!OPENAI_API_KEY) {
    return fallbackRuleBasedSynthesis(cleanText, previousNotes);
  }

  const systemPrompt = `Eres un asistente clínico de fisioterapia de alto nivel.
Tu tarea es convertir el dictado o transcripción de un fisioterapeuta tras una sesión en una NOTA CLÍNICA CONCISA y extraer sus DATOS ESTRUCTURADOS.

PRINCIPIO: MÁXIMA SEÑAL CLÍNICA / MÍNIMO TEXTO.
REGLAS OBLIGATORIAS:
1. NUNCA inventes números, porcentajes, grados o datos no mencionados explícitamente en el texto.
2. Si el clínico dice "ha pasado de 6 a 4", dolor_eva es 4 y dolor_eva_anterior es 6.
3. Si el clínico solo dice "menos dolor" sin números, dolor_eva es null y describe la cualidad en el resumen.
4. Identifica la zona corporal tratada (ej. "hombro derecho", "lumbar", "rodilla", "cervical").
5. Extrae movilidad, tratamientos aplicados, ejercicios prescritos/realizados, respuesta del paciente y próximo paso.
6. En "evolucion", clasifica exactamente como: "mejora", "estable", "empeora" o "primera_sesion" según lo expresado.
7. Genera un "clinical_summary" telegráfico y profesional de 3 a 5 líneas con formato:
   Dolor: [datos de dolor]
   Tx: [técnicas y tratamientos aplicados]
   Respuesta: [tolerancia y estado post-sesión]
   Plan: [siguiente paso o pauta activa]

Devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura (sin markdown, sin explicaciones):
{
  "clinical_summary": "...",
  "dolor_eva": number | null,
  "dolor_eva_anterior": number | null,
  "zona_corporal": string | null,
  "movilidad": string | null,
  "tratamientos": string[],
  "ejercicios": string[],
  "respuesta": string | null,
  "evolucion": "mejora" | "estable" | "empeora" | "primera_sesion" | null,
  "proximo_paso": string | null
}`;

  const userContent = patientName
    ? `Paciente: ${patientName}\nDictado de la sesión:\n"""${cleanText}"""`
    : `Dictado de la sesión:\n"""${cleanText}"""`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: SYNTHESIS_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Error en síntesis OpenAI (${response.status}): ${errBody.slice(0, 200)}`);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(rawContent);

    return {
      clinical_summary: String(parsed.clinical_summary || cleanText).trim(),
      structured_data: {
        dolor_eva: typeof parsed.dolor_eva === 'number' && parsed.dolor_eva >= 0 && parsed.dolor_eva <= 10 ? parsed.dolor_eva : null,
        dolor_eva_anterior: typeof parsed.dolor_eva_anterior === 'number' && parsed.dolor_eva_anterior >= 0 && parsed.dolor_eva_anterior <= 10 ? parsed.dolor_eva_anterior : null,
        zona_corporal: parsed.zona_corporal ? String(parsed.zona_corporal).trim() : null,
        movilidad: parsed.movilidad ? String(parsed.movilidad).trim() : null,
        tratamientos: Array.isArray(parsed.tratamientos) ? parsed.tratamientos.map(t => String(t).trim()).filter(Boolean) : [],
        ejercicios: Array.isArray(parsed.ejercicios) ? parsed.ejercicios.map(e => String(e).trim()).filter(Boolean) : [],
        respuesta: parsed.respuesta ? String(parsed.respuesta).trim() : null,
        evolucion: ['mejora', 'estable', 'empeora', 'primera_sesion'].includes(parsed.evolucion) ? parsed.evolucion : null,
        proximo_paso: parsed.proximo_paso ? String(parsed.proximo_paso).trim() : null,
      },
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al sintetizar la nota clínica (timeout)');
    }
    // Si falla el parsing o la API, fallback seguro
    return fallbackRuleBasedSynthesis(cleanText);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Síntesis determinista basada en reglas (fallback seguro sin IA).
 */
export function fallbackRuleBasedSynthesis(text, previousNotes = []) {
  const clean = String(text || '').trim();

  // Detectar dolor EVA numérico si existe
  let dolor_eva = null;
  let dolor_eva_anterior = null;

  const evaChangeMatch = clean.match(/(?:de|pasado de)\s*(\d{1,2})\s*(?:a|\/)\s*(\d{1,2})/i);
  if (evaChangeMatch) {
    const prev = parseInt(evaChangeMatch[1], 10);
    const curr = parseInt(evaChangeMatch[2], 10);
    if (prev >= 0 && prev <= 10) dolor_eva_anterior = prev;
    if (curr >= 0 && curr <= 10) dolor_eva = curr;
  } else {
    const singleEvaMatch = clean.match(/(?:eva|dolor|escala)\s*(?:de\s*)?(\d{1,2})(?:\s*\/\s*10)?/i);
    if (singleEvaMatch) {
      const val = parseInt(singleEvaMatch[1], 10);
      if (val >= 0 && val <= 10) dolor_eva = val;
    }
  }

  // Si no se extrajo dolor_eva_anterior del texto pero hay previousNotes, usar la última
  if (dolor_eva_anterior === null && Array.isArray(previousNotes) && previousNotes.length > 0) {
    const lastNote = previousNotes[0];
    if (lastNote?.dolor_eva !== null && lastNote?.dolor_eva !== undefined) {
      dolor_eva_anterior = Number(lastNote.dolor_eva);
    }
  }

  // Detectar zona corporal
  let zona_corporal = null;
  const zones = ['hombro', 'lumbar', 'cervical', 'rodilla', 'tobillo', 'cadera', 'codo', 'muneca', 'espalda', 'cuello'];
  for (const z of zones) {
    if (new RegExp(`\\b${z}\\b`, 'i').test(clean)) {
      zona_corporal = z.toLowerCase();
      break;
    }
  }

  // Detectar evolución
  let evolucion = null;
  if (/mejor|mejoria|menos dolor|baja el dolor|favorable/i.test(clean)) evolucion = 'favorable';
  else if (/igual|estable|sin cambios|mantiene/i.test(clean)) evolucion = 'estable';
  else if (/peor|mas dolor|empeora|aumento/i.test(clean)) evolucion = 'empeora';

  const movilidad = /movilidad/i.test(clean) ? 'Evaluada en sesión' : null;
  const tratamientos = /terapia manual|punción|movilizacion/i.test(clean) ? ['Terapia manual'] : [];
  const ejercicios = /ejercicio|glúteo|isométrico|estiramiento/i.test(clean) ? ['Ejercicios terapéuticos'] : [];
  const respuesta = /mejoría|favorable|alivio/i.test(clean) ? 'Tolerancia favorable con alivio' : null;

  return {
    clinical_summary: clean,
    dolor_eva,
    dolor_eva_anterior,
    zona_corporal,
    movilidad,
    tratamientos,
    ejercicios,
    respuesta,
    evolucion,
    proximo_paso: null,
    structured_data: {
      dolor_eva,
      dolor_eva_anterior,
      zona_corporal,
      movilidad,
      tratamientos,
      ejercicios,
      respuesta,
      evolucion,
      proximo_paso: null,
    },
  };
}

/**
 * Genera el resumen clínico longitudinal (Layer 2) de un paciente
 * a partir de las notas de sesión confirmadas.
 */
export async function generateLongitudinalSummary({
  patientName = 'Paciente',
  notes = [],
  timeoutMs = 20000,
}) {
  if (!Array.isArray(notes) || notes.length === 0) {
    return null;
  }

  // Si solo hay una nota, usamos su propio resumen estructurado
  if (notes.length === 1) {
    const n = notes[0];
    const s = n.structured_data || {};
    const parts = [];
    const zona = n.zona_corporal || s.zona_corporal;
    const dolor = n.dolor_eva ?? s.dolor_eva;
    if (zona) parts.push(`Zona: ${zona}.`);
    if (dolor != null) parts.push(`Dolor actual: EVA ${dolor}/10.`);
    if (n.nota) parts.push(n.nota);
    return parts.join(' ');
  }

  // Ordenar cronológicamente (más antigua a más reciente)
  const sorted = [...notes].sort((a, b) => new Date(a.fecha || a.session_datetime).getTime() - new Date(b.fecha || b.session_datetime).getTime());

  if (!OPENAI_API_KEY) {
    // Generación determinista
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    const firstEva = first.dolor_eva ?? first.structured_data?.dolor_eva;
    const latestEva = latest.dolor_eva ?? latest.structured_data?.dolor_eva;
    const zona = latest.zona_corporal || latest.structured_data?.zona_corporal || first.zona_corporal || 'General';

    let evaProg = '';
    if (firstEva != null && latestEva != null) {
      evaProg = `Evolución dolor: EVA ${firstEva}/10 → ${latestEva}/10. `;
    } else if (latestEva != null) {
      evaProg = `Dolor actual: EVA ${latestEva}/10. `;
    }

    return `${patientName} en seguimiento de ${zona} (${sorted.length} sesiones). ${evaProg}Última sesión: ${latest.nota || 'Registrada'}.`;
  }

  const notesContext = sorted.map((n, idx) => {
    const s = n.structured_data || {};
    const txStr = Array.isArray(s.tratamientos) ? s.tratamientos.join(', ') : (s.tratamientos || 'N/A');
    const eva = n.dolor_eva ?? s.dolor_eva ?? 'N/A';
    const zona = n.zona_corporal || s.zona_corporal || 'N/A';
    const fecha = n.fecha || (n.session_datetime ? String(n.session_datetime).split('T')[0] : 'N/A');
    return `Sesión ${idx + 1} (${fecha}): EVA=${eva}. Zona=${zona}. Tx=${txStr}. Nota: ${n.nota || ''}`;
  }).join('\n');

  const systemPrompt = `Eres un fisioterapeuta elaborando el RESUMEN CLÍNICO LONGITUDINAL de un paciente.
Sintetiza la trayectoria clínica en un resumen ejecutivo ultra-compacto de 3 a 5 líneas con:
- Motivo/Zona principal
- Evolución cuantitativa del dolor (ej. 7→6→4→3/10) si hay datos numéricos
- Evolución de la movilidad y capacidad funcional
- Tratamientos más efectivos recibidos
- Estado actual y pauta activa
NUNCA inventes datos no reflejados en las sesiones.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: SYNTHESIS_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Paciente: ${patientName}\nHistorial de sesiones:\n${notesContext}` },
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
