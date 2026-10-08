import { publicHttpErrorMessage } from './public-error.js';

export function isMoney(value, allowZero = false) {
  return ['number', 'string'].includes(typeof value) && /^\d{1,6}(\.\d{1,2})?$/.test(String(value).trim())
    && (allowZero ? Number(value) >= 0 : Number(value) > 0);
}

export function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

export function respondFinanceError(res, error) {
  const status = /^PT(400|404|409)$/.exec(error.code || '')?.[1]
    || (error.code === '42501' ? 403 : error.code === 'PGRST202' ? 503 : error.code === '23514' ? 400 : 500);
  return res.status(Number(status)).json({ error: Number(status) === 503 ? 'Este módulo está pendiente de actualizar en la base de datos.'
    : publicHttpErrorMessage(error, Number(status), 'No se pudo completar la operación financiera.'), code: error.code });
}
