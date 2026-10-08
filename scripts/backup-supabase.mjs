// Native PostgreSQL backup. Never logs credentials or clinical rows.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const project = 'uewhbaejcouenoufuwlq';
const root = fileURLToPath(new URL('../', import.meta.url));

function connection(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('SUPABASE_DB_URL debe ser una URI PostgreSQL válida.'); }
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol), 'Se necesita una URI PostgreSQL, no la URL API.');
  const direct = url.hostname === `db.${project}.supabase.co`;
  const pooler = url.hostname.endsWith('.pooler.supabase.com') && url.username === `postgres.${project}`;
  assert.ok(direct || pooler, 'La conexión debe pertenecer al proyecto Fisio-IA-Agent autorizado.');
  assert.ok(!pooler || !url.port || url.port === '5432', 'Usa Session pooler (5432), no Transaction pooler.');
  assert.ok(url.password && !decodeURIComponent(url.password).includes('[YOUR-PASSWORD]'), 'Falta la contraseña real de base de datos.');
  assert.equal(url.pathname, '/postgres', 'La base autorizada es postgres.');
  const sslmode = url.searchParams.get('sslmode') || 'require';
  assert.ok(['require', 'verify-ca', 'verify-full'].includes(sslmode), 'La copia exige conexión cifrada.');
  return { PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: 'postgres', PGSSLMODE: sslmode,
    PGCONNECT_TIMEOUT: '20', PGOPTIONS: '-c default_transaction_read_only=on' };
}

if (process.argv.includes('--self-test')) {
  assert.equal(connection(`postgresql://postgres.${project}:test%40password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`).PGPASSWORD, 'test@password');
  for (const value of ['https://example.com', `postgresql://postgres:x@localhost/postgres`,
    `postgresql://postgres:x@db.${project}.supabase.co/postgres?sslmode=disable`,
    `postgresql://postgres.${project}:x@aws-0-eu-central-1.pooler.supabase.com/other`,
    `postgresql://postgres.${project}:x@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:[YOUR-PASSWORD]@db.${project}.supabase.co/postgres`]) assert.throws(() => connection(value));
  console.log('PASS: target, password, database and encrypted connection validation.');
} else {
  try {
    process.loadEnvFile(path.join(root, '.env.local'));
    if (process.argv.includes('--api') || !process.env.SUPABASE_DB_URL) {
      assert.equal(process.env.SUPABASE_PROJECT_REF, project, 'Proyecto de gestión inesperado.');
      assert.ok(process.env.SUPABASE_MANAGEMENT_PAT, 'Falta el acceso de gestión existente.');
      const query = await readFile(path.join(root, 'database/preflight/export_public_snapshot.sql'), 'utf8');
      const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query/read-only`, {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_PAT}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }), signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) throw new Error(`La exportación de solo lectura falló (HTTP ${response.status}); no se reintentó.`);
      const result = await response.json();
      const snapshot = result[0]?.snapshot;
      assert.equal(snapshot?.project, project, 'Exportación incompleta o de otro proyecto.');
      assert.equal(snapshot.unsupported, 0, 'Hay columnas que esta exportación no puede restaurar.');
      assert.equal(snapshot.auth_user_count, 0, 'Existen cuentas Auth: requieren una copia nativa antes de migrar.');
      assert.equal(snapshot.storage_object_count, 0, 'Existen archivos Storage: requieren copia independiente.');
      // ponytail: scoped to today's 31 application tables and empty Auth/Storage;
      // use the native dump or expand verification when this inventory changes.
      assert.equal(snapshot.tables.length, 31, 'Ha cambiado el inventario del esquema público; revisar el alcance antes de continuar.');
      const directory = path.join(root, '.private-backups', new Date().toISOString().replace(/[:.]/g, '-') + '-api');
      await mkdir(directory, { recursive: true });
      const bytes = JSON.stringify(snapshot);
      await writeFile(path.join(directory, 'public-snapshot.json'), bytes, { mode: 0o600 });
      await writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ project, created_at: snapshot.captured_at,
        sha256: createHash('sha256').update(bytes).digest('hex'), tables: snapshot.tables.length, restore_verified: false,
        scope: 'Public application schema/data, bucket metadata and migration history; excludes platform internals, Vault values, global roles and external configuration.' }, null, 2), { mode: 0o600 });
      console.log(`Copia lógica del CRM creada (31 tablas): ${directory}. Restauración pendiente.`);
      process.exit(0);
    }
    if (!process.env.SUPABASE_DB_URL) throw new Error('Falta SUPABASE_DB_URL en .env.local; no se ha realizado ninguna copia.');
    const env = { ...process.env, ...connection(process.env.SUPABASE_DB_URL) };
    // Empty PGSERVICEFILE makes libpq open an empty path; remove inherited overrides.
    delete env.PGSERVICE;
    delete env.PGSERVICEFILE;
    delete env.PGHOSTADDR;
    const bin = process.env.POSTGRES_BIN || 'C:\\Program Files\\PostgreSQL\\18\\bin';
    const executable = (name) => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
    for (const name of ['pg_dump', 'pg_restore']) assert.ok(existsSync(executable(name)), `Falta ${name}; configura POSTGRES_BIN.`);
    const directory = path.join(root, '.private-backups', new Date().toISOString().replace(/[:.]/g, '-'));
    await mkdir(directory, { recursive: true });
    const archive = path.join(directory, 'database.dump');
    // A failed/partial dump is retained without a success manifest. Never retry automatically.
    const dump = spawnSync(executable('pg_dump'), ['--format=custom', '--no-password', '--file', archive], { env, encoding: 'utf8', windowsHide: true });
    if (dump.status !== 0) throw new Error('pg_dump falló; copia incompleta. Comprueba conexión/permisos. No se reintentó ni se mostraron datos sensibles.');
    const listing = spawnSync(executable('pg_restore'), ['--list', archive], { encoding: 'utf8', windowsHide: true });
    if (listing.status !== 0) throw new Error('El archivo no pasó la comprobación de estructura de pg_restore.');
    await writeFile(path.join(directory, 'contents.list'), listing.stdout, { mode: 0o600 });
    await writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ project, created_at: new Date().toISOString(),
      bytes: (await stat(archive)).size, sha256: createHash('sha256').update(await readFile(archive)).digest('hex'),
      archive_structure_verified: true, restore_verified: false,
      scope: 'Database schema and data; excludes global roles, Storage binaries and external configuration.' }, null, 2), { mode: 0o600 });
    console.log(`Copia creada y estructura verificada: ${directory}. Falta comprobar su restauración local.`);
  } catch (error) {
    // Never print subprocess stderr or a connection URL: either may contain secrets.
    console.error(error.message);
    process.exitCode = 1;
  }
}
