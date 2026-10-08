// Local-only restoration of the API snapshot and rehearsal of the pending SQL.
// Auth/Vault here are empty compatibility fixtures, not a Supabase platform clone.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.resolve(process.argv[2] || '');
assert.ok(directory.startsWith(path.join(root, '.private-backups') + path.sep), 'La copia debe estar en .private-backups.');
const bytes = await readFile(path.join(directory, 'public-snapshot.json'), 'utf8');
const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256, 'Checksum de copia incorrecto.');
const snapshot = JSON.parse(bytes);
assert.equal(snapshot.project, 'uewhbaejcouenoufuwlq');
assert.equal(snapshot.unsupported, 0);
assert.equal(snapshot.auth_user_count, 0);
manifest.restore_verified = false;
manifest.migrations_verified = false;
manifest.mapping_verified = false;
delete manifest.verified_at;
delete manifest.migration_sha256;
delete manifest.mapping_verified_at;
delete manifest.mapping_sql_sha256;
await writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2));
const packageDir = process.env.PGLITE_PACKAGE_DIR;
const load = (entry) => import(packageDir ? pathToFileURL(path.join(packageDir, 'dist', entry + '.js')).href
  : '@electric-sql/pglite' + (entry === 'index' ? '' : '/' + entry));
const [{ PGlite }, { pgcrypto }, { uuid_ossp }, { btree_gist }] = await Promise.all([
  load('index'), load('contrib/pgcrypto'), load('contrib/uuid_ossp'), load('contrib/btree_gist'),
]);
const db = await PGlite.create({ extensions: { pgcrypto, uuid_ossp, btree_gist } });
const q = (value) => '"' + value.replaceAll('"', '""') + '"';
const role = (value) => value === 'PUBLIC' ? 'PUBLIC' : q(value);
let phase = 'restore';
try {
  const owner = (await db.query('select current_user as name')).rows[0].name;
  const roles = new Set(['anon','authenticated','service_role',
    ...(snapshot.table_grants || []).map(g => g.role), ...(snapshot.function_grants || []).map(g => g.role),
    ...(snapshot.column_grants || []).map(g => g.role), ...(snapshot.policies || []).flatMap(p => p.roles)]);
  for (const name of roles) if (name !== 'PUBLIC' && name !== 'public' && name !== owner)
    await db.exec(`create role ${q(name)} ${name === 'service_role' ? 'bypassrls' : ''}`);
  await db.exec(`create schema auth; create schema extensions; create schema vault;
    create table auth.users (id uuid primary key);
    create table vault.decrypted_secrets (name text, decrypted_secret text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    create extension pgcrypto with schema extensions;
    create extension "uuid-ossp" with schema extensions;
    set search_path=public,extensions;
    set check_function_bodies=false;`);
  for (const s of snapshot.sequences || []) {
    await db.exec(`create sequence public.${q(s.name)} as ${s.type} increment ${s.increment} minvalue ${s.min} maxvalue ${s.max} start ${s.start} cache ${s.cache} ${s.cycle ? '' : 'no '}cycle`);
  }
  for (const t of snapshot.tables) await db.exec(`create table public.${q(t.name)} (${t.columns.map(c =>
    `${q(c.name)} ${c.type}${c.default ? ' default ' + c.default : ''}${c.not_null ? ' not null' : ''}`).join(',')})`);
  for (const f of snapshot.functions || []) await db.exec(f.definition);
  for (const t of snapshot.tables) {
    const columns = t.columns.map(c => q(c.name)).join(',');
    await db.query(`insert into public.${q(t.name)} (${columns}) select ${columns} from jsonb_populate_recordset(null::public.${q(t.name)}, $1::jsonb)`, [t.rows]);
  }
  for (const kind of ['p','u','c','f','x']) for (const c of snapshot.constraints || []) if (c.kind === kind)
    await db.exec(`alter table public.${q(c.table)} add constraint ${q(c.name)} ${c.definition}`);
  for (const sql of snapshot.indexes || []) await db.exec(sql);
  for (const sql of snapshot.triggers || []) await db.exec(sql);
  for (const p of snapshot.policies || []) await db.exec(`create policy ${q(p.policyname)} on public.${q(p.tablename)}
    as ${p.permissive} for ${p.cmd} to ${p.roles.map(r => r === 'public' ? 'PUBLIC' : role(r)).join(',')}
    ${p.qual ? 'using (' + p.qual + ')' : ''} ${p.with_check ? 'with check (' + p.with_check + ')' : ''}`);
  for (const t of snapshot.tables) {
    await db.exec(`revoke all on public.${q(t.name)} from PUBLIC,anon,authenticated,service_role`);
    if (t.rls) await db.exec(`alter table public.${q(t.name)} enable row level security`);
    if (t.force_rls) await db.exec(`alter table public.${q(t.name)} force row level security`);
  }
  for (const f of snapshot.functions || []) await db.exec(`revoke all on function ${f.identity} from PUBLIC,anon,authenticated,service_role`);
  for (const g of snapshot.table_grants || []) await db.exec(`grant ${g.privilege} on ${g.kind === 'S' ? 'sequence' : 'table'} public.${q(g.name)} to ${role(g.role)} ${g.grantable ? 'with grant option' : ''}`);
  for (const g of snapshot.function_grants || []) await db.exec(`grant ${g.privilege} on function ${g.identity} to ${role(g.role)} ${g.grantable ? 'with grant option' : ''}`);
  for (const g of snapshot.column_grants || []) await db.exec(`grant ${g.privilege} (${q(g.column)}) on public.${q(g.table)} to ${role(g.role)} ${g.grantable ? 'with grant option' : ''}`);
  for (const s of snapshot.sequences || []) {
    if (s.owner) await db.exec(`alter sequence public.${q(s.name)} owned by ${s.owner}`);
    await db.query(`select setval($1::regclass,$2::bigint,$3)`, ['public.' + q(s.name),s.last_value || s.start,Boolean(s.last_value)]);
  }
  // Compare canonical PostgreSQL JSON, avoiding JS numeric conversion of clinical data.
  const counts = {};
  for (const t of snapshot.tables) {
    const actual = (await db.query(`select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb)::text as data, count(*)::int as total from public.${q(t.name)} r`)).rows[0];
    assert.equal(actual.data, t.rows, `Restauración distinta en ${t.name}`);
    counts[t.name] = actual.total;
  }
  assert.equal((await db.query("select count(*)::int n from pg_policies where schemaname='public'")).rows[0].n, snapshot.policies.length);
  const vaultAccess = (await db.query(`select has_function_privilege('anon','public.vault_read_secret(text)','EXECUTE') a,
    has_function_privilege('authenticated','public.vault_read_secret(text)','EXECUTE') b,
    has_function_privilege('service_role','public.vault_read_secret(text)','EXECUTE') c`)).rows[0];
  assert.deepEqual(vaultAccess,{a:false,b:false,c:true});
  await writeFile(path.join(directory, 'restore-verification.json'), JSON.stringify({ public_schema_restored: true,
    all_rows_equal: true, tables: counts, policies: snapshot.policies.length, vault_permissions_preserved: true,
    limitations: 'Local Auth/Vault fixtures. Does not verify Supabase Auth, PostgREST, platform internals or external services.' },null,2));
  manifest.restore_verified = true;
  manifest.restore_scope = 'All 31 public tables and rows; application constraints, indexes, triggers, policies and grants. Empty local Auth/Vault fixtures.';
  await writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log('PASS: 31 public tables restored; every row equals the source snapshot; policies and Vault access preserved.');

  await db.exec('set check_function_bodies=true');
  const migrationHashes = {};
  for (const file of ['20260901_production_security_hardening.sql','20261007091159_clinic_isolation.sql',
    '20261007094023_clinical_approval_integrity.sql','20261007101248_messaging_pilot.sql']) {
    phase = file;
    const sql = await readFile(path.join(root,'database/migrations',file),'utf8');
    migrationHashes[file] = createHash('sha256').update(sql).digest('hex');
    await db.exec(sql);
    console.log('PASS: local migration ' + file);
  }
  phase = 'migration-verification';
  for (const [table,total] of Object.entries(counts)) if (table !== 'crm_audit_log')
    assert.equal((await db.query(`select count(*)::int n from public.${q(table)}`)).rows[0].n,total,`Registros conservados: ${table}`);
  assert.equal((await db.query("select count(*)::int n from crm_recomendaciones where estado='generada'")).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from crm_recomendaciones where report_snapshot is not null')).rows[0].n,counts.crm_recomendaciones);
  assert.equal((await db.query("select count(*)::int n from pg_constraint where conrelid='crm_citas'::regclass and contype='x'")).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from crm_perfiles where clinica_id is null')).rows[0].n,counts.crm_perfiles);
  assert.equal((await db.query('select count(*)::int n from crm_pacientes where clinica_id is null')).rows[0].n,counts.crm_pacientes);
  await db.exec('set role authenticated');
  assert.equal((await db.query('select count(*)::int n from crm_pacientes')).rows[0].n,0);
  await db.exec('reset role');
  const verifiedAt = new Date().toISOString();
  await writeFile(path.join(directory,'migration-verification.json'),JSON.stringify({ verified_at: verifiedAt, migrations_passed: true,
    migration_sha256: migrationHashes,
    source_rows_preserved: true, stored_reports_recovered: counts.crm_recomendaciones,
    appointment_exclusion: true, unmapped_data_preserved_and_hidden: true,
    cloud_changes: false, production_mapping: 'Pending explicit clinic and Auth account.' },null,2));
  manifest.migrations_verified = true;
  manifest.verified_at = verifiedAt;
  manifest.migration_sha256 = migrationHashes;
  await writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log('PASS: source records preserved, stored reports recovered, appointment exclusion installed; unmapped records remain hidden.');

  if (process.argv[3]) {
    phase = 'single-clinic-mapping';
    const cfg = JSON.parse(await readFile(path.resolve(process.argv[3]),'utf8'));
    assert.equal(cfg.project,snapshot.project);
    assert.equal(cfg.source_snapshot_sha256,manifest.sha256);
    // Only an in-memory Auth fixture; never creates or connects a real account.
    cfg.auth_user_id = '00000000-0000-4000-8000-000000000801';
    await db.exec('alter table auth.users add column email text');
    await db.query('insert into auth.users(id,email) values($1,$2)',[cfg.auth_user_id,cfg.email]);
    const setupSql = await readFile(path.join(root,'database/setup/assign_single_clinic.sql'),'utf8');
    const mapClinic = async (config) => {
      await db.exec('begin');
      try {
        await db.query("select set_config('app.clinic_setup',$1,true)",[JSON.stringify(config)]);
        await db.exec(setupSql);
        await db.exec('commit');
      } catch (error) { await db.exec('rollback'); throw error; }
    };
    const canonical = async (table) => (await db.query(`select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb)::text data from public.${q(table)} r`)).rows[0].data;
    const before = Object.fromEntries(await Promise.all(Object.keys(counts).map(async table => [table,await canonical(table)])));
    await assert.rejects(mapClinic({...cfg,email:'unmatched@example.invalid'}),e=>e.code==='P0001');
    await assert.rejects(mapClinic({...cfg,unowned_patient_ids:cfg.unowned_patient_ids.slice(1)}),e=>e.code==='P0001');
    const unexpectedClinic = '00000000-0000-4000-8000-000000000803';
    await db.query("insert into crm_clinicas(id,nombre) values($1,'Unexpected local fixture')",[unexpectedClinic]);
    await assert.rejects(mapClinic(cfg),e=>e.code==='P0001');
    await db.query('delete from crm_clinicas where id=$1',[unexpectedClinic]);
    // Force a failure after profile changes: all mapping and audit must roll back.
    await db.exec(`create function public.fail_mapping_audit() returns trigger language plpgsql as $$
      begin if new.action='single_clinic_patient_mapping' then raise exception 'Local audit failure'; end if; return new; end $$;
      create trigger fail_mapping_audit before insert on public.crm_audit_log for each row execute function public.fail_mapping_audit()`);
    await assert.rejects(mapClinic(cfg),e=>e.code==='P0001');
    assert.equal((await db.query('select count(*)::int n from crm_clinicas')).rows[0].n,0);
    for (const [table,data] of Object.entries(before)) assert.equal(await canonical(table),data,`Rollback: ${table}`);
    await db.exec('drop trigger fail_mapping_audit on crm_audit_log; drop function public.fail_mapping_audit()');

    await mapClinic(cfg);
    const changed = new Set(['crm_perfiles','profesionales','crm_pacientes','crm_asignaciones_fisio_paciente','crm_audit_log']);
    for (const [table,data] of Object.entries(before)) if (!changed.has(table))
      assert.equal(await canonical(table),data,`Contenido conservado: ${table}`);
    for (const [table,total] of Object.entries(counts)) if (table !== 'crm_audit_log')
      assert.equal((await db.query(`select count(*)::int n from public.${q(table)}`)).rows[0].n,total);
    assert.equal((await db.query("select count(*)::int n from crm_audit_log where action like 'single_clinic_%'")).rows[0].n,10);
    assert.equal((await db.query("select count(*)::int n from pg_constraint where conname in ('crm_profiles_clinic_required','crm_patients_clinic_required','crm_assignments_clinic_required') and convalidated")).rows[0].n,3);
    assert.equal((await db.query('select count(*)::int n from crm_pacientes where created_by_profile_id=$1 and clinica_id=$2',[cfg.profile_id,cfg.clinic_id])).rows[0].n,7);
    await assert.rejects(mapClinic(cfg),e=>e.code==='P0001');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[cfg.auth_user_id]);
    await db.exec('set role authenticated');
    assert.equal((await db.query('select private.get_my_clinic_id() id')).rows[0].id,cfg.clinic_id);
    const session = (await db.query(`select p.id,p.rol,p.email,c.nombre from crm_perfiles p join crm_clinicas c on c.id=p.clinica_id
      where p.auth_user_id=auth.uid() and p.activo and c.activo`)).rows[0];
    assert.deepEqual(session,{id:cfg.profile_id,rol:'admin',email:cfg.email,nombre:cfg.clinic_name});
    for (const table of ['crm_pacientes','crm_citas','crm_recomendaciones','crm_pagos','crm_notas_clinicas','crm_documentos','crm_bonos','crm_facturas','pacientes'])
      assert.equal((await db.query(`select count(*)::int n from public.${q(table)}`)).rows[0].n,counts[table],`Lectura autorizada: ${table}`);
    for (const sql of ["update crm_perfiles set rol='fisioterapeuta'",'update crm_perfiles set clinica_id=null','update crm_perfiles set auth_user_id=null'])
      await assert.rejects(db.exec(sql),e=>e.code==='42501');
    await db.exec('reset role');
    await db.query('update crm_clinicas set activo=false where id=$1',[cfg.clinic_id]);
    await db.exec('set role authenticated');
    assert.equal((await db.query('select count(*)::int n from crm_pacientes')).rows[0].n,0);
    await db.exec('reset role');
    await db.query('update crm_clinicas set activo=true where id=$1',[cfg.clinic_id]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",['00000000-0000-4000-8000-000000000802']);
    await db.exec('set role authenticated');
    assert.equal((await db.query('select count(*)::int n from crm_pacientes')).rows[0].n,0);
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select count(*) from crm_pacientes'),e=>e.code==='42501');
    await db.exec('reset role');
    manifest.mapping_verified = true;
    manifest.mapping_verified_at = new Date().toISOString();
    manifest.mapping_sql_sha256 = createHash('sha256').update(setupSql).digest('hex');
    await writeFile(path.join(directory,'mapping-verification.json'),JSON.stringify({ verified_at:manifest.mapping_verified_at,
      clinic_name:cfg.clinic_name,email:cfg.email,role:'admin',patients:7,appointments:18,plans:35,
      null_owners_explicitly_assigned:5,audit_records:10,rollback_verified:true,changed_inventory_rejected:true,
      protected_profile_fields:true,inactive_and_unlinked_sessions_denied:true,source_content_preserved:true,
      mapping_sql_sha256:manifest.mapping_sql_sha256,cloud_changes:false,auth_login_verified:false,
      limitation:'Only SQL/RLS with an in-memory Auth fixture; real Supabase Auth/PostgREST and login pending.' },null,2));
    await writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2));
    console.log('PASS: single-clinic mapping audited and atomic; owner sees all records; protected fields and unauthorized sessions blocked.');
    if (['--flows','--browser-records'].includes(process.argv[4])) {
      phase='creation-retries';
      await db.exec(await readFile(path.join(root,'database/migrations/20261007201534_clinic_creation_retries.sql'),'utf8'));
      const {testCreationRetries}=await import('./test-creation-retries.mjs');
      await testCreationRetries(db,cfg);
    }
    if (process.argv[4] === '--flows') {
      phase='public-booking-retries';
      const bookingSql=await readFile(path.join(root,'database/migrations/20261007214504_public_booking_retries.sql'),'utf8');
      await db.exec(bookingSql);
      const calendarSql=await readFile(path.join(root,'database/migrations/20261008064542_appointment_calendar_pending.sql'),'utf8');
      await db.exec(calendarSql);
      const calendarVerificationSql=await readFile(path.join(root,'database/migrations/20261008090742_appointment_calendar_verification.sql'),'utf8');
      await db.exec(calendarVerificationSql);
      const {testBookingRetries}=await import('./test-booking-retries.mjs');
      await testBookingRetries(db,cfg);
      phase='calendar-persistence';
      const {testCalendarPersistence}=await import('./test-calendar-persistence.mjs');
      await testCalendarPersistence(db,cfg);
      phase='calendar-verification';
      const {testCalendarVerification}=await import('./test-calendar-verification.mjs');
      await testCalendarVerification(db,cfg);
      phase='public-rls-coverage';
      const unprotected=(await db.query("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity")).rows;
      assert.equal(unprotected.length,0,'Every public table in the restored copy must have RLS enabled');
      console.log('PASS: every public table in the restored local copy has RLS enabled.');
      phase = 'financial-integrity';
      const financeSql = await readFile(path.join(root,'database/migrations/20261007154552_financial_integrity.sql'),'utf8');
      await db.exec(financeSql);
      phase = 'clinic-handler-flows';
      const { testClinicFlows } = await import('./test-clinic-flows.mjs');
      await testClinicFlows(db, cfg);
      await writeFile(path.join(directory,'flow-verification.json'),JSON.stringify({ verified_at: new Date().toISOString(),
        appointments: true, payments: true, clinical_review: true, finance: true, patients: true, clinical_notes: true,
        public_booking_retries:true, public_booking_recovery:true, public_booking_migration_sha256:createHash('sha256').update(bookingSql).digest('hex'),
        calendar_persistence:true, calendar_migration_sha256:createHash('sha256').update(calendarSql).digest('hex'),
        calendar_verification:true, calendar_verification_migration_sha256:createHash('sha256').update(calendarVerificationSql).digest('hex'),
        public_rls_coverage:true,
        finance_migration_sha256: createHash('sha256').update(financeSql).digest('hex'),
        creation_retries:true, creation_migration_sha256:createHash('sha256').update(await readFile(path.join(root,'database/migrations/20261007201534_clinic_creation_retries.sql'))).digest('hex'), cloud_changes: false,
        limitations: 'Real handlers/SQL/RLS with a narrow query adapter and in-memory Auth fixture. No browser writes, PostgREST, real AI or delivery.' },null,2));
    }
    if (process.argv[4] === '--browser-records') {
      phase = 'browser-records';
      if(process.argv[5] === '--calendar') {
        for(const migration of ['20261008064542_appointment_calendar_pending.sql','20261008090742_appointment_calendar_verification.sql']) await db.exec(await readFile(path.join(root,'database/migrations',migration),'utf8'));
      }
      const { previewClinicRecords } = await import('./preview-clinic-records.mjs');
      await previewClinicRecords(db, cfg, {calendar:process.argv[5] === '--calendar'});
    }
  }
} catch (error) {
  await writeFile(path.join(directory,'rehearsal-failure.json'),JSON.stringify({phase,code:error.code || error.name,message:error.message},null,2));
  console.error(`FAIL: ${phase} (${error.code || error.name}). Diagnostic saved privately; Cloud unchanged.`);
  process.exitCode = 1;
} finally { await db.close(); }
