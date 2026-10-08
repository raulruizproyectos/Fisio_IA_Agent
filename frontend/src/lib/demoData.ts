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
    patologia_principal: 'Lumbociatalgia aguda L5-S1 con radiculopatía derecha',
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
    nombre: 'Alejandro',
    apellidos: 'Fernández-Montesinos de la Sierra',
    nombre_completo: 'Dr. Alejandro Fernández-Montesinos de la Sierra',
    dni: '08912384K',
    telefono: '+34 633 445 566',
    email: 'alejandro.fernandez.montesinos@hospital-san-rafael.org',
    fecha_nacimiento: '1974-06-21',
    patologia_principal: 'Rehabilitación post-quirúrgica manguito rotador con anclaje supraespinoso (Semana 8)',
    eva_actual: 5,
    estado: 'activo',
    ultima_visita: 'Ayer, 18:00',
    sesiones_realizadas: 8,
    alergias: 'Látex (reacción dérmica)',
    banderas_rojas: 'Precaución en rotación externa pasiva > 45º según protocolo quirúrgico.',
  },
  {
    id: '11111111-2222-3333-4444-555555555504',
    nombre: 'Lucía',
    apellidos: 'Méndez Ruiz',
    nombre_completo: 'Lucía Méndez Ruiz',
    dni: '71290384B',
    telefono: '+34 644 556 677',
    email: '',
    fecha_nacimiento: '1976-02-18',
    patologia_principal: 'Cervicobraquialgia postural con cefalea tensional recurrente',
    eva_actual: 5,
    estado: 'activo',
    ultima_visita: 'Hoy, 16:00',
    sesiones_realizadas: 5,
    alergias: 'Ninguna conocida',
  },
  {
    id: '11111111-2222-3333-4444-555555555505',
    nombre: 'David',
    apellidos: 'Soler Castro',
    nombre_completo: 'David Soler Castro',
    dni: '39481029R',
    telefono: '',
    email: 'david.soler.castro@universidad.edu.es',
    fecha_nacimiento: '1999-07-14',
    patologia_principal: 'Tendinopatía rotuliana rodilla derecha (Jumper knee - fase reactiva)',
    eva_actual: 6,
    estado: 'activo',
    ultima_visita: 'Hoy, 17:30',
    sesiones_realizadas: 2,
    alergias: 'Ninguna',
  },
  {
    id: '11111111-2222-3333-4444-555555555506',
    nombre: 'Carmen',
    apellidos: 'Gómez',
    nombre_completo: 'Carmen Gómez',
    dni: '14283920W',
    telefono: '',
    email: '',
    fecha_nacimiento: '1952-03-30',
    patologia_principal: 'Gonartrosis tricompartimental bilateral severa con limitación funcional para la marcha',
    eva_actual: 8,
    estado: 'activo',
    ultima_visita: 'Hace 3 semanas',
    sesiones_realizadas: 14,
    alergias: 'Paracetamol',
    banderas_rojas: 'Atención prioritaria: Dolor limitante EVA 8/10 y riesgo de caídas.',
  },
  {
    id: '11111111-2222-3333-4444-555555555507',
    nombre: 'Marc',
    apellidos: 'Valls',
    nombre_completo: 'Marc Valls',
    dni: '48291039T',
    telefono: '+34 688 112 233',
    email: 'marc.valls@estudio.cat',
    fecha_nacimiento: '2003-12-05',
    patologia_principal: 'Esguince ligamento lateral externo tobillo izquierdo (Grado II)',
    eva_actual: 2,
    estado: 'activo',
    ultima_visita: 'Ayer, 16:30',
    sesiones_realizadas: 6,
    alergias: 'Ninguna',
  },
  {
    id: '11111111-2222-3333-4444-555555555508',
    nombre: 'Sofía',
    apellidos: 'Benítez Navarro',
    nombre_completo: 'Sofía Benítez Navarro',
    dni: '52819203P',
    telefono: '+34 677 334 889',
    email: 'sofia.benitez@despacho.com',
    fecha_nacimiento: '1988-09-17',
    patologia_principal: 'Fascitis plantar crónica insercional con espolón calcáneo incipiente',
    eva_actual: 4,
    estado: 'activo',
    ultima_visita: 'Hace 5 días',
    sesiones_realizadas: 4,
    alergias: 'Ninguna',
  },
  {
    id: '11111111-2222-3333-4444-555555555509',
    nombre: 'Roberto',
    apellidos: 'Jiménez Calvo',
    nombre_completo: 'Roberto Jiménez Calvo',
    dni: '29384719L',
    telefono: '+34 655 443 221',
    email: 'roberto.jimenez@transportes.es',
    fecha_nacimiento: '1979-05-24',
    patologia_principal: 'Sobrecarga dorsolumbar mecánica con síndrome facetario leve',
    eva_actual: 3,
    estado: 'alta',
    ultima_visita: 'Hace 1 mes',
    sesiones_realizadas: 10,
    alergias: 'Ninguna',
  },
  {
    id: '11111111-2222-3333-4444-555555555510',
    nombre: 'Patricia',
    apellidos: 'Serrano Morales',
    nombre_completo: 'Patricia Serrano Morales',
    dni: '78291034C',
    telefono: '+34 699 887 766',
    email: 'patricia.serrano@clinica.es',
    fecha_nacimiento: '1985-01-14',
    patologia_principal: 'Capsulitis adhesiva hombro izquierdo (Hombro congelado - Fase de descongelación)',
    eva_actual: 6,
    estado: 'activo',
    ultima_visita: 'Hace 2 días',
    sesiones_realizadas: 9,
    alergias: 'Penicilina',
  },
  {
    id: '11111111-2222-3333-4444-555555555511',
    nombre: 'Iñigo',
    apellidos: 'Arrieta',
    nombre_completo: 'Iñigo Arrieta',
    dni: '16283940F',
    telefono: '+34 644 123 789',
    email: '',
    fecha_nacimiento: '1992-10-08',
    patologia_principal: 'Puntos gatillo miofasciales activos en trapecio superior y elevador escápula',
    eva_actual: 3,
    estado: 'activo',
    ultima_visita: 'Hace 1 semana',
    sesiones_realizadas: 3,
    alergias: 'Ninguna',
  },
  {
    id: '11111111-2222-3333-4444-555555555512',
    nombre: 'Francisco Javier',
    apellidos: 'Domínguez-Álvarez de Toledo',
    nombre_completo: 'Francisco Javier Domínguez-Álvarez de Toledo',
    dni: '05281920D',
    telefono: '+34 600 998 877',
    email: 'fcojavier.dominguez.toledo@abogadosasociados.es',
    fecha_nacimiento: '1968-11-29',
    patologia_principal: 'Hernia discal L4-L5 extruida con radiculopatía motora L5 y parestesias persistentes en dorso de pie',
    eva_actual: 7,
    estado: 'activo',
    ultima_visita: 'Hoy, 08:30',
    sesiones_realizadas: 5,
    alergias: 'Ibuprofeno',
    banderas_rojas: 'Atención clínica urgente: control semanal de reflejo rotuliano y fuerza en extensor largo del hallux.',
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
    nombre_paciente: 'Dr. Alejandro Fernández-Montesinos de la Sierra',
    telefono_paciente: '+34 633 445 566',
    inicio_en: `${yyyy}-${mm}-${dd}T12:30:00.000Z`,
    fin_en: `${yyyy}-${mm}-${dd}T13:20:00.000Z`,
    motivo: 'Rehabilitación post-quirúrgica manguito rotador',
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
    telefono_paciente: '',
    inicio_en: `${yyyy}-${mm}-${dd}T17:30:00.000Z`,
    fin_en: `${yyyy}-${mm}-${dd}T18:15:00.000Z`,
    motivo: 'Tendinopatía rotuliana rodilla derecha (Test carga)',
    estado: 'pendiente',
    canal: 'Reserva web',
    gcal_synced: false,
  },
  {
    id: 'appt-06',
    paciente_id: '11111111-2222-3333-4444-555555555507',
    fisioterapeuta_id: '11111111-1111-4111-8111-111111111111',
    nombre_paciente: 'Marc Valls',
    telefono_paciente: '+34 688 112 233',
    inicio_en: `${yyyy}-${mm}-${String(today.getDate() + 1).padStart(2, '0')}T10:00:00.000Z`,
    fin_en: `${yyyy}-${mm}-${String(today.getDate() + 1).padStart(2, '0')}T10:45:00.000Z`,
    motivo: 'Esguince ligamento lateral externo tobillo (Propiocepción)',
    estado: 'confirmada',
    canal: 'Cita presencial',
    gcal_synced: true,
  },
  {
    id: 'appt-07',
    paciente_id: '11111111-2222-3333-4444-555555555512',
    fisioterapeuta_id: '11111111-1111-4111-8111-111111111111',
    nombre_paciente: 'Francisco Javier Domínguez-Álvarez de Toledo',
    telefono_paciente: '+34 600 998 877',
    inicio_en: `${yyyy}-${mm}-${String(today.getDate() + 2).padStart(2, '0')}T11:30:00.000Z`,
    fin_en: `${yyyy}-${mm}-${String(today.getDate() + 2).padStart(2, '0')}T12:15:00.000Z`,
    motivo: 'Hernia discal L4-L5 (Neurodinámica y control radicular)',
    estado: 'confirmada',
    canal: 'Cita presencial',
    gcal_synced: true,
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
