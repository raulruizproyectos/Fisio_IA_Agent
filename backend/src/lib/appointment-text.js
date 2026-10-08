function extractIsoSlots(messageText = '') {
  const matches = messageText.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/g) || [];
  return {
    slotStart: matches[0] || null,
    slotEnd: matches[1] || null,
  };
}

export function normalizeAppointmentText(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\ba\s+als?\b/g, 'a las')
    .replace(/\ba\s+asl\b/g, 'a las')
    .replace(/\ba\s+lsa\b/g, 'a las')
    .replace(/\ba\s+ls\b/g, 'a las')
    .replace(/\balas\b/g, 'a las')
    .replace(/\s+/g, ' ')
    .trim();
}


export function parseNaturalAppointmentSlots(text = '', reference = new Date()) {
  const iso = extractIsoSlots(text);
  if (iso.slotStart) return iso;

  const MONTHS = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  };
  const DAY_NAMES = {
    lunes: 1, martes: 2, miercoles: 3,
    jueves: 4, viernes: 5, sabado: 6, domingo: 0,
  };

  const t = normalizeAppointmentText(text);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(reference);
  const part = (type) => Number(parts.find(value => value.type === type)?.value);
  const now = new Date(part('year'), part('month') - 1, part('day'), 12);
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const nowDay = now.getDate();
  let day = null, month = null, year = nowYear;

  const monthMatch = t.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/);
  if (monthMatch) {
    day = parseInt(monthMatch[1], 10);
    month = MONTHS[monthMatch[2]];
    if (month < nowMonth || (month === nowMonth && day < nowDay)) year = nowYear + 1;
  }

  if (!day && /\bmanana\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    day = d.getDate();
    month = d.getMonth() + 1;
    year = d.getFullYear();
  }

  if (!day && /\bhoy\b/.test(t)) {
    day = nowDay;
    month = nowMonth;
    year = nowYear;
  }

  if (!day) {
    for (const [name, targetDow] of Object.entries(DAY_NAMES)) {
      if (t.includes(name)) {
        // Intentar extraer número de día explícito después del nombre del día (ej: "martes 14")
        const explicitDayMatch = t.match(new RegExp(`${name}\\s+(\\d{1,2})(?!\\s*[:/h])`));
        const explicitDay = explicitDayMatch ? parseInt(explicitDayMatch[1], 10) : null;
        if (explicitDay && explicitDay >= 1 && explicitDay <= 31) {
          // Buscar en qué mes cae ese día del mes con ese día de semana
          day = explicitDay;
          // Determinar mes: buscar el mes más próximo futuro donde ese día coincida
          let candidate = new Date(now.getFullYear(), now.getMonth(), explicitDay);
          for (let tries = 0; tries < 12; tries++) {
            if (candidate.getDate() === explicitDay && candidate.getDay() === targetDow &&
                (candidate > now || (candidate.getDate() === nowDay && candidate.getMonth() + 1 === nowMonth))) {
              month = candidate.getMonth() + 1;
              year = candidate.getFullYear();
              break;
            }
            candidate = new Date(candidate.getFullYear(), candidate.getMonth() + 1, explicitDay);
          }
          if (!month) { month = now.getMonth() + 1; year = now.getFullYear(); }
        } else {
          const d = new Date(now);
          let daysAhead = targetDow - d.getDay();
          if (daysAhead <= 0) daysAhead += 7;
          d.setDate(d.getDate() + daysAhead);
          day = d.getDate();
          month = d.getMonth() + 1;
          year = d.getFullYear();
        }
        break;
      }
    }
  }

  let hours = null;
  let minutes = 0;
  const timeMatchFull = t.match(/\ba\s+la?s\s+(\d{1,2})(?::(\d{2}))?\b/);
  const timeMatchStd = !timeMatchFull && t.match(/(?<!\d)(\d{1,2}):(\d{2})(?!\d)/);
  const timeMatchH = !timeMatchFull && !timeMatchStd && t.match(/(?<!\d)(\d{1,2})\s*h(?:oras?)?(?!\d)/);
  const tm = timeMatchFull || timeMatchStd || timeMatchH;
  if (tm) {
    const h = parseInt(tm[1], 10);
    const m = parseInt(tm[2] || '0', 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      hours = h;
      minutes = m;
    }
  }

  if (!day && hours !== null) {
    return { slotStart: null, slotEnd: null, missingDay: true, parsedHour: hours, parsedMinutes: minutes };
  }
  if (!day) return { slotStart: null, slotEnd: null };
  if (hours === null) return { slotStart: null, slotEnd: null, missingTime: true, parsedDay: day, parsedMonth: month, parsedYear: year };

  const pad = (n) => String(n).padStart(2, '0');

  const refDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const tzParts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', timeZoneName: 'shortOffset' })
    .formatToParts(refDate);
  const tzName = tzParts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+1';
  const offsetMatch = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const offsetSign = offsetMatch?.[1] || '+';
  const offsetH = pad(parseInt(offsetMatch?.[2] || '1', 10));
  const offsetM = pad(parseInt(offsetMatch?.[3] || '0', 10));
  const tzOffset = `${offsetSign}${offsetH}:${offsetM}`;

  const slotStart = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00${tzOffset}`;
  let endH = hours;
  let endM = minutes + 60;
  if (endM >= 60) {
    endH += 1;
    endM -= 60;
  }
  const slotEnd = `${year}-${pad(month)}-${pad(day)}T${pad(endH)}:${pad(endM)}:00${tzOffset}`;

  return { slotStart, slotEnd };
}
