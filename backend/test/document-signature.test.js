import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { deflateSync, crc32 } from 'node:zlib';

process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-server-key';
const { default: router } = await import('../src/routes/documents.js');
const { runWithRequestContext } = await import('../src/lib/supabase.js');

const chunk = (name, data) => {
  const bytes = Buffer.concat([Buffer.from(name), data]), size = Buffer.alloc(4), crc = Buffer.alloc(4);
  size.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(bytes));
  return Buffer.concat([size, bytes, crc]);
};
const header = Buffer.alloc(13);
header.writeUInt32BE(1); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
  chunk('IDAT', deflateSync(Buffer.from([0, 0, 0, 0, 255]))), chunk('IEND', Buffer.alloc(0))]);
const signature = 'data:image/png;base64,' + png.toString('base64');

function database(row) {
  const writes = [];
  return { writes, from() { let update, pendingOnly = false; return {
    select() { return this; }, eq(key, value) { if (key === 'estado' && value === 'pendiente') pendingOnly = true; return this; },
    update(value) { update = value; return this; },
    async single() { return this.maybeSingle(); },
    async maybeSingle() {
      if (update && pendingOnly && row?.estado !== 'pendiente') return { data: null };
      if (update) { writes.push(update); Object.assign(row, update); }
      return { data: row };
    },
  }; } };
}
async function invoke(path, db, body = {}) {
  const handler = router.stack.find(layer => layer.route?.path === path).route.stack[0].handle;
  const headers = {}, chunks = [];
  const res = new Writable({ write(chunk, _encoding, done) { chunks.push(chunk); done(); } });
  Object.assign(res, { headers, chunks, statusCode: 200, status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }, setHeader(key, value) {
      assert.doesNotMatch(value, /[\r\n\u0100-\uffff]/); headers[key] = value;
    } });
  const finished = new Promise(resolve => res.on('finish', resolve));
  await runWithRequestContext({ supabase: db }, () => handler({ body, query: {}, params: { id: 'document-a' } }, res, err => { res.error = err; }));
  if (headers['Content-Type']) await finished;
  return res;
}

test('solo una imagen PNG válida permite firmar; rechazos no escriben', async () => {
  for (const invalid of ['not-an-image', {}, 'data:image/png;base64,AAAA', signature.slice(0, -20),
    signature.replace(png.toString('base64'), Buffer.concat([png.subarray(0, 45), Buffer.from('invalid')]).toString('base64'))]) {
    const db = database({ id: 'document-a', estado: 'pendiente' });
    const res = await invoke('/:id/firmar', db, { firma_base64: invalid });
    assert.equal(res.statusCode, 400);
    assert.equal(db.writes.length, 0);
  }
  const db = database({ id: 'document-a', estado: 'pendiente' });
  assert.equal((await invoke('/:id/firmar', db, { firma_base64: signature })).statusCode, 200);
  assert.equal(db.writes[0].estado, 'firmado');
});

test('firmar no sustituye un documento ya firmado y distingue el inexistente', async () => {
  const db = database({ id: 'document-a', estado: 'firmado', firma_base64: 'previous' });
  assert.equal((await invoke('/:id/firmar', db, { firma_base64: signature })).statusCode, 409);
  assert.equal(db.writes.length, 0);
  const missing = await invoke('/:id/firmar', database(null), { firma_base64: signature });
  assert.equal(missing.statusCode, 404);
});

test('el PDF admite nombres Unicode y firmas PNG sin generar cabeceras inválidas', async () => {
  const db = database({ tipo: 'otro', titulo: 'Prueba', contenido: 'Documento ficticio', estado: 'firmado', firma_base64: signature,
    crm_pacientes: { nombre: '東京', apellidos: 'Peña' } });
  const res = await invoke('/:id/pdf', db);
  assert.equal(res.error, undefined);
  assert.match(res.headers['Content-Disposition'], /filename\*=UTF-8''otro_%E6%9D%B1%E4%BA%AC_Pe%C3%B1a.pdf/);
  assert.ok(Buffer.concat(res.chunks).subarray(0, 4).equals(Buffer.from('%PDF')));
});
