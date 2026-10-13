// Days the clinic does not work. Computed locally (no network): national and Catalan holidays by rule,
// plus BOOKING_EXTRA_HOLIDAYS (YYYY-MM-DD list) for Terrassa local holidays and clinic closures.
// The Generalitat publishes the yearly calendar in the DOGC; review the extra list every year.

const NATIONAL_FIXED = [
  ['01-01', 'Año Nuevo'], ['01-06', 'Reyes'], ['05-01', 'Fiesta del Trabajo'], ['08-15', 'Asunción'],
  ['10-12', 'Fiesta Nacional de España'], ['11-01', 'Todos los Santos'], ['12-06', 'Día de la Constitución'],
  ['12-08', 'Inmaculada Concepción'], ['12-25', 'Navidad'],
];
const CATALONIA_FIXED = [['06-24', 'Sant Joan'], ['09-11', 'Diada Nacional de Catalunya'], ['12-26', 'Sant Esteve']];

const pad = (value) => String(value).padStart(2, '0');
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Anonymous Gregorian algorithm; returns YYYY-MM-DD of Easter Sunday.
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

const shiftDays = (dateOnly, days) => new Date(Date.parse(`${dateOnly}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

export function parseExtraHolidays(raw = process.env.BOOKING_EXTRA_HOLIDAYS) {
  return new Set(String(raw || '').split(/[\s,;]+/).map((value) => value.trim()).filter((value) => DATE_ONLY.test(value)));
}

// Returns the holiday name for a Madrid calendar date (YYYY-MM-DD), or null.
export function holidayName(dateOnly, extra = parseExtraHolidays()) {
  if (!DATE_ONLY.test(String(dateOnly || ''))) return null;
  const year = Number(dateOnly.slice(0, 4));
  const monthDay = dateOnly.slice(5);
  const fixed = [...NATIONAL_FIXED, ...CATALONIA_FIXED].find(([day]) => day === monthDay);
  if (fixed) return fixed[1];
  const easter = easterSunday(year);
  if (dateOnly === shiftDays(easter, -2)) return 'Viernes Santo';
  if (dateOnly === shiftDays(easter, 1)) return 'Lunes de Pascua';
  if (extra.has(dateOnly)) return 'Festivo local o cierre de la clínica';
  return null;
}

export const isClinicHoliday = (dateOnly, extra) => holidayName(dateOnly, extra) !== null;

const clockMinutes = (value) => {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(value || '').trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

// Opening hours: "09:00-13:00,15:00-19:00" or [{"start":"09:00","end":"13:00"}, …].
// Returns [] when absent or invalid, so callers decide the fallback and readiness can flag it.
export function parseBookingWindows(raw) {
  const text = String(raw || '').trim();
  if (!text) return [];
  let entries;
  if (text.startsWith('[')) {
    try { entries = JSON.parse(text).map((item) => [item?.start, item?.end]); } catch { return []; }
  } else {
    entries = text.split(/[;,]+/).map((entry) => entry.split('-'));
  }
  const windows = entries.map(([start, end]) => ({ startMinutes: clockMinutes(start), endMinutes: clockMinutes(end) }));
  if (!windows.length || windows.some((w) => w.startMinutes === null || w.endMinutes === null || w.endMinutes <= w.startMinutes)) return [];
  return windows.sort((a, b) => a.startMinutes - b.startMinutes);
}
