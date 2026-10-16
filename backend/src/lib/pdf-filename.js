export function inlinePdfFilename(name) {
  const filename = String(name).toWellFormed().replace(/[\r\n/\\]/g, '_');
  const fallback = filename.normalize('NFKD').replace(/[^\w.-]/g, '_');
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
