// Actual shared browser helpers: lost acknowledgements survive reload without storing clinical text.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require=createRequire(new URL('../frontend/package.json',import.meta.url));
const {transpileModule}=require('typescript');
const source=await readFile(new URL('../frontend/src/pages/index.astro',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('  const fetchJson ='),source.indexOf('  const sanitizePageTextNodes ='));
assert.ok(helpers.includes('const createClinicRecord ='));
const storage=new Map(),requests=[];
const sessionStorage={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
const load=fetch=>{
  const context={fetch,sessionStorage,crypto:{randomUUID},authContext:{profileId:'fixture'},AbortSignal,sanitizePayload:p=>p};
  runInNewContext(transpileModule(helpers+'\nglobalThis.save=createClinicRecord;',{}).outputText,context);
  return context.save;
};
let lost=true,savedKey;
const network=async(url,opts)=>{
  requests.push([url,opts]);
  const key=opts.headers['Idempotency-Key'];
  savedKey??=key;assert.equal(key,savedKey);
  if(lost){lost=false;throw new TypeError('Network disconnected after commit');}
  return new Response(JSON.stringify({data:{id:'saved'},replayed:true}),{status:200});
};
const body={paciente_id:'A',nota:'Private clinical draft',fecha:'2026-10-07'};
await assert.rejects(load(network)('/notes',body),/mismo guardado sin duplicarlo/);
assert.equal(storage.size,1);assert.ok(![...storage.values()].join('').includes(body.nota));
// Reload uses a fresh VM but the same tab storage, then clears only after acknowledgement.
assert.equal((await load(network)('/notes',body)).data.id,'saved');assert.equal(storage.size,0);
assert.equal(requests.length,2);assert.equal(requests[0][1].headers['Idempotency-Key'],requests[1][1].headers['Idempotency-Key']);
await load(async(_url,opts)=>{assert.notEqual(opts.headers['Idempotency-Key'],savedKey);return new Response('{"data":{"id":"next"}}');})('/notes',body);
// Malformed acknowledgement preserves the operation for an explicit retry.
await assert.rejects(load(async()=>new Response('{}'))('/notes',body),/No se ha recibido confirmación/);
assert.equal(storage.size,1);
// Changed draft recovers the original record for PATCH instead of silently inserting another.
await assert.rejects(load(async()=>new Response(JSON.stringify({code:'CREATE_ALREADY_SAVED',error:'Already saved',data:{id:'saved'}}),{status:409}))('/notes',{...body,nota:'Changed draft'}),
  error=>error.recoveredData.id==='saved' && error.status===409);
assert.equal(storage.size,0);
// Voice dates remain stable on retries; map, manual and voice use separate operations.
const seen=[];
const offline=load(async(_url,opts)=>{seen.push(opts);throw new Error('offline');});
for(const [draft,editor] of [[{...body,audio_processed:true,session_datetime:'2026-10-07T12:00:00Z'},'manual'],
  [{...body,audio_processed:true,session_datetime:'2026-10-07T13:00:00Z'},'manual'],[body,'manual'],[body,'map']]) {
  await assert.rejects(offline('/notes',draft,8000,editor));
}
assert.equal(seen[0].headers['Idempotency-Key'],seen[1].headers['Idempotency-Key']);
assert.equal(JSON.parse(seen[1].body).session_datetime,'2026-10-07T12:00:00Z');
assert.equal(new Set(seen.map(o=>o.headers['Idempotency-Key'])).size,3);
// The actual patient creation handler must not attach an old result to a reopened form.
for(const failure of [false,true]) {
  let handler,resolve,reject;
  const pending=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const context={addPatientBtn:null,patientForm:{addEventListener:(_event,h)=>{handler=h;}},patientFormVersion:1,
    patientSubmitBtn:{disabled:false,innerHTML:'Guardar paciente'},patientCreateLabel:'Guardar paciente',
    patientNameInput:{value:'Old draft'},patientEmailInput:{value:''},patientPhoneInput:{value:''},patientBirthDateInput:{value:''},
    PROF_ID:'fixture',BACKEND_BASE:'',recoveredPatientId:null,setPatientFormFeedback(){},createClinicRecord:()=>pending,
    loadPacientes(){throw new Error('Obsolete form must not reload/select');},closePatientModal(){throw new Error('New form must stay open');}};
  const start=source.indexOf("  addPatientBtn?.addEventListener('click', openPatientModal)");
  const end=source.indexOf("  pacientesBody?.addEventListener('click'",start);
  assert.ok(start>=0 && end>start);context.openPatientModal=()=>{};
  runInNewContext(transpileModule(source.slice(start,end),{}).outputText,context);
  const saving=handler({preventDefault(){}});context.patientFormVersion++;
  if(failure)reject(Object.assign(new Error('Already saved'),{recoveredData:{id:'old-patient'}}));else resolve({data:{id:'old-patient'}});
  await saving;assert.equal(context.recoveredPatientId,null);assert.equal(context.patientSubmitBtn.disabled,false);
  assert.equal(context.patientSubmitBtn.innerHTML,'Guardar paciente');
}
console.log('PASS: actual creation helpers preserve retry IDs across reload, retain incomplete writes, recover conflicts, separate editors and keep voice timestamps without persisting clinical text.');
