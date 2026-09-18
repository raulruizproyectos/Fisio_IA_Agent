import { serviceSupabase } from './supabase.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

export function resolveActorType(auth) {
  if (!auth) return 'system';
  if (auth.actor_type === 'telegram') return 'telegram';
  if (auth.actor_type === 'internal') return 'system';
  if (auth.actor_type === 'public_booking') return 'paciente';
  if (auth.role === 'admin') return 'admin';
  if (auth.role === 'fisioterapeuta') return 'fisioterapeuta';
  return 'system';
}

/**
 * Registra una acción de auditoría en public.crm_audit_log utilizando el cliente privilegiado (service_role),
 * tal como exige la política de seguridad RLS donde anon y authenticated tienen REVOKE directo.
 */
export async function recordAudit(req, {
  entity_type,
  entity_id = null,
  action,
  before_state = null,
  after_state = null,
  metadata = {},
}) {
  if (!entity_type || !action) {
    return null;
  }

  const auth = req?.auth || null;
  const actorType = resolveActorType(auth);
  const actorId = isValidUuid(auth?.profile_id) ? auth.profile_id : null;
  const requestId = isValidUuid(req?.id) ? req.id : null;
  const cleanEntityId = isValidUuid(entity_id) ? entity_id : null;

  const extraMetadata = {
    ...metadata,
    ip: req?.ip || req?.headers?.['x-forwarded-for'] || null,
    userAgent: req?.get ? req.get('user-agent') : null,
  };

  if (entity_id && !cleanEntityId) {
    extraMetadata.raw_entity_id = String(entity_id);
  }
  if (req?.id && !requestId) {
    extraMetadata.custom_request_id = String(req.id);
  }

  const payload = {
    entity_type: String(entity_type).trim(),
    entity_id: cleanEntityId,
    action: String(action).trim(),
    actor_type: actorType,
    actor_id: actorId,
    request_id: requestId,
    before_state: before_state ? JSON.parse(JSON.stringify(before_state)) : null,
    after_state: after_state ? JSON.parse(JSON.stringify(after_state)) : null,
    metadata: extraMetadata,
  };

  try {
    const { data, error } = await serviceSupabase
      .from('crm_audit_log')
      .insert(payload)
      .select('id, created_at')
      .maybeSingle();

    if (error) {
      // No propagar fallo de inserción de auditoría para no romper el flujo del usuario si la tabla no está en el entorno local
      return { ok: false, error: error.message, payload };
    }
    return { ok: true, id: data?.id, payload };
  } catch (err) {
    return { ok: false, error: err.message, payload };
  }
}
