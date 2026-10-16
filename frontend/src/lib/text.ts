export const MOJIBAKE_RE = /(?:\u00C3|\u00C2|\u00E2|\u00F0|\u00D0|\u00D1|\uFFFD|\u0153|\u0152|\u0161|\u0178|\u00EF\u00BF\u00BD)/;
const CP1252_UNICODE_TO_BYTE: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};
const toLegacyBytes = (text: string) => {
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const mapped = CP1252_UNICODE_TO_BYTE[code];
    if (typeof mapped === 'number') {
      bytes.push(mapped);
      continue;
    }
    return null;
  }
  return new Uint8Array(bytes);
};
const decodeUtf8Bytes = (bytes: Uint8Array) => {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return ''; } // Ambiguous bytes must never replace a valid patient name with �.
};
export const decodeMojibake = (value: unknown) => {
  let current = String(value ?? '');
  if (!MOJIBAKE_RE.test(current)) return current;

  for (let pass = 0; pass < 3; pass += 1) {
    const bytes = toLegacyBytes(current);
    if (!bytes) return current;
    const decoded = decodeUtf8Bytes(bytes);
    if (!decoded || decoded === current) return current;
    current = decoded;
    if (!MOJIBAKE_RE.test(current)) break;
  }

  return current.normalize('NFC');
};
export const sanitizeText = (value: unknown) => decodeMojibake(value).replace(/\u0000/g, '');
export const sanitizePayload = (value: any): any => {
  if (typeof value === 'string') return sanitizeText(value);
  if (Array.isArray(value)) return value.map(sanitizePayload);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizePayload(item)]));
  return value;
};
