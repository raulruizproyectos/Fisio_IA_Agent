export function upcomingAppointments(appointments: any[], now = Date.now()) {
  const start = (appointment: any) => new Date(appointment.inicio_en || appointment.fecha_hora || '').getTime();
  return appointments.filter(appointment => start(appointment) >= now
    && !['cancelada', 'completada', 'no_show', 'calendar_cancelled'].includes(appointment.estado))
    .sort((a, b) => start(a) - start(b));
}

// One clinic timezone, independent of the professional's device location.
export const CLINIC_TIME_ZONE = 'Europe/Madrid';
const clinicPartsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: CLINIC_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const clinicParts = (value: Date | string) => {
  const date = new Date(value);
  const parts = Object.fromEntries(clinicPartsFormatter.formatToParts(date).map(part => [part.type, part.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second) };
};
const pad = (value: number) => String(value).padStart(2, '0');
export function clinicDayKey(value: Date | string) {
  try { const p = clinicParts(value); return `${p.year}-${pad(p.month)}-${pad(p.day)}`; }
  catch { return ''; }
}
export function clinicHour(value: Date | string) { return clinicParts(value).hour; }
export function clinicDateTimeValue(value: Date | string) {
  const p = clinicParts(value);
  return `${clinicDayKey(value)}T${pad(p.hour)}:${pad(p.minute)}`;
}
export function clinicDateTimeToDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('Introduce una fecha y hora válidas de la clínica (Europe/Madrid).');
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const wallTime = Date.UTC(year, month - 1, day, hour, minute);
  const offsets = new Set([-1, 0, 1].map(days => {
    const sample = wallTime + days * 86400000, p = clinicParts(new Date(sample));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - sample;
  }));
  const candidates = [...offsets].map(offset => new Date(wallTime - offset))
    .filter(date => clinicDateTimeValue(date) === value);
  // Never silently move a nonexistent time or choose one of two autumn DST instants.
  if (candidates.length !== 1) throw new Error('Esta hora no existe o es ambigua por el cambio horario de Madrid. Elige otra hora.');
  return candidates[0];
}
export function clinicStartOfDay(value: Date | string) {
  return clinicDateTimeToDate(`${clinicDayKey(value)}T00:00`);
}
export function shiftClinicDays(value: Date | string, days: number) {
  const p = clinicParts(value), shifted = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return clinicDateTimeToDate(`${shifted.toISOString().slice(0, 10)}T00:00`);
}
export function clinicWeekStart(value: Date | string) {
  const p = clinicParts(value), weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return shiftClinicDays(value, weekday === 0 ? -6 : 1 - weekday);
}
