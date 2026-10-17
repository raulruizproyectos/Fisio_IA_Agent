import { sanitizePayload } from './text';

// Plain-Spanish fallbacks: a physiotherapist must never read «HTTP 502: <html…>» or a browser abort message.
const statusMessage = (status: number) => {
  if (status === 401) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
  if (status === 403) return 'No tienes permiso para hacer esta acción.';
  if (status === 404) return 'No se ha encontrado lo que buscabas. Actualiza la página.';
  if (status === 409) return 'Los datos han cambiado mientras trabajabas. Actualiza y vuelve a intentarlo.';
  if (status === 413) return 'El archivo o el texto es demasiado grande.';
  if (status === 429) return 'Demasiadas peticiones seguidas. Espera un momento y vuelve a intentarlo.';
  if (status >= 500) return 'El servidor no ha podido completar la acción. Inténtalo de nuevo en unos minutos.';
  return 'No se pudo completar la acción. Revisa los datos e inténtalo de nuevo.';
};

export const fetchJson = async (url: string, options?: RequestInit, timeoutMs = 8000) => {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), ...options });
  } catch (err: any) {
    // Keeps the original name so timeout checks still work; no status means the result is unknown.
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    throw Object.assign(new Error(timedOut
      ? 'El servidor está tardando demasiado en responder. Comprueba la conexión y vuelve a intentarlo.'
      : 'No hay conexión con el servidor. Comprueba tu conexión a internet.', { cause: err }), { name: err?.name || 'Error' });
  }
  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch {
      detail = '';
    }
    let message = statusMessage(response.status);
    let code = '';
    let recoveredData: unknown = null;
    if (detail) {
      try {
        const errorPayload = JSON.parse(detail);
        message = String(errorPayload?.error || errorPayload?.message || message);
        code = String(errorPayload?.code || '');
        if (code === 'CREATE_ALREADY_SAVED') recoveredData = errorPayload.data;
      } catch {}
    }
    throw Object.assign(new Error(message), { status: response.status, code: code || null, recoveredData });
  }
  const payload = await response.json();
  return sanitizePayload(payload);
};
