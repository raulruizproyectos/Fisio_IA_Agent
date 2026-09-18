export interface DemoPatient {
  id: string;
  nombre: string;
  apellidos: string;
  nombre_completo: string;
  dni: string;
  telefono: string;
  email: string;
  fecha_nacimiento: string;
  patologia_principal: string;
  eva_actual: number;
  estado: string;
  ultima_visita: string;
  sesiones_realizadas: number;
  alergias?: string;
  banderas_rojas?: string;
  notas_clinicas?: Array<{
    id: string;
    fecha: string;
    subjetivo: string;
    objetivo: string;
    analisis: string;
    plan: string;
  }>;
}

export interface DemoAppointment {
  id: string;
  paciente_id: string;
  fisioterapeuta_id: string;
  nombre_paciente: string;
  telefono_paciente: string;
  inicio_en: string;
  fin_en: string;
  motivo: string;
  estado: 'completada' | 'en_consulta' | 'confirmada' | 'pendiente' | 'cancelada';
  canal: string;
  gcal_synced?: boolean;
}

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');

export const DEMO_PATIENTS: DemoPatient[] = [
  {
    id: '11111111-2222-3333-4444-555555555501',
    nombre: 'Elena',
    apellidos: 'Ramos Gil',
    nombre_completo: 'Elena Ramos Gil',
    dni: '53892011M',
    telefono: '+34 622 334 455',
    email: 'elena.ramos@clinica.es',
    fecha_nacimiento: '1995-04-12',
    patologia_principal: 'Rotura fibrilar gemelo interno (grado I-II, subaguda)',
    eva_actual: 4,
    estado: 'activo',
    ultima_visita: 'Hoy, 11:00',
    sesiones_realizadas: 4,
    alergias: 'Ninguna conocida',
    banderas_rojas: 'Sin banderas rojas. Ecografía control favorable.',
    notas_clinicas: [
      {
        id: 'note-01',
        fecha: `${yyyy}-${mm}-${dd} 11:00`,
        subjetivo: 'Refiere disminución del dolor punzante al apoyo monopodal. EVA 4/10. Sensación de tirantez matutina.',
        objetivo: 'Ecografía: hematoma reabsorbido en 80%. Palpación con dolor moderado a 4cm unión miotendinosa. Flexión dorsal activa completa.',
        analisis: 'Evolución favorable hacia fase de remodelación y carga excéntrica progresiva.',
        plan: 'Inicio de carga excéntrica suave en bipedestación, drenaje manual y pauta de ejercicios con crioterapia.',
      },
    ],
  },
  {
    id: '11111111-2222-3333-4444-555555555502',
    nombre: 'Carlos',
    apellidos: 'Vega Ortiz',
    nombre_completo: 'Carlos Vega Ortiz',
    dni: '47281923X',
    telefono: '+34 611 223 344',
    email: 'carlos.vega@clinica.es',
    fecha_nacimiento: '1982-11-03',
    patologia_principal: 'Lumbociatalgia aguda L5-S1 con radiculopatía',
    eva_actual: 7,
    estado: 'activo',
    ultima_visita: 'Hoy, 09:30',
    sesiones_realizadas: 3,
    alergias: 'AINEs (intolerancia gástrica)',
    banderas_rojas: 'Irradiación hasta dermatoma S1 sin pérdida motora.',
    notas_clinicas: [
      {
        id: 'note-02',
        fecha: `${yyyy}-${mm}-${dd} 09:30`,
        subjetivo: 'Persiste dolor sordo al sentarse más de 20 min. Menos parestesia en pie derecho.',
        objetivo: 'Lasègue positivo a 50º lado derecho. Reflejo aquíleo conservado. Contractura paravertebral.',
        analisis: 'Fase aguda controlada, iniciar descompresión y estabilización lumbo-pélvica suave.',
        plan: 'Terapia manual descompresiva, ejercicios de McKenzie en extensión y neurodinámica suave.',
      },
    ],
  },
  {
    id: '11111111-2222-3333-4444-555555555503',
    nombre: 'Marcos',
    apellidos: 'Alonso Vilar',
    nombre_completo: 'Marcos Alonso Vilar',
    dni: '08912384K',
    telefono: '+34 633 445 566',
    email: 'marcos.alonso@clinica.es',
    fecha_nacimiento: '1989-08-25',
    patologia_principal: 'Rehab post-quirúrgica Plastia LCA (Semana 6)',
    eva_actual: 3,
    estado: 'activo',
    ultima_visita: 'Hoy, 12:30',
    sesiones_realizadas: 7,
    alergias: 'Ninguna',
    banderas_rojas: 'Sin derrame articular articular evidente.',
  },
  {
    id: '11111111-2222-3333-4444-555555555504',
    nombre: 'Lucía',
    apellidos: 'Méndez Ruiz',
    nombre_completo: 'Lucía Méndez Ruiz',
    dni: '71290384B',
    telefono: '+34 644 556 677',
    email: 'lucia.mendez@clinica.es',
    fecha_nacimiento: '1976-02-18',
    patologia_principal: 'Cervicobraquialgia postural y sobrecarga trapecios',
    eva_actual: 5,
    estado: 'activo',
    ultima_visita: 'Hoy, 16:00',
    sesiones_realizadas: 5,
  },
  {
    id: '11111111-2222-3333-4444-555555555505',
    nombre: 'David',
    apellidos: 'Soler Castro',
    nombre_completo: 'David Soler Castro',
    dni: '39481029R',
    telefono: '+34 655 667 788',
    email: 'david.soler@clinica.es',
    fecha_nacimiento: '1999-07-14',
    patologia_principal: 'Tendinopatía rotuliana rodilla derecha (Jumper knee)',
    eva_actual: 6,
    estado: 'activo',
    ultima_visita: 'Hoy, 17:30',
    sesiones_realizadas: 2,
  },
];

export const DEMO_APPOINTMENTS: DemoAppointment[] = [
  {
    id: 'appt-01',
    paciente_id: '11111111-2222-3333-4444-555555555502',
    fisioterapeuta_id: '11111111-1111-4111-8111-111111111111',
    nombre_paciente: 'Carlos Vega Ortiz',
    telefono_paciente: '+34 611 223 344',
    inicio_en: `${yyyy}-${mm}-${dd}T09:30:00.000Z`,
    fin_en: `${yyyy}-${mm}-${dd}T10:15:00.000Z`,
    motivo: 'Lumbociatalgia L5-S1 (Seguimiento fase aguda)',
    estado: 'completada',
    canal: 'Cita presencial',
    gcal_synced: true,
  },
  {
    id: 'appt-02',
    paciente_id: '11111111-2222-3333-4444-555555555501',
    fisioterapeuta_id: '11111111-1111-4111-8111-111111111111',
    nombre_paciente: 'Elena Ramos Gil',
    telefono_paciente: '+34 622 334 455',
    inicio_en: `${yyyy}-${mm}-${dd}T11:00:00.000Z`,
    fin_en: `${yyyy}-${mm}-${dd}T11:50:00.000Z`,
    motivo: 'Rotura fibrilar gemelo interno (Revisión ecográfica y carga)',
    estado: 'en_consulta',
    canal: 'Cita presencial',
    gcal_synced: true,
  },
  {
    id: 'appt-03',
    paciente_id: '11111111-2222-3333-4444-555555555503',
    fisioterapeuta_id: '11111111-1111-4111-8111-111111111111',
    nombre_paciente: 'Marcos Alonso Vilar',
    telefono_paciente: '+34 633 445 566',
    inicio_en: `${yyyy}-${mm}-${dd}T12:30:00.000Z`,
    fin_en: `${yyyy}-${mm}-${dd}T13:20:00.000Z`,
    motivo: 'Rehabilitación post-quirúrgica Plastia LCA',
    estado: 'confirmada',
    canal: 'Cita presencial',
    gcal_synced: true,
  },
  {
    id: 'appt-04',
    paciente_id: '11111111-2222-3333-4444-555555555504',
    fisioterapeuta_id: '11111111-1111-4111-8111-111111111111',
    nombre_paciente: 'Lucía Méndez Ruiz',
    telefono_paciente: '+34 644 556 677',
    inicio_en: `${yyyy}-${mm}-${dd}T16:00:00.000Z`,
    fin_en: `${yyyy}-${mm}-${dd}T16:45:00.000Z`,
    motivo: 'Cervicobraquialgia postural y sobrecarga miofascial',
    estado: 'confirmada',
    canal: 'Cita presencial',
    gcal_synced: true,
  },
  {
    id: 'appt-05',
    paciente_id: '11111111-2222-3333-4444-555555555505',
    fisioterapeuta_id: '11111111-1111-4111-8111-111111111111',
    nombre_paciente: 'David Soler Castro',
    telefono_paciente: '+34 655 667 788',
    inicio_en: `${yyyy}-${mm}-${dd}T17:30:00.000Z`,
    fin_en: `${yyyy}-${mm}-${dd}T18:15:00.000Z`,
    motivo: 'Tendinopatía rotuliana rodilla derecha (Test carga)',
    estado: 'pendiente',
    canal: 'Reserva web',
    gcal_synced: false,
  },
];

export const DEMO_INTAKES = [
  {
    id: 'intake-01',
    nombre: 'Elena Ramos Gil',
    telefono: '+34 622 334 455',
    canal: 'telegram',
    mensaje: 'Hola Dra. Carmen, he hecho los ejercicios de talón excéntrico. Molestia 2/10, noto el gemelo más suelto.',
    fecha: 'Hoy, 10:15',
    leido: false,
  },
  {
    id: 'intake-02',
    nombre: 'Raúl Sánchez',
    telefono: '+34 677 889 900',
    canal: 'web',
    mensaje: 'Solicito primera valoración por tirón en isquiotibial jugando al pádel ayer.',
    fecha: 'Hoy, 08:45',
    leido: false,
  },
];

export const DEMO_EXERCISES_CATALOG = [
  {
    id: 'ex-01',
    nombre: 'Elevación de talón excéntrica en escalón',
    zona_cuerpo: 'Tobillo y pie',
    nivel_dificultad: 'intermedio',
    material: 'Escalón o step',
    series_defecto: 3,
    repeticiones_defecto: 12,
    cautions: ['No realizar con rebote', 'Detener si EVA > 5/10'],
    procedimiento: 'Colocar los metatarsos en el borde del escalón. Subir con dos pies, descender lentamente con uno en 4 segundos.',
  },
  {
    id: 'ex-02',
    nombre: 'Puente de glúteos unilateral',
    zona_cuerpo: 'Cadera y pelvis',
    nivel_dificultad: 'intermedio',
    material: 'Esterilla',
    series_defecto: 3,
    repeticiones_defecto: 10,
    cautions: ['Evitar hiperextensión lumbar'],
    procedimiento: 'Túmbate boca arriba con rodillas flexionadas. Eleva la pelvis empujando con un talón, manteniendo la pelvis nivelada.',
  },
  {
    id: 'ex-03',
    nombre: 'Bird-Dog con control lumbopélvico',
    zona_cuerpo: 'Columna lumbar',
    nivel_dificultad: 'básico',
    material: 'Esterilla',
    series_defecto: 3,
    repeticiones_defecto: 8,
    cautions: ['Mantener la columna neutra sin arquear'],
    procedimiento: 'En cuadrupedia, extender brazo derecho y pierna izquierda en línea con el tronco sin rotar la pelvis.',
  },
  {
    id: 'ex-04',
    nombre: 'Retracción cervical (Chin Tuck) contra pared',
    zona_cuerpo: 'Columna cervical',
    nivel_dificultad: 'básico',
    material: 'Pared',
    series_defecto: 3,
    repeticiones_defecto: 10,
    cautions: ['No inclinar la cabeza hacia abajo ni hacia atrás'],
    procedimiento: 'Espalda contra pared. Llevar suavemente el mentón hacia atrás como sacando papada, elongando la coronilla hacia el techo.',
  },
];
