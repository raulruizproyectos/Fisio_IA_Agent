const input = ($json.body && typeof $json.body === 'object') ? $json.body : $json;
const text = String(input.text || input.message_text || input.texto_mensaje || '').trim();
const requestId = input.request_id || `req_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const role = input.role || 'professional';
const channel = input.channel || 'web';
const patientId = input.paciente_id || input.patient_id || null;
const professionalId = input.profesional_id || input.professional_id || null;

const normalizeText = (value = '') => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const textLower = normalizeText(text);

const collectMatches = (rules = []) => {
  const matches = [];
  for (const rule of rules) {
    if (!rule?.pattern) continue;
    if (!rule.pattern.test(textLower)) continue;
    matches.push(rule.value);
  }
  return [...new Set(matches)];
};

const appointmentKeywords = /\b(cita|agendar|agenda|reservar|reserva|hueco|hora|calendario|consulta|visita|disponibilidad)\b/i;
const exerciseKeywords = /\b(ejercicio|ejercicios|estiramiento|estiramientos|rutina|fortalecimiento|plan|tabla|pauta|rehabilitacion|rehab|entrenar)\b/i;
const mobilityAsExerciseContext = /\b(movilidad)\b/i;
const exerciseRequestContext = /\b(necesito|quiero|preparar|manda|manda(?:me)?|recomienda|dame|ponme|plan|rutina|tabla|pauta|ejercicios|entrenar|trabajar)\b/i;
const symptomKeywords = /\b(dolor|dolores|sintoma|sintomas|molestia|molestias|lesion|evolucion|seguimiento|mejora|empeorado|noto|duele|pinchazo|rigidez|inflamacion|carga)\b/i;

const locationRules = [
  { value: 'cervical', pattern: /\b(cervical|cuello|trapecio)\b/i },
  { value: 'hombro', pattern: /\b(hombro|manguito rotador)\b/i },
  { value: 'espalda_dorsal', pattern: /\b(dorsal|espalda alta|omoplato|escapula)\b/i },
  { value: 'lumbar', pattern: /\b(lumbar|lumbares|espalda baja|lumbalgia)\b/i },
  { value: 'cadera', pattern: /\b(cadera|gluteo|ingle)\b/i },
  { value: 'rodilla', pattern: /\b(rodilla|rotula|menisco)\b/i },
  { value: 'tobillo', pattern: /\b(tobillo)\b/i },
  { value: 'pie', pattern: /\b(pie|planta|talon)\b/i },
  { value: 'codo', pattern: /\b(codo)\b/i },
  { value: 'muneca', pattern: /\b(muneca|mano|dedos)\b/i },
  { value: 'pecho', pattern: /\b(pecho|torax)\b/i },
  { value: 'cabeza', pattern: /\b(cabeza|cefalea|migra)\b/i },
];

const aggravatingFactorRules = [
  { value: 'al_girar', pattern: /\b(al girar|girando|girar el cuello|giro)\b/i },
  { value: 'al_caminar', pattern: /\b(al caminar|caminando|al andar)\b/i },
  { value: 'al_levantar', pattern: /\b(al levantar|levantando|coger peso|cargar peso)\b/i },
  { value: 'al_agacharse', pattern: /\b(al agach|agachandome|inclinarme)\b/i },
  { value: 'al_sentarse', pattern: /\b(al sentar|sentado|al incorporarme)\b/i },
  { value: 'al_dormir', pattern: /\b(al dormir|por la noche|nocturno)\b/i },
  { value: 'al_mover', pattern: /\b(al mover|moviendo|al estirar|al flexionar|al extender)\b/i },
  { value: 'rigidez_o_menos_movilidad', pattern: /\b(rigidez|menos movilidad|limitacion|rango de movimiento|bloqueo)\b/i },
  { value: 'en_reposo', pattern: /\b(en reposo|parado|sin moverme)\b/i },
];

const durationRules = [
  { value: 'hoy', pattern: /\b(hoy|esta manana|esta tarde|esta noche)\b/i },
  { value: 'ayer', pattern: /\b(ayer|anoche)\b/i },
  { value: 'dias', pattern: /\b(desde hace \d+ dias?|hace \d+ dias?|unos dias?|varios dias?)\b/i },
  { value: 'semanas', pattern: /\b(desde hace \d+ semanas?|hace \d+ semanas?|unas semanas?|varias semanas?)\b/i },
  { value: 'meses', pattern: /\b(desde hace \d+ meses?|hace \d+ meses?|unos meses?|varios meses?)\b/i },
  { value: 'desde_evento', pattern: /\b(desde que|desde el|desde la|tras|despues de)\b/i },
];

const anatomicalLocations = collectMatches(locationRules);
const aggravatingFactors = collectMatches(aggravatingFactorRules);
const durationMarkers = collectMatches(durationRules);

const triageSignals = {
  anatomical_location: anatomicalLocations,
  aggravating_factors: aggravatingFactors,
  duration_markers: durationMarkers,
};

const missingTriageFields = [];
if (anatomicalLocations.length === 0) missingTriageFields.push('anatomical_location');
if (durationMarkers.length === 0) missingTriageFields.push('duration');
if (aggravatingFactors.length === 0) missingTriageFields.push('aggravating_factors');

const triageDetailScore = [anatomicalLocations.length, durationMarkers.length, aggravatingFactors.length]
  .filter((count) => count > 0)
  .length;

let route = 'unknown';
let confidence = 0.5;
let reply = 'He recibido tu mensaje. Lo estoy analizando...';

if (appointmentKeywords.test(textLower)) {
  route = 'appointment';
  confidence = 0.95;
  reply = 'He recibido tu solicitud de cita. Ahora mismo compruebo la agenda y te confirmo las opciones disponibles.';
} else if (exerciseKeywords.test(textLower) || (mobilityAsExerciseContext.test(textLower) && exerciseRequestContext.test(textLower))) {
  route = 'exercise';
  confidence = 0.95;
  reply = 'Entendido. Voy a procesar el caso y a preparar un plan de ejercicios personalizado. Esto tomara unos segundos...';
} else if (text.length <= 2) {
  route = 'unknown';
  confidence = 0.1;
  reply = 'No he podido entender el mensaje. Puedes darme mas detalles?';
} else if (symptomKeywords.test(textLower)) {
  if (triageDetailScore >= 2) {
    route = 'session_note';
    confidence = 0.86;
    reply = 'He registrado la evolucion clinica en el historial para tenerla en cuenta durante el tratamiento.';
  } else {
    route = 'triage_needed';
    confidence = 0.9;
    reply = 'Para orientarte mejor necesito tres datos: zona exacta, desde cuando te pasa y que movimiento o situacion lo empeora. Ejemplo: dolor lumbar desde ayer al levantarme.';
  }
} else {
  route = 'fallback';
  confidence = 0.3;
  reply = 'He anotado tu mensaje en el sistema para revisarlo en detalle.';
}

return [{
  json: {
    ok: true,
    request_id: requestId,
    role,
    route,
    confidence,
    reply_text: reply,
    intent_hint: route,
    normalized_payload: {
      text,
      channel,
      patient_id: patientId,
      professional_id: professionalId,
      triage: {
        ...triageSignals,
        missing_fields: missingTriageFields,
        needs_clarification: route === 'triage_needed',
      },
    },
    received: {
      channel,
      paciente_id: patientId,
      profesional_id: professionalId,
      text,
    },
  },
}];
