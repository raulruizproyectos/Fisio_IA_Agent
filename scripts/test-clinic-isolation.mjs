// Run with Node and an installed @electric-sql/pglite package. No live database.
// PGLITE_PACKAGE_DIR can point to an existing installation outside this repo.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const packageDir = process.env.PGLITE_PACKAGE_DIR;
const load = (entry) => import(packageDir
  ? pathToFileURL(path.join(packageDir, 'dist', entry + '.js')).href
  : '@electric-sql/pglite' + (entry === 'index' ? '' : '/' + entry));
const [{ PGlite }, { pgcrypto }, { uuid_ossp }, { btree_gist }] = await Promise.all([
  load('index'), load('contrib/pgcrypto'), load('contrib/uuid_ossp'), load('contrib/btree_gist'),
]);
const db = await PGlite.create({ extensions: { pgcrypto, uuid_ossp, btree_gist } });
const readSql = (name) => readFile(new URL('../database/' + name, import.meta.url), 'utf8');
const uuid = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const login = async (n, role = 'authenticated') => {
  assert.ok(['authenticated', 'anon'].includes(role));
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [n ? uuid(n) : '']);
  await db.exec('set role ' + role);
};
const ids = async (table) => (await db.query('select id from ' + table + ' order by id')).rows.map((r) => r.id);
const denied = (sql, params = [], code = '42501') => assert.rejects(db.query(sql, params), (e) => e.code === code);

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema extensions;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);
  // Reproduce the live RPC with a fictitious secret; never read the real Vault.
  await db.exec(`create schema vault;
    create table vault.decrypted_secrets (name text, decrypted_secret text);
    insert into vault.decrypted_secrets values ('fixture', 'local-test-value');
    create function public.vault_read_secret(secret_name text) returns text
    language sql security definer set search_path = public, vault as $$
      select decrypted_secret from vault.decrypted_secrets where name = secret_name limit 1
    $$;
    grant execute on function public.vault_read_secret(text) to anon, authenticated;`);
  await login(null, 'anon');
  assert.equal((await db.query("select public.vault_read_secret('fixture') as value")).rows[0].value, 'local-test-value');
  await db.exec('reset role');
  await db.exec(await readSql('migrations/20261007110637_vault_server_only.sql'));
  for (const role of ['anon', 'authenticated']) {
    await login(null, role);
    await denied("select public.vault_read_secret('fixture')");
  }
  await db.exec('reset role; set role service_role');
  assert.equal((await db.query("select public.vault_read_secret('fixture') as value")).rows[0].value, 'local-test-value');
  await db.exec('reset role');
  console.log('PASS: Vault RPC denies anon/authenticated and preserves service_role access with fictitious data');

  for (const file of [
    'schema.sql', 'schema_vnext.sql', 'migrations/007_crm_pagos.sql',
    'migrations/008_ficha_paciente_enriquecida.sql', 'migrations/009_crm_facturas.sql',
    'migrations/010_crm_documentos.sql', 'migrations/011_crm_bonos.sql',
    'migrations/20260901_production_security_hardening.sql',
    'migrations/20260919_voice_session_notes_evolution.sql',
  ]) await db.exec(await readSql(file));
  // Supabase's existing-table grants, before applying the new hardening.
  await db.exec('grant all on all tables in schema public to authenticated, service_role');
  await db.query(`insert into crm_perfiles (id, auth_user_id, rol) values ($1, $1, 'admin')`, [uuid(900)]);
  await db.query(`insert into crm_pacientes (id, nombre, created_by_profile_id) values ($1, 'Unmapped', $2)`, [uuid(901), uuid(900)]);
  await db.exec(await readSql('migrations/20261007091159_clinic_isolation.sql'));

  await db.query(`insert into crm_clinicas (id, nombre, activo) values ($1, 'A', true), ($2, 'B', true), ($3, 'Inactive', false)`, [uuid(100), uuid(200), uuid(300)]);
  for (const [id, clinic, role] of [[1, 100, 'admin'], [2, 100, 'fisioterapeuta'], [3, 100, 'fisioterapeuta'], [4, 200, 'admin'], [5, 200, 'fisioterapeuta'], [6, 300, 'admin']]) {
    await db.query(`insert into crm_perfiles (id, auth_user_id, clinica_id, rol) values ($1, $1, $2, $3)`, [uuid(id), uuid(clinic), role]);
  }
  for (const [id, clinic, owner] of [[11, 100, 2], [12, 200, 5], [13, 100, 3]]) {
    await db.query(`insert into crm_pacientes (id, nombre, clinica_id, created_by_profile_id) values ($1, 'Patient', $2, $3)`, [uuid(id), uuid(clinic), uuid(owner)]);
    await db.query(`insert into crm_pagos (id, paciente_id, importe, metodo_pago) values ($1, $2, 50, 'efectivo')`, [uuid(id + 1000), uuid(id)]);
    await db.query(`insert into crm_notas_clinicas (id, paciente_id, nota) values ($1, $2, 'Private note')`, [uuid(id + 2000), uuid(id)]);
    await db.query(`insert into crm_documentos (id, paciente_id, tipo, titulo) values ($1, $2, 'otro', 'Private document')`, [uuid(id + 3000), uuid(id)]);
    await db.query(`insert into crm_bonos (id, paciente_id, sesiones_total, precio) values ($1, $2, 5, 200)`, [uuid(id + 4000), uuid(id)]);
    await db.query(`insert into crm_recomendaciones (id, paciente_id, fisioterapeuta_id) values ($1, $2, $3)`, [uuid(id + 5000), uuid(id), uuid(owner)]);
    await db.query(`insert into crm_facturas (id, numero, paciente_id) values ($1, $2, $3)`, [uuid(id + 6000), 'TEST-' + id, uuid(id)]);
  }

  await login(1);
  assert.deepEqual(await ids('crm_clinicas'), [uuid(100)]);
  assert.deepEqual(await ids('crm_perfiles'), [uuid(1), uuid(2), uuid(3)]);
  assert.deepEqual(await ids('crm_pacientes'), [uuid(11), uuid(13)]);
  for (const [table, offset] of [['crm_pagos', 1000], ['crm_notas_clinicas', 2000], ['crm_documentos', 3000], ['crm_bonos', 4000], ['crm_recomendaciones', 5000], ['crm_facturas', 6000]]) {
    assert.deepEqual(await ids(table), [uuid(11 + offset), uuid(13 + offset)], table);
  }
  assert.equal((await db.query(`update crm_pacientes set nombre = 'Forbidden' where id = $1`, [uuid(12)])).affectedRows, 0);
  assert.equal((await db.query('delete from crm_pacientes where id = $1', [uuid(12)])).affectedRows, 0);
  await denied(`insert into crm_pacientes (nombre, clinica_id, created_by_profile_id) values ('Cross clinic', $1, $2)`, [uuid(200), uuid(5)]);
  await denied(`update crm_pacientes set clinica_id = $1 where id = $2`, [uuid(200), uuid(11)]);
  await denied(`update crm_perfiles set clinica_id = $1 where id = $2`, [uuid(200), uuid(1)]);
  await denied(`insert into crm_asignaciones_fisio_paciente (fisioterapeuta_id, paciente_id) values ($1, $2)`, [uuid(2), uuid(12)]);
  await denied(`insert into crm_asignaciones_fisio_paciente (fisioterapeuta_id, paciente_id) values ($1, $2)`, [uuid(5), uuid(11)], '23503');
  await db.query(`insert into crm_asignaciones_fisio_paciente (fisioterapeuta_id, paciente_id) values ($1, $2)`, [uuid(2), uuid(13)]);

  await login(2);
  assert.deepEqual(await ids('crm_pacientes'), [uuid(11), uuid(13)]);
  await db.query(`insert into crm_pacientes (id, nombre, created_by_profile_id) values ($1, 'New patient', $2)`, [uuid(14), uuid(2)]);
  assert.equal((await db.query('select clinica_id from crm_pacientes where id = $1', [uuid(14)])).rows[0].clinica_id, uuid(100));
  await db.query(`insert into crm_asignaciones_fisio_paciente (fisioterapeuta_id, paciente_id) values ($1, $2)`, [uuid(2), uuid(14)]);
  assert.equal((await db.query(`update crm_pacientes set nombre = 'Edited' where id = $1`, [uuid(14)])).affectedRows, 1);
  await denied(`update crm_perfiles set rol = 'admin' where id = $1`, [uuid(2)]);
  await denied(`insert into crm_pagos (paciente_id, importe, metodo_pago) values ($1, 20, 'efectivo')`, [uuid(12)]);

  await login(3);
  assert.deepEqual(await ids('crm_pacientes'), [uuid(13)]);
  // Same-clinic membership alone must not allow granting access to an unassigned patient.
  await denied(`insert into crm_asignaciones_fisio_paciente (fisioterapeuta_id, paciente_id) values ($1, $2)`, [uuid(3), uuid(11)]);
  await login(4);
  assert.deepEqual(await ids('crm_pacientes'), [uuid(12)]);
  assert.deepEqual(await ids('crm_perfiles'), [uuid(4), uuid(5)]);
  await login(900);
  assert.deepEqual(await ids('crm_pacientes'), []);
  await login(6);
  assert.deepEqual(await ids('crm_pacientes'), []);
  assert.deepEqual(await ids('crm_clinicas'), []);
  await login(null, 'anon');
  await denied('select * from crm_clinicas');
  await denied('select * from crm_pacientes');

  await db.exec('reset role');
  // Even a privileged integration cannot combine an explicit clinic with another clinic's owner.
  await denied(`insert into crm_pacientes (nombre, clinica_id, created_by_profile_id) values ('Mismatch', $1, $2)`, [uuid(100), uuid(5)], '23503');
  assert.equal((await db.query('select nombre from crm_pacientes where id = $1', [uuid(901)])).rows[0].nombre, 'Unmapped');
  console.log('PASS: actual PostgreSQL policies isolate two clinics, scope admins, prevent self-assignment, preserve unmapped data and protect related records.');

  // Reproduce direct Data API approval before the clinical migration, then close it.
  await db.query(`insert into crm_ejercicios_catalogo (id, codigo, nombre) values ($1, 'TEST', 'Stored exercise')`, [uuid(700)]);
  await db.query(`insert into crm_recomendacion_items (id, recomendacion_id, ejercicio_id, confidence) values ($1, $2, $3, 0.8)`, [uuid(701), uuid(5011), uuid(700)]);
  const report = { exercises: [{ exercise_id: uuid(700), nombre: 'Stored exercise', series: 2, repeticiones: 8 }] };
  await db.query(`insert into crm_comunicaciones (paciente_id, recomendacion_id, channel, direction, payload)
    values ($1, $2, 'crm_web', 'internal', $3)`, [uuid(11), uuid(5011), JSON.stringify({ event: 'exercise_report_snapshot', report })]);
  await db.query(`update crm_recomendaciones set red_flags_present = true where id = $1`, [uuid(5011)]);
  await login(2);
  assert.equal((await db.query(`update crm_recomendaciones set estado = 'aprobada' where id = $1`, [uuid(5011)])).affectedRows, 1);
  await db.exec('reset role');
  await db.exec(await readSql('migrations/20261007094023_clinical_approval_integrity.sql'));
  assert.equal((await db.query('select estado from crm_recomendaciones where id = $1', [uuid(5011)])).rows[0].estado, 'requiere_revision');
  assert.equal((await db.query("select count(*)::int n from crm_audit_log where action = 'legacy_approval_requires_review'")).rows[0].n, 1);
  const review = (id, decision = 'approve', note = 'Revisado y adaptado al paciente', version = 0) =>
    db.query('select public.review_exercise_recommendation($1, $2, $3, $4) result', [uuid(id), decision, note, version]);

  await login(2);
  await denied(`update crm_recomendaciones set estado = 'aprobada', reviewed_by_profile_id = $1, reviewed_at = now() where id = $2`, [uuid(2), uuid(5011)]);
  await denied(`insert into crm_recomendaciones (paciente_id, fisioterapeuta_id, estado) values ($1, $2, 'aprobada')`, [uuid(11), uuid(2)]);
  await denied(`update crm_recomendaciones set red_flags_present = false where id = $1`, [uuid(5011)]);
  await assert.rejects(review(5011, 'approve', 'OK'), (error) => error.code === 'PT400');
  await assert.rejects(review(5011, 'approve', undefined, 99), (error) => error.code === 'PT409');
  assert.equal((await review(5011, 'reject')).rows[0].result.estado, 'rechazada');
  const editedReport = { ...report, message_to_patient: 'Edited, reviewed message' };
  await db.query(`update crm_recomendaciones set report_snapshot = $1, estado = 'requiere_revision' where id = $2`, [JSON.stringify(editedReport), uuid(5011)]);
  await assert.rejects(review(5011), (error) => error.code === 'PT409'); // stale preview
  const approved = (await review(5011, 'approve', 'Revisado y adaptado al paciente', 1)).rows[0].result;
  assert.equal(approved.estado, 'aprobada');
  assert.equal(approved.reviewed_by_profile_id, uuid(2));
  assert.ok(approved.reviewed_at);
  await denied(`update crm_recomendaciones set report_snapshot = '{}' where id = $1`, [uuid(5011)], 'PT409');
  await denied(`update crm_recomendaciones set estado = 'requiere_revision' where id = $1`, [uuid(5011)], 'PT409');
  await denied(`delete from crm_recomendacion_items where id = $1`, [uuid(701)], 'PT409');
  await denied(`delete from crm_recomendaciones where id = $1`, [uuid(5011)], 'PT409');
  await denied(`update crm_recomendacion_items set why = 'Changed' where id = $1`, [uuid(701)], 'PT409');
  await denied(`update crm_recomendaciones set estado = 'enviada' where id = $1`, [uuid(5011)]);
  await db.query(`update crm_recomendaciones set report_version = 0 where id = $1`, [uuid(5011)]);
  assert.equal((await db.query('select report_version from crm_recomendaciones where id = $1', [uuid(5011)])).rows[0].report_version, 1);
  await login(3);
  await assert.rejects(review(5011), (error) => error.code === 'PT404');
  await login(4);
  await assert.rejects(review(5011), (error) => error.code === 'PT404');
  await assert.rejects(review(5012), (error) => error.code === 'PT409'); // no stored exercises
  await login(2);
  await db.query(`insert into crm_recomendaciones (id, paciente_id, fisioterapeuta_id, report_snapshot)
    values ($1, $2, $3, $4)`, [uuid(710), uuid(11), uuid(2), JSON.stringify({ exercises: [report.exercises[0], report.exercises[0]] })]);
  await db.query(`insert into crm_recomendacion_items (recomendacion_id, ejercicio_id, confidence) values ($1, $2, 0.8)`, [uuid(710), uuid(700)]);
  await assert.rejects(review(710), (error) => error.code === 'PT409'); // duplicate exercise
  await login(null, 'anon');
  await assert.rejects(review(5011), (error) => error.code === '42501');
  await db.exec('reset role; set role service_role');
  await assert.rejects(review(5011), (error) => error.code === '42501'); // automation cannot review
  await db.query(`update crm_recomendaciones set estado = 'enviada' where id = $1`, [uuid(5011)]);
  await denied(`update crm_recomendaciones set report_snapshot = '{}' where id = $1`, [uuid(5011)], 'PT409');
  await db.exec('reset role');
  assert.equal((await db.query("select count(*)::int n from crm_audit_log where action in ('approve_recommendation','reject_recommendation')")).rows[0].n, 2);
  await db.exec(`create function private.fail_test_audit() returns trigger language plpgsql as $$
    begin raise exception using errcode = 'PT409', message = 'Simulated audit failure'; end $$;
    create trigger fail_test_audit before insert on crm_audit_log for each row execute function private.fail_test_audit()`);
  await login(1);
  await assert.rejects(review(5013, 'reject'), (error) => error.code === 'PT409');
  const rolledBack = (await db.query('select estado, reviewed_at from crm_recomendaciones where id = $1', [uuid(5013)])).rows[0];
  assert.equal(rolledBack.estado, 'requiere_revision');
  assert.equal(rolledBack.reviewed_at, null);
  await db.exec('reset role; drop trigger fail_test_audit on crm_audit_log; drop function private.fail_test_audit()');
  console.log('PASS: real SQL blocks direct approval and edits after review, validates red flags/version/exercises, derives reviewer, records audit and restricts clinics and automation.');

  await db.exec(await readSql('migrations/20261007101248_messaging_pilot.sql'));
  await db.exec('set role service_role');
  await db.query(`insert into crm_mensajeria_vinculos (id, clinica_id, paciente_id, canal, chat_id)
    values ($1,$2,$3,'whatsapp','34600111222@c.us'), ($4,$5,$6,'whatsapp','34600111222@c.us')`,
  [uuid(800),uuid(100),uuid(11),uuid(801),uuid(200),uuid(12)]);
  await denied(`insert into crm_mensajeria_vinculos (clinica_id,paciente_id,canal) values ($1,$2,'telegram')`,[uuid(200),uuid(11)],'23503');
  await db.query(`insert into crm_whatsapp_envios (id,clinica_id,paciente_id,recomendacion_id,report_version,session_id,chat_id)
    values ($1,$2,$3,$4,1,'pilot','34600111222@c.us')`,[uuid(810),uuid(100),uuid(11),uuid(5011)]);
  await denied(`insert into crm_whatsapp_envios (clinica_id,paciente_id,recomendacion_id,report_version,session_id,chat_id)
    values ($1,$2,$3,1,'pilot','34600111222@c.us')`,[uuid(100),uuid(11),uuid(5012)],'23503');
  await denied(`insert into crm_whatsapp_envios (clinica_id,paciente_id,recomendacion_id,report_version,session_id,chat_id)
    values ($1,$2,$3,1,'pilot','34600111222@c.us')`,[uuid(100),uuid(11),uuid(5011)],'23505');
  await db.query(`insert into crm_mensajeria_eventos (id,clinica_id,canal,session_id,evento,message_id)
    values ('same-event',$1,'whatsapp','pilot','message.received','message-a')`,[uuid(100)]);
  await denied(`insert into crm_mensajeria_eventos (id,clinica_id,canal,session_id,evento,message_id)
    values ('same-event',$1,'whatsapp','pilot','message.received','message-a')`,[uuid(100)],'23505');
  const claimLink = () => db.query(`update crm_mensajeria_vinculos set version = version+1, reserva = '{"processing":true}' where id=$1 and version=0`,[uuid(800)]);
  const claims = await Promise.all([claimLink(),claimLink()]);
  assert.deepEqual(claims.map(row=>row.affectedRows).sort(),[0,1]);
  await db.query(`insert into crm_citas (paciente_id,fisioterapeuta_id,inicio_en,fin_en,estado,canal_origen)
    values ($1,$2,'2030-01-07T10:00:00Z','2030-01-07T11:00:00Z','confirmada','whatsapp')`,[uuid(11),uuid(2)]);
  await denied(`insert into crm_citas (paciente_id,fisioterapeuta_id,inicio_en,fin_en,estado,canal_origen)
    values ($1,$2,'2030-01-07T10:30:00Z','2030-01-07T11:30:00Z','confirmada','telegram')`,[uuid(11),uuid(2)],'23P01');
  await login(2);
  assert.deepEqual(await ids('crm_mensajeria_vinculos'),[uuid(800)]);
  assert.deepEqual(await ids('crm_whatsapp_envios'),[uuid(810)]);
  await denied(`update crm_mensajeria_vinculos set chat_id='forged'`);
  await denied(`insert into crm_whatsapp_envios (clinica_id,paciente_id,recomendacion_id,report_version,session_id,chat_id)
    values ($1,$2,$3,1,'pilot','forged')`,[uuid(100),uuid(11),uuid(5011)]);
  await denied('select * from crm_mensajeria_eventos');
  await login(4);
  assert.deepEqual(await ids('crm_mensajeria_vinculos'),[uuid(801)]);
  assert.deepEqual(await ids('crm_whatsapp_envios'),[]);
  await login(null,'anon');
  await denied('select * from crm_mensajeria_vinculos');
  console.log('PASS: messaging SQL enforces clinic/patient relations, server-owned links and delivery, duplicate protection, optimistic reservation claims and cross-channel appointment exclusion.');
} catch (error) {
  console.error(error.code || error.name, error.message, error.query || '');
  process.exitCode = 1;
} finally {
  await db.close();
}
