// Fictitious API for the local demo (?demo=true, development builds only).
// Covers the endpoints that have no in-page demo fallback, so every view of a
// presentation shows coherent sample data instead of error states. Endpoints
// not listed here fall through to the network and keep their own fallbacks.
import { DEMO_APPOINTMENTS, DEMO_PATIENTS } from './demoData';

const DAY = 24 * 60 * 60 * 1000;
const now = () => new Date();
const isoDaysAgo = (days: number, hour = 10, minute = 0) => {
  const date = new Date(Date.now() - days * DAY);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};
const dateDaysAgo = (days: number) => isoDaysAgo(days).slice(0, 10);
const patient = (index: number) => DEMO_PATIENTS[index % DEMO_PATIENTS.length];
const ref = (index: number) => ({ nombre: patient(index).nombre, apellidos: patient(index).apellidos });

// Monthly income for the current year, up to the current month (partial).
function monthlySummary(year: number) {
  const base = [2860, 3120, 3340, 2980, 3410, 3650, 2720, 1980, 2040, 3790, 3880, 3420];
  const today = now();
  const lastMonth = year < today.getFullYear() ? 12 : year > today.getFullYear() ? 0 : today.getMonth() + 1;
  return Array.from({ length: lastMonth }, (_, i) => {
    const month = i + 1;
    const partial = month === today.getMonth() + 1 && year === today.getFullYear() ? Math.max(0.35, today.getDate() / 31) : 1;
    const total = Math.round(base[i] * partial / 5) * 5;
    return { mes: month, total, sesiones: Math.round(total / 50) };
  });
}

// Payments for one month whose sum matches the monthly summary above.
function payments(year: number, month: number) {
  const target = monthlySummary(year).find((row) => row.mes === month)?.total || 0;
  const rows: unknown[] = [];
  const today = now();
  const lastDay = year === today.getFullYear() && month === today.getMonth() + 1 ? today.getDate() : new Date(year, month, 0).getDate();
  const items: Array<[number, string, string]> = [[450, 'Bono 10 sesiones', 'transferencia'], [240, 'Bono 5 sesiones', 'tarjeta']];
  let sum = 0;
  for (let i = 0; sum < target; i++) {
    const [amount, concept, method] = items[i] || (i % 3 === 0 ? [55, 'Sesión de fisioterapia deportiva', 'tarjeta'] : [50, 'Sesión de fisioterapia', i % 2 ? 'efectivo' : 'tarjeta']);
    const value = Math.min(amount, target - sum);
    const day = Math.max(1, lastDay - (i % lastDay));
    rows.push({ id: `demo-pago-${year}-${month}-${i}`, fecha: new Date(year, month - 1, day, 9 + (i % 9), i % 2 ? 30 : 0).toISOString(),
      importe: value, metodo_pago: method, concepto: value === amount ? concept : 'Sesión de valoración', crm_pacientes: ref(i) });
    sum += value;
  }
  return rows;
}

const invoices = () => [
  { id: 'demo-fac-01', numero: 'F-2026-0142', fecha: dateDaysAgo(2), estado: 'pagada', importe_bruto: 220, importe_iva: 0, importe_total: 220, crm_pacientes: ref(0) },
  { id: 'demo-fac-02', numero: 'F-2026-0141', fecha: dateDaysAgo(5), estado: 'emitida', importe_bruto: 165, importe_iva: 0, importe_total: 165, crm_pacientes: ref(1) },
  { id: 'demo-fac-03', numero: 'F-2026-0140', fecha: dateDaysAgo(9), estado: 'pagada', importe_bruto: 450, importe_iva: 0, importe_total: 450, crm_pacientes: ref(3) },
  { id: 'demo-fac-04', numero: 'F-2026-0139', fecha: dateDaysAgo(14), estado: 'emitida', importe_bruto: 110, importe_iva: 0, importe_total: 110, crm_pacientes: ref(5) },
];

const vouchers = () => [
  { id: 'demo-bono-01', nombre: 'Bono 10 sesiones', precio: 450, sesiones_total: 10, sesiones_usadas: 4, estado: 'activo', fecha_inicio: dateDaysAgo(30), fecha_caducidad: dateDaysAgo(-150), created_at: isoDaysAgo(30), crm_pacientes: ref(3) },
  { id: 'demo-bono-02', nombre: 'Bono 5 sesiones', precio: 240, sesiones_total: 5, sesiones_usadas: 4, estado: 'activo', fecha_inicio: dateDaysAgo(21), fecha_caducidad: dateDaysAgo(-70), created_at: isoDaysAgo(21), crm_pacientes: ref(0) },
  { id: 'demo-bono-03', nombre: 'Bono 10 sesiones', precio: 450, sesiones_total: 10, sesiones_usadas: 1, estado: 'activo', fecha_inicio: dateDaysAgo(6), fecha_caducidad: dateDaysAgo(-174), created_at: isoDaysAgo(6), crm_pacientes: ref(6) },
];

const intakes = () => [
  { id: 'demo-intake-01', paciente_id: patient(0).id, nombre_paciente: patient(0).nombre_completo, fuente: 'telegram',
    mensaje: 'He hecho los ejercicios de talón excéntrico. Molestia 2/10 y noto el gemelo más suelto. ¿Subo una serie?', timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
  { id: 'demo-intake-02', paciente_id: patient(4).id, nombre_paciente: patient(4).nombre_completo, fuente: 'telegram', priority: 'high',
    mensaje: 'Desde ayer el dolor lumbar baja por la pierna hasta el gemelo y se duerme el pie al estar sentado.', timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString() },
  { id: 'demo-intake-03', nombre_paciente: 'Laura Martín Soler', fuente: 'web',
    mensaje: 'Solicito primera valoración por dolor de hombro al levantar el brazo. Puedo martes o jueves por la tarde.', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
];

const plans = () => {
  const items = [
    { i: 0, title: 'Readaptación rotura fibrilar gemelo', note: 'Carga excéntrica progresiva y retorno a la carrera.', status: 'aprobada', count: 5, delivered: 2, days: 1 },
    { i: 1, title: 'Control motor lumbopélvico L5-S1', note: 'Estabilización segmentaria y tolerancia a la sedestación.', status: 'enviada', count: 4, delivered: 1, days: 3 },
    { i: 3, title: 'Recuperación funcional de hombro', note: 'Movilidad activa asistida y fortalecimiento del manguito.', status: 'requiere_revision', count: 6, delivered: 0, days: 0 },
    { i: 5, title: 'Esguince de tobillo: propiocepción', note: 'Equilibrio monopodal y fortalecimiento de peroneos.', status: 'aprobada', count: 4, delivered: 1, days: 6 },
  ];
  return items.map(({ i, title, note, status, count, delivered, days }) => ({
    patient_id: patient(i).id, patient_name: patient(i).nombre_completo, patient_email: patient(i).email || patient(i).telefono,
    title, clinical_note: note, symptom_summary: note, status, exercises_count: count,
    archived_reports_count: delivered, archived_deliveries_count: delivered, latest_report_format: delivered ? 'pdf' : null,
    latest_report_source: delivered ? 'Telegram' : null, last_activity_at: isoDaysAgo(days, 12), created_at: isoDaysAgo(days + 4, 10),
  }));
};

function notesFor(patientId: string) {
  const found = DEMO_PATIENTS.find((item) => item.id === patientId);
  return (found?.notas_clinicas || []).map((note) => ({
    id: note.id,
    texto_nota: [note.subjetivo && `S: ${note.subjetivo}`, note.objetivo && `O: ${note.objetivo}`, note.analisis && `A: ${note.analisis}`, note.plan && `P: ${note.plan}`].filter(Boolean).join('\n'),
    creado_en: isoDaysAgo(2, 11),
  }));
}

type Handler = (url: URL, method: string) => unknown;
const routes: Array<[string, RegExp, Handler]> = [
  ['GET', /^\/api\/health$/, () => ({ status: 'ok' })],
  ['GET', /^\/api\/health\/readiness$/, () => ({ status: 'ok', summary: { ok_checks: 14, total_checks: 14, optional_missing: 0 }, missing_tables: [] })],
  ['GET', /^\/api\/pagos\/resumen$/, (url) => ({ resumen: monthlySummary(Number(url.searchParams.get('anio')) || now().getFullYear()) })],
  ['GET', /^\/api\/facturas$/, () => ({ data: invoices() })],
  ['GET', /^\/api\/pagos$/, (url) => {
    const today = now();
    const year = Number(url.searchParams.get('anio')) || today.getFullYear();
    const month = Number(url.searchParams.get('mes')) || today.getMonth() + 1;
    return { data: payments(year, month) };
  }],
  ['GET', /^\/api\/profesional\/appointments$/, () => ({
    data: DEMO_APPOINTMENTS.map((appointment) => ({
      ...appointment,
      calendar_sync_state: appointment.gcal_synced ? 'linked' : 'crm_only',
      canal_origen: /telegram/i.test(appointment.canal) ? 'telegram' : /online/i.test(appointment.canal) ? 'Reserva online' : 'crm_web',
    })),
  })],
  ['GET', /^\/api\/bonos$/, () => ({ data: vouchers() })],
  ['GET', /^\/api\/profesional\/intakes\/pending$/, () => ({ data: intakes() })],
  ['GET', /^\/api\/profesional\/program-library$/, () => {
    const recent = plans();
    return { data: { summary: { total_plans: 18, visible_plans: recent.length, total_deliveries: 9, active_patients: 7 }, recent_plans: recent } };
  }],
  ['GET', /^\/api\/profesional\/appointments\/sync-calendar\/status$/, () => ({
    data: { enabled: true, ui_status: 'healthy', trigger: 'auto', last_success_at: new Date(Date.now() - 60 * 1000).toISOString(), summary: { persisted: 2, updated: 1, cancelled: 0, fetched: 14 } },
  })],
  ['GET', /^\/api\/profesional\/patients\/([^/]+)\/history$/, (url) => ({ data: { notas_seguimiento: notesFor(decodeURIComponent(url.pathname.split('/')[4])) } })],
  ['GET', /^\/api\/pacientes\/([0-9a-f-]{36})$/, (url) => {
    const found = DEMO_PATIENTS.find((item) => item.id === url.pathname.split('/')[3]);
    return found ? { data: found } : null;
  }],
  ['GET', /^\/api\/exercises\/recommendations\/[^/]+$/, () => ({ data: [] })],
  ['GET', /^\/api\/telegram\/link-code\/[^/]+$/, () => ({ data: { link_status: 'linked', telegram_username: 'paciente_demo', vinculado_en: isoDaysAgo(12, 18, 20) } })],
];

export function demoApiResponse(method: string, target: URL): Response | null {
  for (const [verb, pattern, handler] of routes) {
    if (verb !== method || !pattern.test(target.pathname)) continue;
    const body = handler(target, method);
    if (body === null) return null;
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return null;
}
