// Optional AI layer for the booking assistant: it only reads the patient's words and rewords the
// backend's reply. It never decides availability, bookings, the 24 h rule or states, and anything
// it returns is validated against the backend's own text; on failure the deterministic reply stands.
import { normalizeAppointmentText, parseNaturalAppointmentSlots } from './appointment-text.js';

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const INTENTS = { reservar: 'book', consultar: 'list', cambiar: 'reschedule', anular: 'cancel', hablar_clinica: 'callback', saludo: 'menu', agradecimiento: 'thanks', otro: null };
const PARTS = ['manana', 'tarde'];

export const bookingAiEnabled = () => /^(1|true|yes|si)$/i.test(String(process.env.BOOKING_AI_ENABLED || '').trim())
  && Boolean(process.env.OPENAI_API_KEY?.trim());
const timeoutMs = () => Math.min(Math.max(Number(process.env.BOOKING_AI_TIMEOUT_MS) || 4000, 500), 10000);

async function chat(messages, maxTokens, temperature) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY.trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.BOOKING_AI_MODEL?.trim() || 'gpt-4o-mini', messages, max_tokens: maxTokens,
      temperature, response_format: { type: 'json_object' }, store: false }),
    signal: AbortSignal.timeout(timeoutMs()),
  });
  if (!response.ok) throw new Error(`openai_${response.status}`);
  const content = (await response.json())?.choices?.[0]?.message?.content;
  return JSON.parse(String(content || ''));
}

const warn = (step, reason) => console.warn(`[booking-ai] ${step} descartado: ${reason}`);

// Buttons, codes, numbers, hours and the literal confirmations never go to the model.
export function shouldInterpret(text) {
  const value = normalizeAppointmentText(text).trim();
  if (!value || value.length > 600 || !/\p{L}{3,}/u.test(value)) return false;
  if (/^\/?(vincular|start)\b/.test(value)) return false;
  if (/^(confirmar|confirmo|si|no|baja|stop|cancelar|otro dia|que me llamen|reservar cita|mis citas|cambiar cita|anular cita|menu|ayuda|ok|vale|gracias)$/.test(value)) return false;
  return !/^(?:opcion\s+)?\d{1,2}$|^(?:a\s+las?\s+)?\d{1,2}:\d{2}$|^\d{4}-\d{2}-\d{2}$/.test(value);
}

const INTERPRET_PROMPT = `Clasificas mensajes de pacientes de una clínica de fisioterapia que escriben a su asistente de citas.
Devuelve solo JSON: {"intent": "reservar|consultar|cambiar|anular|hablar_clinica|saludo|agradecimiento|otro", "day": "texto o null", "part_of_day": "manana|tarde|null", "time": "HH:MM o null", "urgent": true|false, "worried": true|false}.
- intent: lo que pide. "reservar" incluye pedir cita, hora o que le vean o atiendan, y preguntar si hay hueco o disponibilidad ("¿tenéis algo el jueves?", "¿hay sitio mañana?"). Si solo da o repite un día u hora ("el jueves por la tarde", "ya te he dicho que el lunes"), es "reservar". "consultar" = solo si pregunta por SUS citas ya reservadas. "cambiar" = mover una cita que ya tiene. "hablar_clinica" = solo si pide expresamente hablar con la clínica o con la fisioterapeuta o que le llamen. Si no está claro, "otro".
- day: el día que quiere para la cita (en un cambio, el día NUEVO, no el de la cita que ya tiene), copiado tal como lo escribe, sin calcular fechas: "el lunes", "mañana", "pasado mañana", "el 22 de octubre". null si no lo dice.
- part_of_day: "manana" o "tarde" solo si lo dice. time: solo si dice una hora concreta, en formato 24 h.
- urgent: true si describe síntomas potencialmente graves (dolor en el pecho, dificultad para respirar, pérdida brusca de fuerza o sensibilidad, pérdida de control de esfínteres, desmayo, golpe fuerte o posible fractura, fiebre alta con dolor de espalda). No diagnostiques.
- worried: true si expresa dolor, preocupación, enfado o una situación delicada.
Nunca confirmes nada: solo clasificas.`;

const ISO_DATE = /\b(\d{4}-\d{2}-\d{2})\b/;
// The model only copies the day as written; the backend's own parser turns it into a date.
const dayToDate = (day) => {
  if (typeof day !== 'string' || !day.trim() || day.length > 60) return null;
  const iso = day.match(ISO_DATE)?.[1];
  if (iso) return iso;
  const parsed = parseNaturalAppointmentSlots(day);
  if (parsed.slotStart) return parsed.slotStart.slice(0, 10);
  return parsed.parsedYear ? `${parsed.parsedYear}-${String(parsed.parsedMonth).padStart(2, '0')}-${String(parsed.parsedDay).padStart(2, '0')}` : null;
};
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// The model sees only the patient's message and today's date: no name, phone or record.
export async function interpretMessage(text, { today, maxDate }) {
  if (!bookingAiEnabled() || !shouldInterpret(text)) return null;
  let raw;
  try {
    raw = await chat([{ role: 'system', content: INTERPRET_PROMPT },
      { role: 'user', content: `Mensaje del paciente: ${JSON.stringify(String(text).slice(0, 600))}` }], 120, 0);
  } catch (error) { warn('interpretación', error.name === 'TimeoutError' ? 'timeout' : error.message); return null; }
  if (!raw || typeof raw !== 'object' || !Object.hasOwn(INTENTS, raw.intent)) { warn('interpretación', 'formato'); return null; }
  const resolved = dayToDate(raw.day);
  const date = resolved && resolved >= today && resolved <= maxDate ? resolved : null;
  return {
    intent: INTENTS[raw.intent],
    date,
    partOfDay: PARTS.includes(raw.part_of_day) ? raw.part_of_day : null,
    time: typeof raw.time === 'string' && HHMM.test(raw.time) ? raw.time : null,
    urgent: raw.urgent === true,
    worried: raw.worried === true || raw.urgent === true,
  };
}

// Safety net that works without the model.
const URGENT = /\b(dolor (?:fuerte |intenso )?(?:en el|del) pecho|dolor toracico|no puedo respirar|me cuesta respirar|me falta el aire|dificultad para respirar|perdida (?:brusca )?de (?:fuerza|sensibilidad)|no siento (?:las piernas|el brazo|la pierna|los brazos)|no puedo mover (?:el|la|los|las) (?:brazo|pierna|piernas|brazos)|no controlo (?:la orina|el pis|los esfinteres)|me he desmayado|desmayo|paralisis|se me ha dormido (?:media cara|medio cuerpo)|fiebre alta|posible fractura|me he roto|hueso roto|golpe (?:muy )?fuerte en la cabeza)\b/;
export const urgentByKeywords = (text) => URGENT.test(normalizeAppointmentText(text));
export const URGENT_NOTICE = 'Lo que describes puede necesitar atención médica urgente. Si es así, no esperes a la cita: llama al 112 o acude a urgencias.';

const COMPOSE_PROMPT = `Eres el asistente virtual de citas de la clínica de fisioterapia. El sistema de la clínica ya ha decidido qué responder (MENSAJE BASE); tú lo dices como lo diría una recepcionista amable, cercana y resolutiva que escribe por chat (Telegram/WhatsApp). Que no suene a máquina ni a plantilla.
Reglas estrictas:
- Conserva TODOS los datos del mensaje base exactamente igual: fechas, horas, números, teléfonos, emails, estados y palabras en MAYÚSCULAS o entre «». No añadas ningún dato, hora, fecha ni número nuevo.
- No digas que una cita está reservada, confirmada, cambiada, anulada o registrada, ni que te llamarán o que la clínica está avisada, salvo que el mensaje base lo diga. No prometas nada que el mensaje base no diga.
- Si el mensaje base hace una pregunta o pide una acción (pulsar CONFIRMAR, elegir una hora, escribir un dato), mantenla al final.
- Nunca diagnostiques, recomiendes tratamientos o medicación ni prometas resultados. No afirmes ser humano ni ser la fisioterapeuta.
Estilo:
- Tono "nuevo": elegante, profesional y acogedor, sin familiaridades ni emojis. Tono "habitual": cercano, simpático y espontáneo; como mucho un emoji ocasional, y ninguno si el paciente está preocupado o tiene dolor.
- Responde primero a lo que acaba de decir el paciente y después da el mensaje base. Si saluda o pregunta "¿qué tal?", devuelve el saludo con naturalidad. Si se disculpa, agradece o comenta algo, reconócelo en pocas palabras. Si pregunta algo que el mensaje base no responde (precio, dirección, tratamientos, aparcamiento…), di con amabilidad que eso se lo puede aclarar la clínica, sin inventar nada, y sigue con el mensaje base.
- Mira tus_respuestas_anteriores: no vuelvas a saludar si ya lo hiciste, no repitas las mismas aperturas ("¡Perfecto!", "¡Genial!", "Claro") ni las mismas frases. Varía.
- No tranquilices ("No te preocupes", "aquí estoy para ayudarte") si el paciente no se ha disculpado ni ha mostrado preocupación.
- Si el paciente expresa dolor o preocupación, muestra comprensión breve y sencilla, sin dramatizar. Anular o cambiar una cita es algo normal: no lo lamentes salvo que el paciente exprese un problema.
- Usa el nombre del paciente solo si te lo dan (nombre_paciente) y como mucho una vez. No uses "hoy", "mañana" ni días de la semana que no estén en el mensaje base. No hagas preguntas que el mensaje base no haga.
- Frases cortas y naturales, como en un chat. Sin rellenos ("Entiendo tu solicitud", "Puedo ayudarte con eso", "Claro, puedo ayudarte"). Evita fórmulas de formulario: "Has seleccionado", "Actualmente", "operación", "registradas", "Por favor, elija". Conserva las listas numeradas del mensaje base.
Ejemplos (no los copies literalmente):
- habitual, nombre Antonio, paciente "Hola! qué tal?", base "Hola, soy el asistente virtual de citas de X. ¿En qué te puedo ayudar?" -> "¡Hola, Antonio! Muy bien, gracias. ¿En qué te ayudo? 🙂"
- nuevo, paciente con dolor, base "¿Qué día te vendría bien? Puedes decirme, por ejemplo, «mañana» o «el lunes»." -> "Vaya, siento que estés así. Vamos a buscarte un hueco en la clínica. ¿Qué día te vendría bien? Puedes decirme, por ejemplo, «mañana» o «el lunes»."
- habitual, paciente "perdona que no fui ayer", base "No tienes ninguna cita próxima. ¿Quieres que busquemos una?" -> "¡No te preocupes! Ahora mismo no tienes ninguna cita próxima. ¿Quieres que busquemos una?"
- nuevo, paciente "¿cuánto cuesta la sesión?", base "Perdona, no te he entendido bien. ¿Quieres pedir una cita, ver las tuyas, cambiarla o anularla?" -> "Eso te lo puede aclarar directamente la clínica. Por aquí puedo ayudarte con tus citas: ¿quieres pedir una, ver las tuyas, cambiarla o anularla?"
Devuelve solo JSON: {"text": "..."}`;

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
// Fillers the model keeps adding despite the prompt; removing them never changes a fact.
export const tidyComposition = (text) => String(text)
  .replace(/(^|[.!?]\s+)(?:entiendo tu (?:solicitud|petición)|claro,? puedo ayudarte con eso)[.,]\s*/giu, '$1')
  .replace(/\bactualmente,?\s+/giu, '')
  .replace(/(^|[.!?]\s+)([¡¿]?)(\p{Ll})/gu, (_match, before, mark, letter) => before + mark + letter.toUpperCase())
  .trim();
const CLAIM = /\b(confirmad[ao]s?|reservad[ao]s?|registrad[ao]s?|anulad[ao]s?|cancelad[ao]s?|cambiad[ao]s?|modificad[ao]s?|agendad[ao]s?|apuntad[ao]s?|programad[ao]s?|guardad[ao]s?|he (?:reservado|confirmado|anulado|cancelado|cambiado|registrado|apuntado|guardado|modificado)|hemos (?:reservado|confirmado|anulado|cancelado|cambiado|registrado|apuntado|avisado)|llamaremos|llamara|llamaran|te llamamos|avisad[ao]s?|avisaremos|hemos avisado|te confirmaremos|confirmaremos)\b/g;
const CLINICAL = /\b(diagnostic\w*|tendinitis|hernia|contractura|ciatica|lumbalgia|esguince|ibuprofeno|paracetamol|antiinflamatori\w*|analgesic\w*|nolotil|enantyum|reposo absoluto|aplica(?:te)? (?:hielo|calor)|te curar\w*|te pondras bien|seguro que no es nada)\b/;
const HUMAN = /\b(soy (?:carla|una persona|humano|humana|la fisioterapeuta|la recepcionista))\b/;
const CALENDAR_WORDS = /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|hoy|pasado manana)\b/g;
const plain = (text) => normalizeAppointmentText(text);
const tokens = (text, regex) => new Set(String(text).match(regex) || []);
const digitRuns = (text) => tokens(String(text).replace(/(\d)[ .](?=\d)/g, '$1'), /\d+/g);
const subset = (a, b) => [...a].every(item => b.has(item));

// Rejects any reply that adds or drops facts, claims an outcome the backend did not report,
// gives clinical advice or impersonates a person. Returns the reason or null when valid.
export function rejectComposition(base, candidate) {
  const text = String(candidate || '').trim();
  if (!text) return 'vacío';
  if (text.length > Math.max(900, base.length * 1.8)) return 'largo';
  const baseDigits = digitRuns(base); const textDigits = digitRuns(text);
  if (!subset(textDigits, baseDigits)) return 'número nuevo';
  // The year may be left implicit; any other number must be kept.
  if (![...baseDigits].every(item => textDigits.has(item) || /^20\d\d$/.test(item))) return 'número omitido';
  if (!subset(tokens(plain(text), CALENDAR_WORDS), tokens(plain(base), CALENDAR_WORDS))) return 'día o mes nuevo';
  const baseClaims = tokens(plain(base), CLAIM);
  if ([...tokens(plain(text), CLAIM)].some(word => !baseClaims.has(word))) return 'afirmación no respaldada';
  if (!subset(tokens(base, /\b[A-ZÁÉÍÓÚÑ]{4,}\b/g), tokens(text, /\b[A-ZÁÉÍÓÚÑ]{4,}\b/g))) return 'palabra clave omitida';
  if (!subset(tokens(base, /«[^»]+»/g), tokens(text, /«[^»]+»/g))) return 'botón omitido';
  if (/https?:\/\/|www\.|@/.test(text) && !/https?:\/\/|www\.|@/.test(base)) return 'enlace o email nuevo';
  if (CLINICAL.test(plain(text)) && !CLINICAL.test(plain(base))) return 'consejo clínico';
  if (HUMAN.test(plain(text))) return 'se presenta como persona';
  if ((text.match(/\?/g) || []).length > (base.match(/\?/g) || []).length + 1) return 'preguntas nuevas';
  return null;
}

export async function composeReply({ base, tone, worried = false, firstName = null, patientText = '', previous = [] }) {
  if (!bookingAiEnabled() || !base) return null;
  // The name once in a while: not again while it is still in the last replies.
  const nameUsed = Boolean(firstName) && previous.some(reply => String(reply).includes(firstName));
  const facts = { tono: tone, paciente_preocupado: worried, nombre_paciente: tone === 'habitual' && !nameUsed ? firstName : null,
    mensaje_del_paciente: String(patientText || '').slice(0, 400), tus_respuestas_anteriores: previous.slice(-RECENT_REPLIES), mensaje_base: base };
  let raw;
  try {
    raw = await chat([{ role: 'system', content: COMPOSE_PROMPT }, { role: 'user', content: JSON.stringify(facts) }], 400, 0.7);
  } catch (error) { warn('redacción', error.name === 'TimeoutError' ? 'timeout' : error.message); return null; }
  let text = typeof raw?.text === 'string' ? raw.text.trim() : '';
  if (tone !== 'habitual' || worried) text = text.replace(EMOJI, '').replace(/[ \t]{2,}/g, ' ').trim();
  text = tidyComposition(text);
  const reason = rejectComposition(base, text);
  if (reason) { warn('redacción', reason); return null; }
  return text;
}

// Last replies per conversation, so the wording can vary and a greeting is not repeated. Memory only:
// they hold dates and hours the backend wrote, never the patient's record, and are lost on restart.
const RECENT_REPLIES = 3;
const RECENT_TTL_MS = 30 * 60 * 1000;
const RECENT_MAX_CHATS = 500;
const recent = new Map();
export function recentReplies(key, now = Date.now()) {
  const entry = key ? recent.get(key) : null;
  return entry && now - entry.at < RECENT_TTL_MS ? entry.texts : [];
}
export function rememberReply(key, text, now = Date.now()) {
  if (!key || !text) return;
  const texts = [...recentReplies(key, now), String(text).slice(0, 500)].slice(-RECENT_REPLIES);
  recent.delete(key);
  recent.set(key, { at: now, texts });
  if (recent.size > RECENT_MAX_CHATS) recent.delete(recent.keys().next().value);
}
