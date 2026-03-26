const TABLE_CHECKS = [
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
    severity: 'core',
    migration: 'database/schema_vnext.sql',
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
    severity: 'optional',
    migration: 'database/migrations/009_crm_facturas.sql',
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

const buildCheckMessage = (check, error) => {
  if (isMissingTableError(check.table, error)) {
    return `Falta tabla ${check.table}. Ejecuta ${check.migration}.`;
  }

  return String(error?.message || `No se pudo verificar ${check.table}.`);
};

const checkTable = async (supabase, check) => {
  const { error } = await supabase.from(check.table).select('*', { head: true, count: 'exact' }).limit(1);

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
        total_checks: TABLE_CHECKS.length,
        ok_checks: 0,
        missing_checks: 0,
        error_checks: 0,
        core_missing: 0,
        optional_missing: 0,
      },
      checks: [],
      missing_tables: [],
      message: 'Faltan credenciales de Supabase en el backend.',
    };
  }

  let checks;

  try {
    checks = await Promise.all(TABLE_CHECKS.map((check) => checkTable(supabase, check)));
  } catch (error) {
    return {
      status: 'error',
      service: 'fisio-ia-agent-api',
      timestamp: new Date().toISOString(),
      environment: envStatus,
      summary: {
        total_checks: TABLE_CHECKS.length,
        ok_checks: 0,
        missing_checks: 0,
        error_checks: 1,
        core_missing: 0,
        optional_missing: 0,
      },
      checks: [],
      missing_tables: [],
      message: String(error?.message || 'No se pudo completar la comprobacion de readiness.'),
    };
  }

  const missingTables = checks.filter((check) => check.status === 'missing');
  const errorChecks = checks.filter((check) => check.status === 'error');
  const coreIssues = checks.filter((check) => check.severity === 'core' && check.status !== 'ok');
  const optionalIssues = checks.filter((check) => check.severity === 'optional' && check.status !== 'ok');

  const status = coreIssues.length || errorChecks.length
    ? 'error'
    : optionalIssues.length
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
