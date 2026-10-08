// Exercise the actual public page script with controlled responses; no network or patient data.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';
const source=await readFile(new URL('../frontend/src/pages/reserva.astro',import.meta.url),'utf8');
assert.ok(source.includes('src="../scripts/public-booking.js"'),'Public booking page loads its bundled controller');
const script=(await readFile(new URL('../frontend/src/scripts/public-booking.js',import.meta.url),'utf8'))
  .replaceAll('import.meta.env.PUBLIC_BACKEND_URL', "'http://local.invalid'");
assert.ok(script,'Public booking script exists');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const response=(data,status=200)=>({ok:status<400,status,text:async()=>JSON.stringify(data)});
const slot=(date,hour='09')=>({start_at:`${date}T${hour}:00:00Z`,end_at:`${date}T10:00:00Z`,start_local:`${hour}:00`,end_local:'10:00'});
async function setup({storage=new Map(),blockStorageWrite=false,blockStorageRead=false,blockStorageRemove=false}={}){
  const elements=new Map(),requests=[];
  class Element {
    value='';hidden=false;disabled=false;children=[];events={};attributes={};textContent='';
    classList={add(){},remove(){}};
    set innerHTML(value){this.html=value;this.children=[];}get innerHTML(){return this.html||'';}
    addEventListener(event,fn){this.events[event]=fn;}setAttribute(k,v){this.attributes[k]=v;}
    removeAttribute(k){delete this.attributes[k];}appendChild(e){this.children.push(e);}
    querySelectorAll(){return this===elements.get('bookingForm') ? ['patientNameInput','patientPhoneInput','patientEmailInput','bookingReasonInput'].map(id=>elements.get(id)) : this.children;}
    reset(){this.querySelectorAll().forEach(e=>{e.value='';});}focus(){}scrollIntoView(){}
  }
  const document={getElementById:id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement:()=>new Element()};
  const fetch=(url,options={})=>{
    if(new URL(url).pathname.endsWith('/config'))return Promise.resolve(response({data:{professional:{id:'local-professional',nombre_completo:'Profesional de ensayo'},clinic:{name:'Clínica ficticia'},booking:{min_date:'2026-10-08',max_date:'2026-10-20',time_zone:'Europe/Madrid'}}}));
    const pending=deferred();requests.push({url,options,...pending});return pending.promise;
  };
  document.getElementById('bookingSuccess').hidden=true;
  const sessionStorage={getItem(key){if(blockStorageRead)throw new Error('Storage unavailable');return storage.get(key)||null;},setItem(key,value){if(blockStorageWrite)throw new Error('Storage unavailable');storage.set(key,value);},removeItem(key){if(blockStorageRemove)throw new Error('Storage unavailable');storage.delete(key);}};
  runInNewContext(script,{document,fetch,crypto:{randomUUID},configuredBackendBase:'http://local.invalid',window:{sessionStorage,location:{search:'?professional_id=local-professional',hostname:'local.invalid',origin:'http://local.invalid'}},URL,URLSearchParams,Intl,Date});
  await flush();
  const e=id=>elements.get(id),emit=(id,event)=>e(id).events[event]({preventDefault(){}});
  const answer=(request,data,status)=>request.resolve(response(data,status));
  return {e,emit,requests,answer,storage};
}
const tests=[];
const test=(name,run)=>tests.push({name,run});
for(const lateError of [false,true])test(`Latest date survives an older ${lateError?'error':'response'}`,async()=>{
  const h=await setup();h.e('bookingDate').value='2026-10-09';const newer=h.emit('bookingDate','change');
  h.answer(h.requests[1],{data:{slots:[slot('2026-10-09','11')]}});await newer;
  if(lateError)h.requests[0].reject(new Error('Old network error'));else h.answer(h.requests[0],{data:{slots:[slot('2026-10-08')]}});
  await flush();assert.match(h.e('slotsGrid').children[0]?.innerHTML||'',/11:00/);
  assert.equal(h.e('bookingFeedback').textContent.includes('Old network error'),false);
});
test('Selection is explicit, pending saves stay locked and repeated submits send one request',async()=>{
  const h=await setup();h.answer(h.requests[0],{data:{slots:[slot('2026-10-08')]}});await flush();
  h.e('patientNameInput').value='Paciente ficticio';h.e('patientPhoneInput').value='600000000';h.emit('patientNameInput','input');
  assert.equal(h.e('bookingSubmitBtn').disabled,true,'A patient must choose a time');
  h.e('slotsGrid').children[0].events.click();assert.equal(h.e('bookingSubmitBtn').disabled,false);
  const saved=h.emit('bookingForm','submit');h.emit('patientNameInput','input');await h.emit('bookingForm','submit');
  assert.equal(h.e('bookingSubmitBtn').disabled,true);assert.equal(h.e('bookingDate').disabled,true);assert.equal(h.e('patientNameInput').disabled,true);
  assert.equal(h.requests.filter(r=>r.options.method==='POST').length,1);
  h.e('bookingDate').value='2026-10-09';await h.emit('bookingDate','change');
  assert.equal(h.requests.length,2,'Date changes cannot reload during a write');
  h.answer(h.requests[1],{data:{id:'appointment-fixture'},booking:{professional_name:'Profesional de ensayo'}});await saved;
  assert.equal(h.e('bookingSuccess').hidden,false);assert.match(h.e('bookingSuccessText').textContent,/09:00/);
  await h.emit('bookingForm','submit');assert.equal(h.requests.length,2,'A confirmed booking cannot submit again');
  assert.equal(h.e('bookingDate').disabled,true,'Confirmed date remains fixed');
  const again=h.emit('bookingResetBtn','click');assert.equal(h.e('bookingDate').disabled,false);assert.equal(h.e('bookingSuccess').hidden,true);
  h.answer(h.requests[2],{data:{slots:[slot('2026-10-09')]}});await again;
  assert.equal(h.e('bookingForm').hidden,false);assert.equal(h.e('patientNameInput').value,'');assert.equal(h.e('bookingSubmitBtn').disabled,true);
});
test('A conflict remains visible after refreshed times and requires a fresh selection',async()=>{
  const h=await setup();h.answer(h.requests[0],{data:{slots:[slot('2026-10-08')]}});await flush();
  h.e('patientNameInput').value='Paciente ficticio';h.e('patientEmailInput').value='qa@example.invalid';h.e('slotsGrid').children[0].events.click();
  const saved=h.emit('bookingForm','submit');h.answer(h.requests[1],{available:false},409);await flush();
  h.answer(h.requests[2],{data:{slots:[slot('2026-10-08','11')]}});await saved;
  assert.equal(h.e('bookingFeedback').hidden,false);assert.match(h.e('bookingFeedback').textContent,/acaba de ocuparse/);
  assert.equal(h.e('bookingSubmitBtn').disabled,true);assert.equal(h.e('patientNameInput').value,'Paciente ficticio');assert.equal(h.e('patientNameInput').disabled,false);
});
test('Failed availability is an error, not a day without appointments',async()=>{
  const h=await setup();h.requests[0].reject(new Error('Local failure'));await flush();
  assert.doesNotMatch(h.e('slotsState').textContent,/No quedan huecos/);assert.equal(h.e('bookingSubmitBtn').disabled,true);
  assert.equal(h.e('bookingFeedback').hidden,false);
});
test('A rejected save keeps contact data and restores controls',async()=>{
  const h=await setup();h.answer(h.requests[0],{data:{slots:[slot('2026-10-08')]}});await flush();
  h.e('patientNameInput').value='Paciente ficticio';h.e('patientPhoneInput').value='600000000';h.e('slotsGrid').children[0].events.click();
  const saved=h.emit('bookingForm','submit');h.answer(h.requests[1],{error:'Solicitud rechazada'},400);await saved;
  assert.equal(h.e('bookingSuccess').hidden,true);assert.equal(h.e('bookingForm').hidden,false);
  assert.equal(h.e('patientNameInput').value,'Paciente ficticio');assert.equal(h.e('patientNameInput').disabled,false);
  assert.equal(h.e('bookingDate').disabled,false);assert.equal(h.e('bookingFeedback').hidden,false);
  assert.match(h.e('bookingFeedback').textContent,/Solicitud rechazada/);
});
test('An uncertain save keeps its key; checking never resends the booking',async()=>{
  const h=await setup();h.answer(h.requests[0],{data:{slots:[slot('2026-10-08')]}});await flush();
  h.e('patientNameInput').value='Paciente ficticio';h.e('patientEmailInput').value='qa@example.invalid';h.e('slotsGrid').children[0].events.click();
  const saved=h.emit('bookingForm','submit');const original=h.requests[1].options;
  h.requests[1].reject(new Error('Response lost'));await saved;
  assert.equal(h.e('bookingDate').disabled,true);assert.equal(h.e('patientNameInput').disabled,true);
  assert.equal(h.e('bookingSubmitBtn').disabled,false);assert.equal(h.e('bookingSubmitBtn').textContent,'Comprobar reserva');
  h.e('bookingDate').value='2026-10-09';await h.emit('bookingDate','change');assert.equal(h.requests.length,2);
  h.e('patientNameInput').value='Programmatic change';
  const retry=h.emit('bookingForm','submit');assert.equal(new URL(h.requests[2].url).pathname,'/api/profesional/public-booking/recovery');
  assert.deepEqual(JSON.parse(h.requests[2].options.body),{professional_id:'local-professional'});
  assert.equal(h.requests[2].options.headers['Idempotency-Key'],original.headers['Idempotency-Key']);
  h.answer(h.requests[2],{state:'registered',data:{id:'appointment-fixture',inicio_en:'2026-10-08T09:00:00Z',fin_en:'2026-10-08T10:00:00Z'}});await retry;
  assert.equal(h.e('bookingSuccess').hidden,false);assert.match(h.e('bookingSuccessText').textContent,/11:00/);
});
test('A changed saved booking stops retries and directs the patient to the clinic',async()=>{
  const h=await setup();h.answer(h.requests[0],{data:{slots:[slot('2026-10-08')]}});await flush();
  h.e('patientNameInput').value='Paciente ficticio';h.e('patientEmailInput').value='qa@example.invalid';h.e('slotsGrid').children[0].events.click();
  const saved=h.emit('bookingForm','submit');h.answer(h.requests[1],{code:'BOOKING_ALREADY_CHANGED',error:'Contacta con la clínica'},409);await saved;
  assert.equal(h.e('bookingSubmitBtn').disabled,true);assert.equal(h.e('bookingDate').disabled,true);
  await h.emit('bookingForm','submit');assert.equal(h.requests.length,2);assert.equal(h.e('bookingSuccess').hidden,true);
});
test('An incomplete success response cannot confirm a booking or release the pending request',async()=>{
  const h=await setup();h.answer(h.requests[0],{data:{slots:[slot('2026-10-08')]}});await flush();
  h.e('patientNameInput').value='Paciente ficticio';h.e('patientEmailInput').value='qa@example.invalid';h.e('slotsGrid').children[0].events.click();
  const saved=h.emit('bookingForm','submit');h.answer(h.requests[1],{});await saved;
  assert.equal(h.e('bookingSuccess').hidden,true);assert.equal(h.e('patientNameInput').disabled,true);
  assert.equal(h.e('bookingSubmitBtn').textContent,'Comprobar reserva');assert.equal(h.e('bookingSubmitBtn').disabled,false);
});
test('Reload recovers a saved booking from a key alone without writing or storing contact data',async()=>{
  const h=await setup();h.answer(h.requests[0],{data:{slots:[slot('2026-10-08')]}});await flush();
  h.e('patientNameInput').value='Paciente ficticio';h.e('patientEmailInput').value='qa@example.invalid';h.e('slotsGrid').children[0].events.click();
  const saved=h.emit('bookingForm','submit');h.requests[1].reject(new Error('Response lost'));await saved;
  assert.equal(h.storage.size,1,'Persist the recovery key before posting');
  assert.equal([...h.storage.values()].join().includes('qa@example.invalid'),false);
  const reloaded=await setup({storage:h.storage});
  assert.equal(new URL(reloaded.requests[0].url).pathname,'/api/profesional/public-booking/recovery');
  assert.equal(reloaded.requests[0].options.headers['Idempotency-Key'],h.requests[1].options.headers['Idempotency-Key']);
  reloaded.answer(reloaded.requests[0],{state:'registered',data:{id:'appointment-fixture',inicio_en:'2026-10-09T09:00:00Z',fin_en:'2026-10-09T10:00:00Z',estado:'pendiente'}});await flush();
  assert.equal(reloaded.e('bookingSuccess').hidden,false);assert.match(reloaded.e('bookingSuccessText').textContent,/11:00/);
  assert.equal(reloaded.e('bookingDate').value,'2026-10-09','Recovered date follows the saved appointment, not the first booking date');
  assert.equal(reloaded.requests.some(r=>new URL(r.url).pathname.endsWith('/appointments')),false);
  assert.equal(reloaded.storage.size,1,'Confirmation stays recoverable until an explicit new booking');
  const again=reloaded.emit('bookingResetBtn','click');assert.equal(reloaded.storage.size,0);
  reloaded.answer(reloaded.requests[1],{data:{slots:[slot('2026-10-08')]}});await again;
});
test('Storage failure prevents a booking whose recovery key cannot survive reload',async()=>{
  const h=await setup({blockStorageWrite:true});h.answer(h.requests[0],{data:{slots:[slot('2026-10-08')]}});await flush();
  h.e('patientNameInput').value='Paciente ficticio';h.e('patientEmailInput').value='qa@example.invalid';h.e('slotsGrid').children[0].events.click();
  const saved=h.emit('bookingForm','submit');await flush();
  const writes=h.requests.filter(r=>r.options.method==='POST');
  for(const request of writes)request.reject(new Error('Synthetic stop'));
  await saved;assert.equal(writes.length,0);
  assert.equal(h.e('bookingSuccess').hidden,true);
});
for(const state of ['unknown','error'])test(`Reload with ${state} recovery stays locked; checking only reads status`,async()=>{
  const key=randomUUID(),storage=new Map([['fisio:public-booking:local-professional',key]]);
  const h=await setup({storage});
  if(state==='error')h.requests[0].reject(new Error('Read failed'));else h.answer(h.requests[0],{state:'unknown'});
  await flush();assert.equal(h.e('bookingDate').disabled,true);assert.equal(h.e('patientNameInput').disabled,true);
  assert.equal(h.e('bookingSubmitBtn').disabled,false);assert.equal(h.e('bookingSuccess').hidden,true);
  const retry=h.emit('bookingForm','submit');assert.equal(new URL(h.requests[1].url).pathname,'/api/profesional/public-booking/recovery');
  assert.equal(h.requests[1].options.headers['Idempotency-Key'],key);
  h.answer(h.requests[1],{state:'changed',data:{id:'fixture',estado:'cancelada'}});await retry;
  assert.equal(h.e('bookingSuccess').hidden,true);assert.equal(h.e('bookingSubmitBtn').disabled,true);
  assert.equal(storage.size,1);
});
for(const blockRead of [true,false])test(`Unreadable ${blockRead?'storage':'receipt'} cannot bypass an unresolved booking`,async()=>{
  const h=await setup({blockStorageRead:blockRead,storage:new Map([['fisio:public-booking:local-professional','invalid']])});
  assert.equal(h.requests.length,0);assert.equal(h.e('bookingSubmitBtn').disabled,true);
  assert.equal(h.e('patientNameInput').disabled,true);
});
test('A failed receipt cleanup cannot start another booking after confirmation',async()=>{
  const h=await setup({blockStorageRemove:true});h.answer(h.requests[0],{data:{slots:[slot('2026-10-08')]}});await flush();
  h.e('patientNameInput').value='Fixture';h.e('patientEmailInput').value='qa@example.invalid';h.e('slotsGrid').children[0].events.click();
  const saved=h.emit('bookingForm','submit');h.answer(h.requests[1],{data:{id:'appointment-fixture'}});await saved;
  await h.emit('bookingResetBtn','click');assert.equal(h.requests.length,2);assert.equal(h.e('bookingSuccess').hidden,false);
  assert.equal(h.storage.size,1);assert.equal(h.e('bookingDate').disabled,true);
});
let failures=0;
for(const {name,run} of tests){try{await run();console.log(`PASS: ${name}`);}catch(error){failures++;console.error(`FAIL: ${name}: ${error.message}`);}}
assert.equal(failures,0,'Public booking regressions');
