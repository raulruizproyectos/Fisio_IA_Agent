// Run the actual page handlers with controlled network responses, without patient data or Cloud access.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { transpileModule } = require('typescript');
const source = await readFile(new URL('../frontend/src/pages/index.astro', import.meta.url), 'utf8');
const section = (start,end) => {
  const from = source.indexOf(start);
  assert.ok(from >= 0, start);
  const to = source.indexOf(end,from);
  assert.ok(to > from, end);
  return source.slice(from,to);
};
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes,no) => {resolve=yes;reject=no;});
  return {promise,resolve,reject};
};
function setup(fetchJson) {
  const handlers = {}, renders = [], toasts = [], reloads = [];
  const element = name => ({value:'',innerHTML:'',disabled:false,attributes:new Set(),
    classList:{add(){},remove(){}},setAttribute(key){this.attributes.add(key);if(key==='disabled')this.disabled=true;},
    removeAttribute(key){this.attributes.delete(key);if(key==='disabled')this.disabled=false;},
    hasAttribute(key){return this.attributes.has(key);},addEventListener:(_event,handler)=>{handlers[name]=handler;}});
  const button = {disabled:false};
  const form = {fields:new Map([['fecha','2026-10-07'],['nota','Nota ficticia'],['dolor_eva','0']]),
    querySelector:selector=>selector.includes('nota_id') ? {get value(){return form.fields.get('nota_id');},set value(v){form.fields.set('nota_id',v);}} : button,
    addEventListener:(_event,handler)=>{handlers.note=handler;}};
  const data = id => ({paciente:{id},notas:[{nota:`anterior ${id}`}],module_availability:[]});
  const context = {
    fichaPatientId:'A', fichaLoadVersion:1, fichaNotesRefreshVersion:0, fichaData:data('A'), BACKEND_BASE:'', fetchJson,
    fichaNotaEditVersion:0,fichaDatosEditVersion:0,voiceSessionVersion:1,isFichaModuleUnavailable:()=>false,
    getPatientFullName:p=>p.nombre_completo,selectedPatientName:'',fichaTitulo:{},escapeHtml:text=>text,
    fichaNotaForm:form, fichaNotaFormCard:{hidden:false},fichaNotaFormTitle:{},voiceRecoveredNoteId:null,painRecoveredNoteId:null,
    createClinicRecord:(url,body)=>fetchJson(url,{method:'POST',body:JSON.stringify(body)}),
    fichaDatosForm:{...form,fields:new Map([['nombre','Nombre enviado']]),addEventListener:(_event,handler)=>{handlers.patient=handler;}},
    FormData:class {constructor(f){this.fields=f.fields;}get(k){return this.fields.get(k)||null;}entries(){return this.fields.entries();}},
    renderFichaHero:d=>renders.push(['hero',d]),renderFichaWorkspace:d=>renders.push(['workspace',d]),
    renderFichaNotas:n=>renders.push(['notes',n]),renderFichaDatos:d=>renders.push(['data',d]),fichaDatosView:{hidden:true},
    syncFichaAvailabilityUi:modules=>{context.modules=modules;},
    showToast:(...args)=>toasts.push(args),openFichaPaciente:id=>{reloads.push(id);return true;}, loadPacientes:()=>{},
    btnSavePainZone:{disabled:false,addEventListener:(_event,handler)=>{handlers.pain=handler;}},
    activeSelectedZone:'rodilla',painMapEditor:{hidden:false},painEvaSlider:{value:'0'},painZoneNotes:{value:'Mapa ficticio'},
    zonaLabels:{rodilla:'Rodilla'},painMapEditVersion:0,
    btnSynthesizeVoiceNote:element('synthesis'),voiceReviewConfirmBtn:element('voice'),
    voiceTranscriptInput:{value:'Texto ficticio'},voiceCaptureFeedback:{hidden:true},
    voiceReviewSummary:{value:'Resumen ficticio'},voiceReviewEva:{value:'0'},voiceReviewEvaCompare:{},
    voiceReviewZone:{value:'rodilla'},voiceReviewMobility:{value:''},voiceReviewEvolution:{value:'favorable'},
    voiceReviewTreatment:{value:''},voiceReviewExercises:{value:''},voiceReviewNextStep:{value:''},
    voiceStepCapture:element(),voiceStepReview:element(),recordedAudioBase64:null,
    closeVoiceSessionModal:()=>{context.closedVoice=true;context.voiceSessionVersion++;},
    voiceRecordToggleBtn:element('record'),voiceRecordStatus:{},voiceRecordIcon:{},voiceRecordTimer:{},
    isRecording:false,audioChunks:[],mediaRecorder:null,recordTimerInterval:null,recordSeconds:0,
    clearInterval(){},setInterval(){return 0;},
    navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>{context.streamStopped=true;}}]})}},
    MediaRecorder:class {static isTypeSupported(){return true;}state='inactive';start(){this.state='recording';}},
    document:{querySelectorAll:()=>[]},alert:msg=>toasts.push([msg,'error']),
  };
  const script = [
    source.includes('  const isCurrentFicha =') ? section('  const isCurrentFicha =','  const openFichaPaciente =') : '',
    section('  const refreshFichaNotes =','  // Confirm and save session note'),
    section("  btnSynthesizeVoiceNote?.addEventListener('click'",'  btnBackToCapture?.'),
    section("  voiceRecordToggleBtn?.addEventListener('click'",'  // Synthesize Note'),
    section("  voiceReviewConfirmBtn?.addEventListener('click'",'  // Nota actions'),
    section("  fichaNotaForm?.addEventListener('submit'",'  // Delegate nota edit/delete clicks'),
    section("  fichaDatosForm?.addEventListener('submit'",'  // Render citas'),
    section('  if (btnSavePainZone) {','  // ======================================================='),
    'globalThis.refresh = refreshFichaNotes;',
  ].join('\n');
  runInNewContext(transpileModule(script,{}).outputText,context);
  return {context,handlers,button,renders,toasts,reloads,data};
}
const submit = handler => handler({preventDefault(){}});

// Changed drafts after an unknown write recover the original ID; the next save edits that row.
for (const name of ['note','pain','voice']) {
  const requests=[];let conflict=true;
  const h=setup((url,opts)=>{
    requests.push([url,opts]);
    if(opts && conflict){conflict=false;return Promise.reject(Object.assign(new Error('Already saved'),{recoveredData:{id:'recovered'}}));}
    return Promise.resolve(opts ? {data:{id:'recovered'}} : {data:[]});
  });
  await submit(h.handlers[name]);
  assert.equal(h.toasts[0][1],'warning');assert.equal(h.context.fichaNotaFormCard.hidden,false);
  await submit(h.handlers[name]);
  assert.equal(requests[1][0],'/api/notas-clinicas/recovered');assert.equal(requests[1][1].method,'PATCH');
}

// A stopped old recording must not append audio or start transcribing in a new session.
{
  const h=setup(()=>{throw new Error('Obsolete audio must not use the API');});
  await h.handlers.record();const recorder=h.context.mediaRecorder;
  h.context.voiceSessionVersion++;h.context.audioChunks=['new session'];
  recorder.ondataavailable({data:{size:1}});await recorder.onstop();
  assert.equal(h.context.audioChunks.length,1);assert.equal(h.context.streamStopped,true);
}

// A successful write must not close or reload a newly selected patient's draft.
for (const name of ['note','pain','patient','voice','synthesis']) {
  const write = deferred(), requests = [];
  const h = setup((url,opts)=>{requests.push([url,opts]);return write.promise;});
  const pending = submit(h.handlers[name]);
  h.context.fichaPatientId='B'; h.context.fichaLoadVersion=2; h.context.fichaData=h.data('B');
  write.resolve({}); await pending;
  assert.equal(h.context.fichaNotaFormCard.hidden,false,`${name}: new note editor preserved`);
  assert.equal(h.context.painMapEditor.hidden,false,`${name}: new map editor preserved`);
  assert.equal(h.reloads.length,0,`${name}: new patient not reloaded`);
  assert.equal(requests.length,1,`${name}: stale refresh skipped`);
  assert.equal(h.context.closedVoice,undefined,`${name}: new voice session preserved`);
  assert.equal(h.context.voiceReviewSummary.value,'Resumen ficticio',`${name}: no stale synthesis`);
}

// Cancelling/reopening an editor while its previous write is pending preserves the new draft.
for (const [name,version] of [['note','fichaNotaEditVersion'],['pain','painMapEditVersion'],['voice','voiceSessionVersion'],['patient','fichaDatosEditVersion']]) {
  const write=deferred();const h=setup((_url,opts)=>opts ? write.promise : Promise.resolve({data:[],longitudinal_summary:null}));
  const pending=submit(h.handlers[name]);h.context[version]++;
  write.resolve({data:{nombre:'Confirmado'}});await pending;
  assert.equal(h.context.fichaNotaFormCard.hidden,false);
  assert.equal(h.context.painMapEditor.hidden,false);
  assert.equal(h.context.closedVoice,undefined);
  assert.notEqual(h.context.fichaDatosForm.hidden,true);
}

// Patient editing uses the acknowledged server row, without a second read that can fail.
{
  const requests=[];const h=setup((url,opts)=>{requests.push([url,opts]);return Promise.resolve({data:{nombre:'Nombre confirmado',resumen_clinico_longitudinal:null}});});
  h.context.fichaData.paciente.resumen_clinico_longitudinal='Resumen vigente';
  await submit(h.handlers.patient);
  assert.equal(h.context.fichaData.paciente.nombre,'Nombre confirmado');
  assert.equal(h.context.selectedPatientName,'Nombre confirmado');
  assert.match(h.context.fichaTitulo.innerHTML,/Nombre confirmado/);
  assert.equal(h.context.fichaData.paciente.resumen_clinico_longitudinal,'Resumen vigente');
  assert.equal(h.context.fichaDatosForm.hidden,true);assert.equal(h.context.fichaDatosView.hidden,false);
  assert.equal(requests.length,1);assert.equal(h.toasts[0][1],'success');
}

// Rejected writes keep the draft and release the button; duplicate submissions while pending are ignored.
{
  const write=deferred();let count=0;const h=setup(()=>{count++;return write.promise;});
  const pending=submit(h.handlers.note);await submit(h.handlers.note);
  assert.equal(count,1);write.reject(new Error('EVA inválida'));await pending;
  assert.equal(h.context.fichaNotaFormCard.hidden,false);assert.equal(h.button.disabled,false);
  assert.equal(h.toasts[0][1],'error');
}

// Selecting A again is a new view, even though the patient ID matches.
{
  const read = deferred(); const h = setup(()=>read.promise);
  const pending = h.context.refresh('A',1);
  h.context.fichaLoadVersion=3; h.context.fichaData=h.data('A');
  read.resolve({data:[{nota:'obsolete'}],longitudinal_summary:'obsolete'});
  assert.equal(await pending,false);
  assert.equal(h.context.fichaData.notas[0].nota,'anterior A');
  assert.equal(h.renders.length,0);
}

// The latest refresh wins when requests complete in reverse order.
{
  const first=deferred(), second=deferred(); let count=0;
  const h=setup(()=> (++count<=2 ? first : second).promise);
  const older=h.context.refresh('A',1), newer=h.context.refresh('A',1);
  second.resolve({data:[{nota:'latest'}],longitudinal_summary:'latest'}); await newer;
  first.resolve({data:[{nota:'obsolete'}],longitudinal_summary:'obsolete'}); await older;
  assert.equal(h.context.fichaData.notas[0].nota,'latest');
}

// Persistence succeeds but refreshing fails: hide stale clinical values and warn against repeating the save.
{
  const h=setup((_url,opts)=>opts ? Promise.resolve({}) : Promise.reject(new Error('offline')));
  await submit(h.handlers.note);
  assert.equal(h.context.fichaNotaFormCard.hidden,true);
  assert.ok(h.context.modules.some(m=>m.key==='notas'));
  assert.equal(h.context.fichaData.paciente.resumen_clinico_longitudinal,null);
  assert.equal(h.renders.filter(([kind])=>kind==='hero').length,1);
  assert.equal(h.toasts.length,1);
  assert.match(h.toasts[0][0],/no repitas el guardado/);
  assert.equal(h.toasts[0][1],'warning');
  assert.equal(h.button.disabled,false);
}

// A failed old refresh neither invalidates nor warns in the new patient's view.
{
  const read=deferred(), h=setup(()=>read.promise);
  const pending=h.context.refresh('A',1);
  h.context.fichaPatientId='B';h.context.fichaLoadVersion=2;h.context.fichaData=h.data('B');
  read.reject(new Error('offline')); await pending;
  assert.equal(h.renders.length,0);assert.equal(h.toasts.length,0);
}
console.log('PASS: actual patient/note/map handlers preserve new drafts; view versions and refresh order reject stale replies; saved-but-refresh-failed warns without stale clinical values.');
