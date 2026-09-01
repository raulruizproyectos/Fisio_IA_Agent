import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

function pickValue(obj, ...keys) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }
  return null;
}

const CRM_FIELDS = 'id, nombre, apellidos, email, telefono, fecha_nacimiento, dni, direccion, profesion, medico_derivador, aseguradora, alergias, antecedentes, observaciones, activo, created_at, updated_at';

const firstRow = (data) => (Array.isArray(data) && data.length ? data[0] : null);

const normalizeCrmPatient = (p) => ({
  ...p,
  nombre_completo: [p?.nombre, p?.apellidos].filter(Boolean).join(' ').trim() || `Paciente ${p?.id || ''}`.trim(),
  phone: p?.telefono || null,
  creado_en: p?.created_at || null,
  _source: 'crm',
});

const formatLegacyNotes = (notes) => {
  if (!notes) return null;
  if (typeof notes === 'string') return notes;
  if (Array.isArray(notes)) return notes.filter(Boolean).map(String).join('\n') || null;
  if (typeof notes === 'object') {
    return Object.entries(notes)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
      .join('\n') || null;
  }
  return String(notes);
};

const normalizeLegacyPatientForFicha = (p) => {
  const nombreCompleto = p?.nombre_completo || p?.full_name || `Paciente ${p?.id || ''}`.trim();
  const legacyNotes = formatLegacyNotes(p?.notas_medicas || p?.medical_notes);
  return {
    id: p?.id,
    nombre: nombreCompleto,
    apellidos: '',
    nombre_completo: nombreCompleto,
    email: p?.email || null,
    telefono: p?.phone || p?.telefono || null,
    fecha_nacimiento: p?.fecha_nacimiento || p?.birth_date || null,
    dni: null,
    direccion: null,
    profesion: null,
    medico_derivador: null,
    aseguradora: null,
    alergias: null,
    antecedentes: legacyNotes,
    observaciones: p?.observaciones || null,
    activo: true,
    created_at: p?.creado_en || p?.created_at || null,
    updated_at: p?.updated_at || null,
    _source: 'legacy',
  };
};

const getLegacyFichaAvailability = () => [
  {
    key: 'legacy',
    label: 'Ficha antigua',
    status: 'partial',
    message: 'Paciente antiguo: se muestra la ficha basica. Para usar citas, pagos y notas enriquecidas, migralo a CRM.',
  },
  {
    key: 'citas',
    label: 'Historial de citas',
    status: 'unavailable',
    message: 'Historial de citas no disponible para pacientes antiguos hasta migrarlos a CRM.',
  },
  {
    key: 'pagos',
    label: 'Historial de pagos',
    status: 'unavailable',
    message: 'Historial de pagos no disponible para pacientes antiguos hasta migrarlos a CRM.',
  },
  {
    key: 'notas',
    label: 'Notas clinicas',
    status: 'unavailable',
    message: 'Notas clinicas enriquecidas no disponibles para pacientes antiguos hasta migrarlos a CRM.',
  },
];

const isMissingTableError = (result, table) => {
  if (result?.status !== 'fulfilled' || !result?.value?.error) return false;
  const error = result.value.error;
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  return code === 'PGRST205' || (message.includes(table.toLowerCase()) && (message.includes('schema cache') || message.includes('could not find the table')));
};

const getSectionAvailability = (result, { key, label, table, migration }) => {
  if (!isMissingTableError(result, table)) return null;
  return {
    key,
    label,
    status: 'unavailable',
    table,
    migration,
    message: `${label} no disponible: falta tabla ${table}. Ejecuta ${migration}.`,
  };
};

router.get('/', async (req, res, next) => {
  try {
    const [legacyResult, crmResult] = await Promise.allSettled([
      supabase.from('pacientes').select('*').order('creado_en', { ascending: false }),
      supabase.from('crm_pacientes').select(CRM_FIELDS).eq('activo', true).order('created_at', { ascending: false }),
    ]);

    const legacyRows = legacyResult.status === 'fulfilled' && !legacyResult.value.error
      ? (legacyResult.value.data || []) : [];

    const crmRows = crmResult.status === 'fulfilled' && !crmResult.value.error
      ? (crmResult.value.data || []) : [];

    const crmNormalized = crmRows.map((p) => ({
      id: p.id,
      nombre_completo: [p.nombre, p.apellidos].filter(Boolean).join(' ').trim() || `Paciente ${p.id}`,
      email: p.email || null,
      phone: p.telefono || null,
      fecha_nacimiento: p.fecha_nacimiento || null,
      notas_medicas: {},
      creado_en: p.created_at || null,
      _source: 'crm',
    }));

    const seenEmails = new Set();
    const seenIds = new Set();
    const merged = [];

    for (const row of crmNormalized) {
      seenIds.add(String(row.id));
      if (row.email) seenEmails.add(String(row.email).toLowerCase());
      merged.push(row);
    }

    for (const row of legacyRows) {
      if (seenIds.has(String(row.id))) continue;
      if (row.email && seenEmails.has(String(row.email).toLowerCase())) continue;
      merged.push({ ...row, _source: 'legacy' });
    }

    merged.sort((a, b) => {
      const dateA = a.creado_en ? new Date(a.creado_en).getTime() : 0;
      const dateB = b.creado_en ? new Date(b.creado_en).getTime() : 0;
      return dateB - dateA;
    });

    res.json({ data: merged });
  } catch (err) {
    next(err);
  }
});

// Ficha completa: CRM enriquecido con fallback basico para pacientes antiguos.
router.get('/:id/ficha', async (req, res, next) => {
  try {
    const id = req.params.id;
    const patientRes = await supabase
      .from('crm_pacientes')
      .select(CRM_FIELDS)
      .eq('id', id)
      .limit(1);

    if (patientRes.error && !isMissingTableError({ status: 'fulfilled', value: patientRes }, 'crm_pacientes')) {
      throw patientRes.error;
    }

    const p = firstRow(patientRes.data);
    if (!p) {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .limit(1);

      if (error) throw error;
      const legacyPatient = firstRow(data);
      if (!legacyPatient) return res.status(404).json({ error: 'Paciente no encontrado' });

      return res.json({
        paciente: normalizeLegacyPatientForFicha(legacyPatient),
        citas: [],
        pagos: [],
        notas: [],
        module_availability: getLegacyFichaAvailability(),
      });
    }

    const [citasRes, pagosRes, notasRes] = await Promise.allSettled([
      supabase.from('crm_citas').select('id, fecha_hora, estado, motivo, created_at').eq('paciente_id', id).order('fecha_hora', { ascending: false }).limit(50),
      supabase.from('crm_pagos').select('id, fecha, importe, metodo_pago, concepto, notas').eq('paciente_id', id).order('fecha', { ascending: false }).limit(100),
      supabase.from('crm_notas_clinicas').select('*').eq('paciente_id', id).order('fecha', { ascending: false }).limit(100),
    ]);

    const moduleAvailability = [
      getSectionAvailability(citasRes, { key: 'citas', label: 'Historial de citas', table: 'crm_citas', migration: 'database/schema_vnext.sql' }),
      getSectionAvailability(pagosRes, { key: 'pagos', label: 'Historial de pagos', table: 'crm_pagos', migration: 'database/migrations/007_crm_pagos.sql' }),
      getSectionAvailability(notasRes, { key: 'notas', label: 'Notas clinicas', table: 'crm_notas_clinicas', migration: 'database/migrations/008_ficha_paciente_enriquecida.sql' }),
    ].filter(Boolean);

    res.json({
      paciente: {
        ...p,
        nombre_completo: [p.nombre, p.apellidos].filter(Boolean).join(' ').trim(),
      },
      citas: citasRes.status === 'fulfilled' && !citasRes.value.error ? citasRes.value.data : [],
      pagos: pagosRes.status === 'fulfilled' && !pagosRes.value.error ? pagosRes.value.data : [],
      notas: notasRes.status === 'fulfilled' && !notasRes.value.error ? notasRes.value.data : [],
      module_availability: moduleAvailability,
    });
  } catch (err) {
    next(err);
  }
});

// Update CRM patient (enriched fields)
router.patch('/:id', async (req, res, next) => {
  try {
    const fields = {};
    const allowed = ['nombre', 'apellidos', 'email', 'telefono', 'fecha_nacimiento', 'dni', 'direccion', 'profesion', 'medico_derivador', 'aseguradora', 'alergias', 'antecedentes', 'observaciones'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }
    if (!Object.keys(fields).length) return res.status(400).json({ error: 'No fields to update' });

    fields.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('crm_pacientes')
      .update(fields)
      .eq('id', req.params.id)
      .select(CRM_FIELDS)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const crmResp = await supabase
      .from('crm_pacientes')
      .select(CRM_FIELDS)
      .eq('id', req.params.id)
      .limit(1);

    if (crmResp.error && !isMissingTableError({ status: 'fulfilled', value: crmResp }, 'crm_pacientes')) {
      throw crmResp.error;
    }

    const crmPatient = firstRow(crmResp.data);
    if (crmPatient) {
      return res.json({ data: normalizeCrmPatient(crmPatient) });
    }

    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', req.params.id)
      .limit(1);

    if (error) throw error;
    const legacyPatient = firstRow(data);
    if (!legacyPatient) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json({ data: { ...legacyPatient, _source: legacyPatient._source || 'legacy' } });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const fullName = String(pickValue(req.body, 'nombre_completo', 'full_name') || '').trim();
    if (!fullName) return res.status(400).json({ error: 'nombre_completo es obligatorio' });
    const [nombre, ...surnameParts] = fullName.split(/\s+/);
    const profileId = req.auth?.profile_id;
    if (!profileId) return res.status(403).json({ error: 'Perfil profesional no autorizado' });

    const payload = {
      nombre,
      apellidos: surnameParts.join(' ') || null,
      fecha_nacimiento: pickValue(req.body, 'fecha_nacimiento', 'birth_date'),
      email: pickValue(req.body, 'email'),
      telefono: pickValue(req.body, 'phone', 'telefono'),
      observaciones: formatLegacyNotes(pickValue(req.body, 'notas_medicas', 'medical_notes')),
      created_by_profile_id: profileId,
      activo: true,
    };

    const { data, error } = await supabase
      .from('crm_pacientes')
      .insert(payload)
      .select(CRM_FIELDS)
      .single();

    if (error) throw error;

    const { error: assignmentError } = await supabase
      .from('crm_asignaciones_fisio_paciente')
      .upsert({ fisioterapeuta_id: profileId, paciente_id: data.id, estado: 'activa' }, {
        onConflict: 'fisioterapeuta_id,paciente_id',
      });
    if (assignmentError) {
      await supabase.from('crm_pacientes').delete().eq('id', data.id);
      throw assignmentError;
    }

    res.status(201).json({ data: normalizeCrmPatient(data) });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = {
      nombre_completo: pickValue(req.body, 'nombre_completo', 'full_name'),
      fecha_nacimiento: pickValue(req.body, 'fecha_nacimiento', 'birth_date'),
      email: pickValue(req.body, 'email'),
      phone: pickValue(req.body, 'phone'),
      notas_medicas: pickValue(req.body, 'notas_medicas', 'medical_notes'),
    };

    const { data, error } = await supabase
      .from('pacientes')
      .update(payload)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('pacientes')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
