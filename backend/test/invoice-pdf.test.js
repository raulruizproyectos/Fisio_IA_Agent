import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import PDFDocument from 'pdfkit';

process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-server-key';
const { default: router } = await import('../src/routes/invoices.js');
const { runWithRequestContext } = await import('../src/lib/supabase.js');

test('facturas largas conservan filas legibles, saltos de página y totales', async t => {
  const rowEnds = new Map(), rows = [];
  const originalText = PDFDocument.prototype.text;
  t.mock.method(PDFDocument.prototype, 'text', function (text, x, y, options) {
    if (String(text).startsWith('Fixture session')) {
      const height = this.heightOfString(text, { width: 260 });
      assert.ok(y >= (rowEnds.get(this.page) || 0), 'Invoice concepts must not overlap previous rows');
      assert.ok(y + height <= this.page.height - this.page.margins.bottom, 'Rows must fit before the footer margin');
      rowEnds.set(this.page, y + height);
      rows.push(text);
    }
    return originalText.call(this, text, x, y, options);
  });
  const invoice = { numero: 'F-2026-01', fecha: '2026-10-16', importe_bruto: 100, importe_iva: 0, importe_total: 100, iva_pct: 0,
    crm_pacientes: { nombre: 'Fixture Patient' },
    lineas: Array.from({ length: 100 }, (_, id) => ({ concepto: `Fixture session ${id}: ` + 'Concepto largo que debe conservarse sin solapar otra fila. '.repeat(3), fecha: '2026-10-16', importe: 1 })),
  };
  const db = { from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: invoice }; } }; } };
  const chunks = [], res = new Writable({ write(chunk, _enc, next) { chunks.push(chunk); next(); } });
  res.setHeader = () => {};
  const finished = new Promise(resolve => res.on('finish', resolve));
  const handler = router.stack.find(layer => layer.route?.path === '/:id/pdf').route.stack[0].handle;
  let failure;
  await runWithRequestContext({ supabase: db }, () => handler({ params: { id: 'invoice-a' }, query: {} }, res, error => { failure = error; }));
  if (failure) { res.destroy(); throw failure; }
  await finished;
  assert.equal(rows.length, 100);
  const pdf = Buffer.concat(chunks);
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.ok(rowEnds.size > 1);
});
