import { sanitizePayload } from './text';

export const fetchJson = async (url: string, options?: RequestInit, timeoutMs = 8000) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), ...options });
  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch {
      detail = '';
    }
    let message = detail ? `HTTP ${response.status}: ${detail.slice(0, 220)}` : `HTTP ${response.status}`;
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
