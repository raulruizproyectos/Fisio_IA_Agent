// Isolated PostgreSQL instance, synthetic rows and independent connections. No Cloud access.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
const root=fileURLToPath(new URL('../',import.meta.url));
const bin=process.env.POSTGRES_BIN || 'C:/Program Files/PostgreSQL/18/bin';
assert.ok(process.env.PG_PACKAGE_DIR,'Set PG_PACKAGE_DIR to the already installed pg package');
const {default:{Client}}=await import(pathToFileURL(path.join(process.env.PG_PACKAGE_DIR,'lib/index.js')).href);
const directory=path.join(root,'.private-backups/local-validation',`postgres-appointments-${randomUUID()}`);
await mkdir(directory,{recursive:true});
const data=path.join(directory,'data'),port=54339,clients=[];
const command=(name,args)=>new Promise((resolve,reject)=>{
  const child=spawn(path.join(bin,`${name}.exe`),args,{windowsHide:true,stdio:'ignore',timeout:30000});
  child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(`${name} exited ${code}; inspect the private PostgreSQL log`)));
});
let started=false;
try {
  await command('initdb',['-D',data,'-U','fisio_local','-A','trust','--encoding=UTF8','--no-locale']);
  await command('pg_ctl',['-D',data,'-l',path.join(directory,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
  for(let i=0;i<3;i++){const c=new Client({host:'127.0.0.1',port,user:'fisio_local',database:'postgres',connectionTimeoutMillis:5000});clients.push(c);await c.connect();}
  const [admin,a,b]=clients;
  const schema=await readFile(path.join(root,'database/schema_vnext.sql'),'utf8');
  const hardening=await readFile(path.join(root,'database/migrations/20260901_production_security_hardening.sql'),'utf8');
  const table=schema.match(/create table if not exists public\.crm_citas \([\s\S]*?\n\);/)?.[0];
  const unique=hardening.match(/create unique index if not exists uq_crm_citas_request_id[\s\S]*?;/)?.[0];
  const exclusion=hardening.match(/alter table public\.crm_citas drop constraint if exists crm_citas_no_overlap;[\s\S]*?where \(estado in[^;]+;/)?.[0];
  assert.ok(table && unique && exclusion,'Use the actual application table/index/constraint');
  await admin.query('create schema extensions; create extension btree_gist with schema extensions; set search_path=public,extensions; create table crm_pacientes(id uuid primary key); create table crm_perfiles(id uuid primary key);');
  await admin.query(table+unique+exclusion);
  await admin.query(await readFile(path.join(root,'database/migrations/20261007214504_public_booking_retries.sql'),'utf8'));
  await admin.query(await readFile(path.join(root,'database/migrations/20261008064542_appointment_calendar_pending.sql'),'utf8'));
  await admin.query(await readFile(path.join(root,'database/migrations/20261008090742_appointment_calendar_verification.sql'),'utf8'));
  const timestampTrigger=schema.match(/create or replace function public\.crm_set_updated_at\(\)[\s\S]*?\$\$;/)?.[0];
  assert.ok(timestampTrigger); await admin.query(timestampTrigger);
  await admin.query('create trigger trg_crm_citas_updated_at before update on crm_citas for each row execute function public.crm_set_updated_at()');
  const patient=randomUUID(),professional=randomUUID(),other=randomUUID();
  await admin.query('insert into crm_pacientes values($1);',[patient]);
  await admin.query('insert into crm_perfiles values($1),($2);',[professional,other]);
  const insert=(client,start,end,key=randomUUID(),physio=professional)=>client.query(`insert into crm_citas(paciente_id,fisioterapeuta_id,inicio_en,fin_en,request_id) values($1,$2,$3,$4,$5) returning id`,[patient,physio,`2040-04-09T${start}:00Z`,`2040-04-09T${end}:00Z`,key]);
  async function expectBlockedAndRejected(action,code) {
    const pid=(await b.query('select pg_backend_pid() pid')).rows[0].pid;
    const result=action().then(()=>({code:'unexpected_success'}),error=>({code:error.code}));
    const deadline=Date.now()+5000;let blocked=false;
    while(Date.now()<deadline){blocked=(await admin.query("select wait_event_type='Lock' blocked from pg_stat_activity where pid=$1",[pid])).rows[0]?.blocked;if(blocked)break;await delay(20);}
    assert.equal(blocked,true,'The second connection must wait on the first transaction');
    await a.query('commit');assert.equal((await result).code,code);
  }
  for(const c of [a,b])assert.equal((await c.query('select count(*)::int n from crm_citas')).rows[0].n,0,'Both availability reads see the slot free');
  await a.query('begin');const first=(await insert(a,'09:00','10:00')).rows[0].id;
  await expectBlockedAndRejected(()=>insert(b,'09:30','10:30'),'23P01');
  assert.equal((await admin.query('select count(*)::int n from crm_citas')).rows[0].n,1);
  await insert(b,'10:00','11:00');await insert(b,'09:00','10:00',randomUUID(),other);
  const second=(await insert(b,'11:00','12:00')).rows[0].id;
  await a.query('begin');await a.query("update crm_citas set inicio_en='2040-04-09T13:00Z',fin_en='2040-04-09T14:00Z' where id=$1",[first]);
  await expectBlockedAndRejected(()=>b.query("update crm_citas set inicio_en='2040-04-09T13:30Z',fin_en='2040-04-09T14:30Z' where id=$1",[second]),'23P01');
  const key=randomUUID();await a.query('begin');await insert(a,'15:00','16:00',key);
  await expectBlockedAndRejected(()=>insert(b,'17:00','18:00',key),'23505');
  await admin.query("update crm_citas set estado='cancelada' where id=$1",[first]);await insert(b,'13:00','14:00');
  const version=(await admin.query('select updated_at::text version from crm_citas where id=$1',[second])).rows[0].version;
  const claim=(client)=>client.query('update crm_citas set calendar_sync_pending=true where id=$1 and calendar_sync_pending=false and updated_at=$2 returning id',[second,version]);
  await a.query('begin'); assert.equal((await claim(a)).rowCount,1);
  const pid=(await b.query('select pg_backend_pid() pid')).rows[0].pid;
  const competing=claim(b);let blocked=false;
  for(let i=0;i<250;i++) {blocked=(await admin.query("select wait_event_type='Lock' blocked from pg_stat_activity where pid=$1",[pid])).rows[0]?.blocked;if(blocked)break;await delay(20);}
  assert.equal(blocked,true);await a.query('commit');assert.equal((await competing).rowCount,0,'Only one operation may claim Calendar');
  await admin.query('update crm_citas set calendar_sync_pending=false where id=$1',[second]);
  assert.equal((await claim(b)).rowCount,0,'An old read cannot claim a newer appointment after pending clears');
  assert.equal((await b.query("update crm_citas set motivo='Old Calendar snapshot' where id=$1 and calendar_sync_pending=false and updated_at=$2 returning id",[second,version])).rowCount,0,'Stale reconciliation cannot overwrite a completed operation');
  await admin.query('update crm_citas set calendar_sync_pending=true,calendar_sync_in_flight=false where id=$1',[second]);
  const checkVersion=(await a.query('select updated_at::text version from crm_citas where id=$1',[second])).rows[0].version;
  const unlock=(client)=>client.query('update crm_citas set calendar_sync_pending=false where id=$1 and calendar_sync_pending=true and calendar_sync_in_flight=false and updated_at=$2 returning id',[second,checkVersion]);
  await a.query('begin');assert.equal((await unlock(a)).rowCount,1);
  const checked=unlock(b);blocked=false;
  for(let i=0;i<250;i++){blocked=(await admin.query("select wait_event_type='Lock' blocked from pg_stat_activity where pid=$1",[pid])).rows[0]?.blocked;if(blocked)break;await delay(20);}
  assert.equal(blocked,true);await a.query('commit');assert.equal((await checked).rowCount,0,'Only one read-back may unlock the version');
  await admin.query('update crm_citas set calendar_sync_pending=true,calendar_sync_in_flight=true where id=$1',[second]);
  assert.equal((await unlock(b)).rowCount,0,'Stale recovery cannot unlock a newer writer');
  const activeVersion=(await a.query('select updated_at::text version from crm_citas where id=$1',[second])).rows[0].version;
  assert.equal((await b.query('update crm_citas set calendar_sync_pending=false where id=$1 and calendar_sync_pending=true and calendar_sync_in_flight=false and updated_at=$2 returning id',[second,activeVersion])).rowCount,0,'Even the current version cannot unlock an active writer');
  console.log('PASS: independent recovery connections serialize unlocking and reject stale or in-flight versions.');
  console.log('PASS: independent connections serialize Calendar claims and reject stale reconciliation even after pending clears.');
  await writeFile(path.join(directory,'verification.json'),JSON.stringify({local_only:true,independent_connections:3,overlapping_insert_rejected:true,overlapping_update_rejected:true,request_id_unique:true,adjacent_slots_allowed:true,other_professional_allowed:true,cancellation_frees_slot:true,postgres_version:(await admin.query('show server_version')).rows[0].server_version},null,2));
  console.log('PASS: independent PostgreSQL transactions wait/reject overlapping inserts and edits; request IDs are unique, adjacent/other-professional slots and cancelled slots remain available.');
} finally {
  await Promise.allSettled(clients.map(c=>c.end()));
  if(started)await command('pg_ctl',['-D',data,'-m','immediate','-w','stop']);
}
