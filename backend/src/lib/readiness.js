import { publicErrorMessage } from './public-error.js';

const TABLE_CHECKS = [
  {
    key: 'calendar_verification', label: 'Comprobación verificada de Calendar', table: 'crm_citas',
    columns: 'calendar_sync_in_flight, calendar_sync_operation_id, calendar_sync_calendar_id', severity: 'core',
    migration: 'database/migrations/20261008090742_appointment_calendar_verification.sql',
  },
  {
    key: 'calendar_persistence', label: 'Guardado de citas antes de Calendar', table: 'crm_citas', columns: 'calendar_sync_pending', severity: 'core',
    migration: 'database/migrations/20261008064542_appointment_calendar_pending.sql',
  },
  {
    key: 'financial_integrity', label: 'Vinculación de cobros y facturas', table: 'crm_pagos', columns: 'factura_id', severity: 'core',
    migration: 'database/migrations/20261007154552_financial_integrity.sql',
  },
  {
    key: 'exercise_approval',
    label: 'Contenido y revisión de planes',
    table: 'crm_recomendaciones',
    columns: 'report_snapshot, report_version, reviewed_at, reviewed_by_profile_id',
    severity: 'core',
    migration: 'database/migrations/20261007094023_clinical_approval_integrity.sql',
  },
  {
    key: 'clinicas',
    label: 'Clinicas CRM',
    table: 'crm_clinicas',
    severity: 'core',
    migration: 'database/migrations/20261007091159_clinic_isolation.sql',
  },
  {
    key: 'pacientes',
    label: 'Pacientes CRM',
    table: 'crm_pacientes',
    severity: 'core',
    migration: 'database/schema_vnext.sql',
  },
  {
    key: 'citas',
    label: 'Citas CRM',
    table: 'crm_citas',
    columns: 'request_id, public_booking_hash',
    severity: 'core',
    migration: 'database/migrations/20261007214504_public_booking_retries.sql',
  },
  {
    key: 'pagos',
    label: 'Pagos CRM',
    table: 'crm_pagos',
    severity: 'core',
    migration: 'database/migrations/007_crm_pagos.sql',
  },
  {
    key: 'notas_clinicas',
    label: 'Notas clinicas',
    table: 'crm_notas_clinicas',
    severity: 'core',
    migration: 'database/migrations/008_ficha_paciente_enriquecida.sql',
  },
  {
    key: 'facturas',
    label: 'Facturacion',
    table: 'crm_facturas',
    columns: 'id, exencion_iva',
    severity: 'optional',
    migration: 'database/migrations/20261007154552_financial_integrity.sql',
  },
  {
    key: 'documentos',
    label: 'Documentos',
    table: 'crm_documentos',
    severity: 'optional',
    migration: 'database/migrations/010_crm_documentos.sql',
  },
  {
    key: 'bonos',
    label: 'Bonos',
    table: 'crm_bonos',
    severity: 'optional',
    migration: 'database/migrations/011_crm_bonos.sql',
  },
];

const isMissingTableError = (table, error) => {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  return code === 'PGRST205' || (message.includes(table.toLowerCase()) && (message.includes('schema cache') || message.includes('could not find the table')));
};

const hasValue = (env, key) => Boolean(String(env?.[key] || '').trim());

const hasAll = (env, keys) => keys.every((key) => hasValue(env, key));

export function buildIntegrationConfigurationReport(env = {}) {
  const directCalendar = hasAll(env, ['GOOGLE_CALENDAR_ID', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY']);
  const n8nCalendar = hasAll(env, ['W5_CALENDAR_READER_URL', 'W6_CALENDAR_WRITER_URL', 'N8N_WEBHOOK_SECRET']);
  const directAi = hasValue(env, 'OPENAI_API_KEY');
  const n8nAi = hasAll(env, ['N8N_EXERCISE_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET']);

  const integrations = [
    {
      key: 'supabase',
      label: 'Supabase PostgreSQL',
      criticality: 'core',
      status: hasAll(env, ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) ? 'configured' : 'missing',
      mode: 'service_role_and_user_jwt',
    },
    {
      key: 'clinical_ai',
      label: 'Motor IA clínico',
      criticality: 'core',
      status: directAi || n8nAi ? 'configured' : 'missing',
      mode: directAi ? 'openai_direct' : n8nAi ? 'n8n_webhook' : null,
    },
    {
      key: 'agent_orchestration',
      label: 'Orquestación n8n',
      criticality: 'optional',
      status: hasAll(env, ['N8N_AGENT_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET']) ? 'configured' : 'missing',
      mode: 'signed_webhook',
    },
    {
      key: 'telegram_patient',
      label: 'Entrega al paciente por Telegram',
      criticality: 'optional',
      status: hasAll(env, ['TELEGRAM_PATIENT_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET']) ? 'configured' : 'missing',
      mode: 'patient_bot',
    },
    {
      key: 'whatsapp_pilot',
      label: 'WhatsApp de pruebas',
      criticality: env.OPENWA_PILOT_ENABLED === 'true' ? 'core' : 'optional',
      status: env.OPENWA_PILOT_ENABLED !== 'true' ? 'not_used'
        : hasAll(env, ['OPENWA_BASE_URL', 'OPENWA_API_KEY', 'OPENWA_SESSION_ID', 'OPENWA_WEBHOOK_SECRET', 'MESSAGING_PILOT_CLINIC_ID', 'MESSAGING_PILOT_PROFESSIONAL_ID']) ? 'configured' : 'missing',
      mode: 'openwa_single_clinic_pilot',
      note: 'Configuración declarada; no comprueba conexión del número ni entrega de mensajes.',
    },
    {
      key: 'telegram_booking_pilot',
      label: 'Reservas de pruebas por Telegram',
      criticality: env.TELEGRAM_PILOT_BOOKING_ENABLED === 'true' ? 'core' : 'optional',
      status: env.TELEGRAM_PILOT_BOOKING_ENABLED !== 'true' ? 'not_used'
        : hasAll(env, ['TELEGRAM_PATIENT_BOT_TOKEN', 'TELEGRAM_PILOT_WEBHOOK_SECRET', 'MESSAGING_PILOT_CLINIC_ID', 'MESSAGING_PILOT_PROFESSIONAL_ID']) ? 'configured' : 'missing',
      mode: 'shared_patient_booking_pilot',
    },
    {
      key: 'google_calendar',
      label: 'Google Calendar',
      criticality: String(env.GOOGLE_CALENDAR_REQUIRED || '').toLowerCase() === 'true' ? 'core' : 'optional',
      status: directCalendar || n8nCalendar ? 'configured' : 'missing',
      mode: directCalendar ? 'service_account' : n8nCalendar ? 'n8n_oauth_bridge' : null,
    },
    {
      key: 'gmail',
      label: 'Alertas internas por Gmail',
      criticality: 'optional',
      status: hasAll(env, ['N8N_ERROR_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET']) ? 'configured' : 'missing',
      mode: 'n8n_gmail_oauth',
      note: 'El backend entrega incidencias a n8n; la credencial OAuth de Gmail debe verificarse dentro del workflow de errores.',
    },
  ];

  return {
    checks: integrations,
    summary: {
      total_checks: integrations.length,
      configured_checks: integrations.filter((item) => item.status === 'configured').length,
      missing_core: integrations.filter((item) => item.criticality === 'core' && item.status === 'missing').length,
      missing_optional: integrations.filter((item) => item.criticality === 'optional' && item.status === 'missing').length,
      not_used: integrations.filter((item) => item.status === 'not_used').length,
    },
  };
}

const buildCheckMessage = (check, error) => {
  if (isMissingTableError(check.table, error)) {
    return `Falta tabla ${check.table}. Ejecuta ${check.migration}.`;
  }

  return publicErrorMessage(error, `No se pudo verificar ${check.table}.`);
};

const checkTable = async (supabase, check) => {
  const { error } = await supabase.from(check.table).select(check.columns || '*', { head: true, count: 'exact' }).limit(1);

  if (!error) {
    return {
      key: check.key,
      label: check.label,
      table: check.table,
      severity: check.severity,
      migration: check.migration,
      status: 'ok',
    };
  }

  return {
    key: check.key,
    label: check.label,
    table: check.table,
    severity: check.severity,
    migration: check.migration,
    status: isMissingTableError(check.table, error) ? 'missing' : 'error',
    message: buildCheckMessage(check, error),
    code: error.code || null,
  };
};

export async function buildReadinessReport({ supabase, env }) {
  const integrationReport = buildIntegrationConfigurationReport(env);
  const tableChecks = [...TABLE_CHECKS];
  if (env.OPENWA_PILOT_ENABLED === 'true' || env.TELEGRAM_PILOT_BOOKING_ENABLED === 'true') {
    for (const table of ['crm_mensajeria_vinculos', 'crm_mensajeria_eventos', 'crm_whatsapp_envios']) tableChecks.push({
      key: table, table, label: table, severity: 'core', migration: 'database/migrations/20261007101248_messaging_pilot.sql',
    });
  }
  const envStatus = {
    supabase_url_configured: Boolean(env.SUPABASE_URL),
    supabase_service_role_configured: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  };

  if (!envStatus.supabase_url_configured || !envStatus.supabase_service_role_configured) {
    return {
      status: 'error',
      service: 'fisio-ia-agent-api',
      timestamp: new Date().toISOString(),
      environment: envStatus,
      summary: {
        total_checks: tableChecks.length,
        ok_checks: 0,
        missing_checks: 0,
        error_checks: 0,
        core_missing: 0,
        optional_missing: 0,
      },
      checks: [],
      integrations: integrationReport.checks,
      integration_summary: integrationReport.summary,
      missing_tables: [],
      message: 'Faltan credenciales de Supabase en el backend.',
    };
  }

  let checks;

  try {
    checks = await Promise.all(tableChecks.map((check) => checkTable(supabase, check)));
    // Null input cannot create a row. service_role must be denied; PGRST202 means the migration is absent.
    const creation = await supabase.rpc('create_clinic_record_once', {operation_id:null,kind:null,fields:null});
    checks.push({key:'creation_retries',label:'Guardados sin duplicados',severity:'core',
      migration:'database/migrations/20261007201534_clinic_creation_retries.sql',
      status:creation.error?.code==='42501' ? 'ok' : creation.error?.code==='PGRST202' ? 'missing' : 'error',
      ...(creation.error?.code==='42501' ? {} : {message:'No se pudo verificar la protección de altas. Revisa la migración de guardados.',code:creation.error?.code || null}),
    });
  } catch (error) {
    return {
      status: 'error',
      service: 'fisio-ia-agent-api',
      timestamp: new Date().toISOString(),
      environment: envStatus,
      summary: {
        total_checks: tableChecks.length,
        ok_checks: 0,
        missing_checks: 0,
        error_checks: 1,
        core_missing: 0,
        optional_missing: 0,
      },
      checks: [],
      integrations: integrationReport.checks,
      integration_summary: integrationReport.summary,
      missing_tables: [],
      message: publicErrorMessage(error, 'No se pudo completar la comprobacion de readiness.'),
    };
  }

  const missingTables = checks.filter((check) => check.status === 'missing');
  const errorChecks = checks.filter((check) => check.status === 'error');
  const coreIssues = checks.filter((check) => check.severity === 'core' && check.status !== 'ok');
  const optionalIssues = checks.filter((check) => check.severity === 'optional' && check.status !== 'ok');

  const status = coreIssues.length || errorChecks.length || integrationReport.summary.missing_core
    ? 'error'
    : optionalIssues.length || integrationReport.summary.missing_optional
      ? 'degraded'
      : 'ok';

  return {
    status,
    service: 'fisio-ia-agent-api',
    timestamp: new Date().toISOString(),
    environment: envStatus,
    summary: {
      total_checks: checks.length,
      ok_checks: checks.filter((check) => check.status === 'ok').length,
      missing_checks: missingTables.length,
      error_checks: errorChecks.length,
      core_missing: checks.filter((check) => check.severity === 'core' && check.status === 'missing').length,
      optional_missing: checks.filter((check) => check.severity === 'optional' && check.status === 'missing').length,
    },
    checks,
    integrations: integrationReport.checks,
    integration_summary: integrationReport.summary,
    missing_tables: missingTables,
    message: status === 'ok'
      ? 'Backend y tablas CRM listos.'
      : status === 'degraded'
        ? 'Backend operativo con modulos opcionales pendientes de migracion.'
        : 'Readiness incompleta: faltan tablas core o hay errores de conectividad.',
  };
}

export function getReadinessStatusCode(report) {
  return report.status === 'error' ? 503 : 200;
}
