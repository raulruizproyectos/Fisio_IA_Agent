import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createLocalQueryClient} from './local-query-client.mjs';

// Real handler/SQL; synthetic public profile and lost DB acknowledgement, no external services.
export async function testBookingRetries(db,cfg) {
  Object.assign(process.env,{SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'local-fixture'});
  for(const key of Object.keys(process.env)) if(/^(GOOGLE_|W5_|W6_|N8N_|TELEGRAM_|OPENWA_|OPENAI_)/.test(key)) delete process.env[key];
  const [{default:router},{runWithRequestContext}]=await Promise.all([
    import('../backend/src/routes/professional.js'),import('../backend/src/lib/supabase.js'),
  ]);
  await db.exec('reset role');
  const patientId=(await db.query("insert into crm_pacientes(nombre,email,activo,created_by_profile_id,clinica_id) values('Public booking fixture','public-qa@example.invalid',true,$1,$2) returning id",[cfg.profile_id,cfg.clinic_id])).rows[0].id;
  const base=createLocalQueryClient(db);
  let loseAcknowledgement=false,insertError=null,recoveryReadOnly=false,recoveryReadFailure=false;
  const client={from(table){
    if(table==='crm_perfiles') {
      let profile=cfg.profile_id;
      const query={select(){return this;},eq(k,v){if(k==='id')profile=v;return this;},async maybeSingle(){return {data:{id:profile,nombre_completo:'Profesional ficticio',activo:true,clinica_id:cfg.clinic_id,crm_clinicas:{id:cfg.clinic_id,activo:true}},error:null};}};
      return query;
    }
    const query=base.from(table);let inserting=false;
    const proxy=new Proxy(query,{get(target,key){
      if(key==='then') return async(resolve,reject)=>{
        if(recoveryReadOnly && table==='crm_citas' && recoveryReadFailure)return resolve({error:{message:'Synthetic recovery read failure'}});
        if(table==='crm_citas' && inserting && insertError) {const error=insertError;insertError=null;return resolve({data:null,error});}
        const result=await target;
        if(table==='crm_citas' && inserting && loseAcknowledgement && !result.error){loseAcknowledgement=false;return resolve({data:null,error:{message:'Synthetic lost acknowledgement'}});}
        return Promise.resolve(result).then(resolve,reject);
      };
      return (...args)=>{if(recoveryReadOnly && ['insert','update','upsert','delete'].includes(key))assert.fail('Recovery must only read');if(key==='insert')inserting=true;target[key](...args);return proxy;};
    }});return proxy;
  }};
  const handler=router.stack.find(l=>l.route?.path==='/public-booking/appointments' && l.route.methods.post).route.stack[0].handle;
  const invoke=async(key,body)=>{
    const res={statusCode:200,status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};
    await runWithRequestContext({supabase:client,auth:{actor_type:'public_booking'}},()=>handler({body,get:name=>name==='Idempotency-Key'?key:null},res,error=>{res.statusCode=error.status||500;res.body={error:error.message};}));
    return res;
  };
  const body={professional_id:cfg.profile_id,full_name:'Public booking fixture',email:'public-qa@example.invalid',start_at:'2040-04-09T09:00:00Z',end_at:'2040-04-09T10:00:00Z'};
  const key=randomUUID();loseAcknowledgement=true;
  assert.equal((await invoke(key,body)).statusCode,503,'Uncertain write must be recoverable');
  const recovered=await invoke(key,body);
  assert.equal(recovered.statusCode,200,'Lost response recovers the existing booking');
  assert.equal(recovered.body.replayed,true);
  assert.equal('public_booking_hash' in recovered.body.data,false);
  assert.equal((await invoke(key.toUpperCase(),body)).statusCode,200);
  const recoveryHandler=router.stack.find(l=>l.route?.path==='/public-booking/recovery').route.stack[0].handle;
  const inspect=async(recoveryKey,profile=cfg.profile_id)=>{
    const res={statusCode:200,headers:{},set(k,v){this.headers[k]=v;return this;},status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};
    recoveryReadOnly=true;
    try {await runWithRequestContext({supabase:client},()=>recoveryHandler({body:{professional_id:profile},get:()=>recoveryKey},res,error=>{res.statusCode=error.status||500;res.body={error:error.message};}));}
    finally {recoveryReadOnly=false;}
    return res;
  };
  const checked=await inspect(key);
  assert.equal(checked.body.state,'registered');assert.equal(checked.headers['Cache-Control'],'no-store');
  assert.deepEqual(Object.keys(checked.body.data).sort(),['estado','fin_en','id','inicio_en']);
  assert.equal((await inspect(randomUUID())).body.state,'unknown');
  assert.equal((await inspect(key,randomUUID())).body.state,'unknown','A recovery key is bound to its professional');
  assert.equal((await inspect('invalid')).statusCode,400);assert.equal((await inspect(null)).statusCode,400);
  recoveryReadFailure=true;assert.equal((await inspect(key)).statusCode,503);recoveryReadFailure=false;
  assert.equal((await db.query('select count(*)::int n from crm_citas where paciente_id=$1',[patientId])).rows[0].n,1);
  assert.equal((await invoke(key,{...body,start_at:'2040-04-09T11:00:00Z',end_at:'2040-04-09T12:00:00Z'})).statusCode,409,'A reused key cannot change the booking');
  assert.equal((await invoke('invalid',body)).statusCode,400);
  assert.equal((await invoke(null,body)).statusCode,400);
  assert.equal((await invoke(randomUUID(),{...body,full_name:'   '})).statusCode,400);
  assert.equal((await invoke(randomUUID(),{...body,email:{}})).statusCode,400);
  const other=await invoke(randomUUID(),body);
  assert.equal(other.statusCode,409,'An independent booking cannot recover someone else’s appointment');
  assert.equal(other.body.local_conflicts,undefined,'Public rejection must not disclose other patients');
  assert.equal(other.body.data,undefined);
  insertError={code:'23P01',message:'Synthetic late exclusion rejection'};
  const late=await invoke(randomUUID(),{...body,start_at:'2040-04-09T13:00:00Z',end_at:'2040-04-09T14:00:00Z'});
  assert.equal(late.statusCode,409);assert.equal(late.body.available,false);
  await db.query("update crm_citas set inicio_en='2040-04-09T15:00Z',fin_en='2040-04-09T16:00Z' where id=$1",[recovered.body.data.id]);
  assert.equal((await invoke(key,body)).body.code,'BOOKING_ALREADY_CHANGED','A changed time is never confirmed as the original slot');
  assert.match((await inspect(key)).body.data.inicio_en,/15:00/,'Recovery shows the current saved time');
  await db.query("update crm_citas set estado='cancelada' where id=$1",[recovered.body.data.id]);
  const cancelled=await invoke(key,body);assert.equal(cancelled.statusCode,409);assert.equal(cancelled.body.code,'BOOKING_ALREADY_CHANGED');
  assert.equal((await inspect(key)).body.state,'changed');
  await db.query('update crm_citas set public_booking_hash=null where id=$1',[recovered.body.data.id]);
  assert.equal((await inspect(key)).body.state,'unknown','Internal appointment keys cannot be used for public recovery');
  assert.equal((await db.query('select count(*)::int n from crm_citas where paciente_id=$1',[patientId])).rows[0].n,1,'A cancelled reservation is never recreated on retry');
  console.log('PASS: public booking recovers a lost SQL acknowledgement, binds retries to their payload, rejects late overlap and never recreates cancelled bookings.');
}
