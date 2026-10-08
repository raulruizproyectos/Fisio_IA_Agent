import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createLocalQueryClient } from './local-query-client.mjs';

export async function testCreationRetries(db,cfg) {
  Object.assign(process.env,{SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'local-fixture'});
  const [{default:patients},{default:notes},{runWithRequestContext}]=await Promise.all([
    import('../backend/src/routes/patients.js'),import('../backend/src/routes/clinical-notes.js'),import('../backend/src/lib/supabase.js'),
  ]);
  const client=createLocalQueryClient(db),auth={profile_id:cfg.profile_id,clinic_id:cfg.clinic_id,role:'admin'};
  const invoke=async(router,key,body)=>{
    const handler=router.stack.find(l=>l.route?.path==='/' && l.route.methods.post).route.stack[0].handle;
    const res={statusCode:200,status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};
    await runWithRequestContext({supabase:client,auth},()=>handler({body,auth,get:name=>name==='Idempotency-Key' ? key : null},res,
      err=>{res.statusCode=err.status || 500;res.body={error:err.message};}));
    return res;
  };
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[cfg.auth_user_id]);
  await db.exec('set role authenticated');
  const patientKey=randomUUID(),patientBody={nombre_completo:'Retry fixture',email:'retry@example.invalid'};
  const first=await invoke(patients,patientKey,patientBody);assert.equal(first.statusCode,201,first.body?.error);
  const patientId=first.body.data.id;
  for(const result of await Promise.all([invoke(patients,patientKey,patientBody),invoke(patients,patientKey,patientBody)])) {
    assert.equal(result.statusCode,200,result.body?.error);assert.equal(result.body.data.id,patientId);
  }
  const changed=await invoke(patients,patientKey,{...patientBody,nombre_completo:'Changed draft'});
  assert.equal(changed.statusCode,409);assert.equal(changed.body.code,'CREATE_ALREADY_SAVED');assert.equal(changed.body.data.id,patientId);
  assert.equal((await db.query("select count(*)::int n from crm_pacientes where email='retry@example.invalid'")).rows[0].n,1);
  const key=randomUUID(),body={paciente_id:patientId,nota:'Retry note',dolor_eva:0};
  const saved=await invoke(notes,key,body);assert.equal(saved.statusCode,201,saved.body?.error);
  const retry=await invoke(notes,key,body);assert.equal(retry.statusCode,200,retry.body?.error);
  assert.equal(retry.body.data.id,saved.body.data.id);assert.equal(retry.body.data.dolor_eva,0);
  assert.equal(retry.body.data.profesional_id,cfg.profile_id);
  assert.equal((await invoke(notes,key,{...body,nota:'Changed draft'})).statusCode,409);
  assert.equal((await db.query('select count(*)::int n from crm_notas_clinicas where paciente_id=$1',[patientId])).rows[0].n,1);
  await db.exec('reset role');
  assert.equal((await db.query("select count(*)::int n from crm_audit_log where entity_id=any($1::uuid[]) and action='create'",[[patientId,saved.body.data.id]])).rows[0].n,2);
  await db.query('delete from crm_notas_clinicas where id=$1',[saved.body.data.id]);
  await db.exec('set role authenticated');
  assert.equal((await invoke(notes,key,body)).statusCode,409);
  assert.equal((await db.query('select count(*)::int n from crm_notas_clinicas where paciente_id=$1',[patientId])).rows[0].n,0);
  await assert.rejects(db.query('select * from private.clinic_creation_receipts'),e=>e.code==='42501');
  await assert.rejects(client.rpc('create_clinic_record_once',{operation_id:randomUUID(),kind:'note',fields:{...body,profesional_id:cfg.profile_id}}).then(r=>{if(r.error)throw r.error;}),e=>e.code==='PT400');
  await db.exec('reset role');
  await db.exec(`create function public.fail_creation_audit() returns trigger language plpgsql as $$ begin
    if new.metadata ? 'operation_id' then raise exception 'Local audit failure'; end if; return new; end $$;
    create trigger fail_creation_audit before insert on crm_audit_log for each row execute function fail_creation_audit()`);
  const rollbackKey=randomUUID();await db.exec('set role authenticated');
  const failed=await invoke(patients,rollbackKey,{nombre_completo:'Rollback fixture',email:'rollback@example.invalid'});
  assert.equal(failed.statusCode,503);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int n from private.clinic_creation_receipts where operation_id=$1',[rollbackKey])).rows[0].n,0);
  assert.equal((await db.query("select count(*)::int n from crm_pacientes where email='rollback@example.invalid'")).rows[0].n,0);
  await db.exec('drop trigger fail_creation_audit on crm_audit_log;drop function fail_creation_audit()');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[randomUUID()]);
  await db.exec('set role authenticated');
  const denied=await client.rpc('create_clinic_record_once',{operation_id:patientKey,kind:'patient',fields:{nombre:'Retry',apellidos:'fixture',email:'retry@example.invalid'}});
  assert.equal(denied.error.code,'42501');
  await db.exec('reset role;set role service_role');
  assert.equal((await client.rpc('create_clinic_record_once',{operation_id:key,kind:'note',fields:body})).error.code,'42501');
  await db.exec('reset role;set role anon');
  assert.equal((await client.rpc('create_clinic_record_once',{operation_id:key,kind:'note',fields:body})).error.code,'42501');
  await db.exec('reset role');
  // Keep the browser/flow fixture inventory unchanged after these transactional checks.
  await db.query('delete from crm_audit_log where entity_id=any($1::uuid[])',[[patientId,saved.body.data.id]]);
  await db.query('delete from private.clinic_creation_receipts where profile_id=$1 and operation_id=any($2::uuid[])',[cfg.profile_id,[patientKey,key]]);
  await db.query('delete from crm_asignaciones_fisio_paciente where paciente_id=$1',[patientId]);
  await db.query('delete from crm_pacientes where id=$1',[patientId]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[cfg.auth_user_id]);
  console.log('PASS: real creation handlers/SQL replay one row and one audit, reject changed payloads/forged fields, roll back audit failures and never resurrect deleted notes; anon/service/unlinked sessions denied.');
}
