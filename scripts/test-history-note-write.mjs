import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const {transpileModule}=createRequire(new URL('../frontend/package.json',import.meta.url))('typescript');
const source=readFileSync(process.env.FISIO_INDEX_SOURCE || new URL('../frontend/src/pages/index.astro',import.meta.url),'utf8');
const start=source.indexOf("  historialContent?.addEventListener('submit'");
const end=source.indexOf("  historialContent?.addEventListener('keydown'",start);
assert.ok(start>=0&&end>start);
function fixture(){
  let resolve,reject;const pending=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const note={value:'Evolución documentada',focus(){}},button={disabled:false,innerHTML:'Guardar'},feedback=[],messages=[],requests=[];
  const form={matches:selector=>selector.includes('history-note-form'),elements:{namedItem:name=>name==='texto_nota'?note:{value:'crm_web'}},querySelector:()=>button};
  let handler;const context={selectedPatientId:'A',selectedPatientName:'Ana',historyLoadVersion:1,PROF_ID:'professional',BACKEND_BASE:'',
    historialContent:{addEventListener:(_name,fn)=>{handler=fn;}},fetchJson:(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return pending;},
    setHistoryNoteFeedback:(_form,text)=>feedback.push(text),addMessage:text=>messages.push(text),loadHistorial:async()=>{context.loads++;},loads:0};
  runInNewContext(transpileModule(source.slice(start,end),{}).outputText,context);
  return{context,note,button,feedback,messages,requests,resolve,reject,submit:()=>handler({target:form,preventDefault(){}})};
}
{
  const f=fixture(),first=f.submit(),second=f.submit();assert.equal(f.requests.length,1,'Repeated submit must not duplicate a pending note');await second;
  f.resolve({data:{id:'note-A'}});await first;assert.equal(f.context.loads,1);assert.match(f.messages[0],/Ana/);assert.equal(f.requests[0].body.paciente_id,'A');
}
for(const status of [undefined,500]){
  const f=fixture(),first=f.submit();f.reject(Object.assign(new Error('timeout'),{status}));await first;
  assert.equal(f.note.value,'Evolución documentada');assert.equal(f.button.disabled,true);assert.match(f.feedback.at(-1),/comprueba si la nota/);
  await f.submit();assert.equal(f.requests.length,1);assert.equal(f.context.loads,0);
}
{
  const f=fixture(),first=f.submit();f.resolve({data:null});await first;assert.equal(f.button.disabled,true);assert.match(f.feedback.at(-1),/confirmación/);
}
{
  const f=fixture(),first=f.submit();f.reject(Object.assign(new Error('Invalid note'),{status:400}));await first;assert.equal(f.button.disabled,false);assert.match(f.feedback.at(-1),/Invalid note/);
}
{
  const f=fixture(),first=f.submit();f.context.selectedPatientId='B';f.context.selectedPatientName='Bea';f.context.historyLoadVersion=2;
  f.resolve({data:{id:'note-A'}});await first;assert.equal(f.messages.length,0);assert.equal(f.context.loads,0);
}
{
  const f=fixture(),first=f.submit();f.note.value='Nueva nota escrita mientras guardaba';f.resolve({data:{id:'note-A'}});await first;
  assert.equal(f.note.value,'Nueva nota escrita mientras guardaba');assert.equal(f.context.loads,0);assert.equal(f.button.disabled,false);assert.match(f.feedback.at(-1),/Se conserva el texto/);
}
console.log('History-note write context, pending-submit and uncertain-write checks passed.');
