// Provider/SQL diagnostics may contain credentials, patient values or stack traces.
export function publicErrorMessage(error, fallback) {
  return process.env.NODE_ENV === 'production' ? fallback : String(error?.message || error || fallback);
}

export function publicHttpErrorMessage(error, status, fallback = 'No se pudo completar la solicitud.') {
  // ponytail: PT messages must stay fixed; map them explicitly if an RPC starts interpolating private values.
  if (status < 500 && (error?.expose === true || /^PT(400|404|409)$/.test(error?.code || ''))) return error.message;
  return publicErrorMessage(error, fallback);
}
