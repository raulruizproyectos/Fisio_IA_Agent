import { supabase } from './supabase.js';

export async function createOnce(req, res, kind, fields, normalize = value => value) {
  const key=req.get?.('Idempotency-Key');
  if (!key) return false;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
    res.status(400).json({error:'Identificador de guardado inválido'}); return true;
  }
  const {data,error}=await supabase.rpc('create_clinic_record_once',{operation_id:key,kind,fields});
  if (error) {
    error.status=error.code==='42501' ? 403 : /^PT(400|404|409)$/.test(error.code) ? Number(error.code.slice(2)) : /^22/.test(error.code) ? 400 : 503;
    throw error; // Never fall back to a second, unprotected INSERT.
  }
  if (!data?.data?.id) throw Object.assign(new Error('No se pudo confirmar el guardado'),{status:503});
  res.status(data.conflict ? 409 : data.replayed ? 200 : 201).json({
    data:normalize(data.data),replayed:data.replayed,
    ...(data.conflict ? {code:'CREATE_ALREADY_SAVED',error:'El guardado anterior ya existe. Los cambios nuevos siguen en el formulario; guarda para actualizarlo.'} : {}),
  });
  return true;
}
