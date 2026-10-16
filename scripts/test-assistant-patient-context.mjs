import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const { transpileModule } = createRequire(new URL('../frontend/package.json', import.meta.url))('typescript');
const source = readFileSync(new URL('../frontend/src/pages/index.astro', import.meta.url), 'utf8');
const section = (start,end) => { const from=source.indexOf(start),to=source.indexOf(end,from); assert.ok(from>=0&&to>from,start);return source.slice(from,to); };
const deferred = () => {let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
function setup(fetchJson) {
  const renders=[],reports=[],requests=[];
  const context={selectedPatientId:'A',selectedPatientName:'A',chatPatientSelect:{value:'A'},patientCatalog:[{id:'A',nombre_completo:'A'},{id:'B',nombre_completo:'B'}],
    assistantPatientBriefCache:{B:{patientId:'B',patientName:'B'}},currentAssistantPatientBrief:null,assistantPatientBriefRequestToken:0,
    lastExerciseReportPayload:null,lastExerciseRequestText:'',lastExerciseVisibleText:'',currentPatientTelegramLinkState:null,
    BACKEND_BASE:'',PROF_ID:'P',fetchJson,renderAssistantPatientBrief:brief=>renders.push(brief),
    buildAssistantPatientBrief:(patient)=>({patientId:context.selectedPatientId,patientName:patient.nombre_completo}),
    updateAssistantPatientSelectorState(){},updateExercisePdfButton(){},updateExerciseApproveButton(){},updateExerciseTelegramButton(){},
    renderAssistantPatientContext(){},renderAssistantFlowCard(){},rememberSelectedPatient(){},loadAssistantTelegramLinkState(){},
    pendingExerciseRecommendationJobs:new Map(),
    isDevMode:false,addMessage(){},upsertAgentProgress(){},setSending(){},clearAgentProgress(){},renderExerciseOpsMetric(){},
    syncEngineOpsFromPayload(){},setAssistantCareStep(){},activeSection:'dashboard',setAgentStatus(){},isTimeoutError:()=>false,
    shouldFallbackToSyncExerciseRequest:()=>false,
    startExerciseRecommendationAsync:async(_text,patientId)=>{requests.push(patientId);return {job_id:'job-'+patientId};},
    pollExerciseRecommendationJob:async(jobId)=>({ok:true,patient_id:jobId.replace('job-',''),recommendation_id:'R',exercises:[{id:'E'}]}),
    addExerciseReport:report=>reports.push(report),fichaPatientId:null,
  };
  const script=[section('  const syncAssistantPatientBriefFromData =','  const loadAssistantTelegramLinkState ='),
    section('  function syncChatPatientSelection(','  const renderExerciseOpsMetric ='),
    section('  const handleExerciseRecommend =','  log?.addEventListener('),
    'globalThis.api={loadAssistantPatientBrief,syncChatPatientSelection,handleExerciseRecommend};'].join('\n');
  runInNewContext(transpileModule(script,{}).outputText,context);
  return {context,renders,reports,requests};
}
// A late read must not replace the already cached context of B.
{
  const response=deferred();const h=setup(()=>response.promise);
  const old=h.context.api.loadAssistantPatientBrief('A');
  h.context.api.syncChatPatientSelection('B');await h.context.api.loadAssistantPatientBrief('B');
  response.resolve({data:{nombre_completo:'A'}});await old;
  assert.equal(h.context.currentAssistantPatientBrief.patientName,'B');
  assert.equal(h.context.assistantPatientBriefCache.B.patientName,'B');
}
// Changing to a patient without cached data cannot reuse the previous clinical context.
{
  const h=setup(()=>Promise.resolve({data:{}}));h.context.currentAssistantPatientBrief={patientId:'A',patientName:'A'};
  delete h.context.assistantPatientBriefCache.B;h.context.api.syncChatPatientSelection('B');
  assert.equal(h.context.currentAssistantPatientBrief,null);
}
// A pending report belongs to its patient; starting B must not resume A's job.
{
  const h=setup(()=>Promise.resolve({data:{}}));
  h.context.pendingExerciseRecommendationJobs.set('A','job-A');
  h.context.api.syncChatPatientSelection('B');await h.context.api.handleExerciseRecommend('Caso B','Caso B',{patientId:'B'});
  assert.equal(h.reports[0]?.patient_id,'B');assert.deepEqual(h.requests,['B']);
  assert.equal(h.context.pendingExerciseRecommendationJobs.get('A'),'job-A');
}
// A report finishing after navigation must not appear under the new patient's name.
{
  const result=deferred();const h=setup(()=>Promise.resolve({data:{}}));
  h.context.pollExerciseRecommendationJob=()=>result.promise;
  const old=h.context.api.handleExerciseRecommend('Caso A','Caso A',{patientId:'A'});
  await Promise.resolve();h.context.api.syncChatPatientSelection('B');
  result.resolve({ok:true,patient_id:'A',recommendation_id:'R',exercises:[{id:'E'}]});await old;
  assert.equal(h.reports.length,0);
}
// The server may finish a job after a transport timeout: retain its identity to resume it.
{
  const h=setup(()=>Promise.resolve({data:{}}));
  h.context.pollExerciseRecommendationJob=async()=>{throw Object.assign(new Error('late'),{name:'TimeoutError'});};
  await h.context.api.handleExerciseRecommend('Caso A','Caso A',{patientId:'A'});
  assert.equal(h.context.pendingExerciseRecommendationJobs.get('A'),'job-A');
}
// Even a malformed/wrong job response must not make another patient's report usable.
{
  const h=setup(()=>Promise.resolve({data:{}}));
  h.context.pollExerciseRecommendationJob=async()=>({ok:true,patient_id:'B',recommendation_id:'R',exercises:[{id:'E'}]});
  await h.context.api.handleExerciseRecommend('Caso A','Caso A',{patientId:'A'});
  assert.equal(h.reports.length,0);
}
// The complete history loader must also ignore A after B has become the selected case.
{
  const old=deferred(),renders=[];
  const context={selectedPatientId:'A',selectedPatientName:'A',historyLoadVersion:0,historialContent:{innerHTML:''},historyOpenFichaBtn:null,
    BACKEND_BASE:'',pendingHistoryAnchor:null,currentPatientTelegramLinkState:null,
    fetchJson:url=>{
      const payload=url.includes('/api/pacientes/')?{data:{nombre_completo:url.endsWith('/A')?'A':'B'}}:{data:[]};
      return url.includes('/A')?old.promise.then(()=>payload):Promise.resolve(payload);
    },
    escapeHtml:String,fmtDate:String,withFreshTelegramInvitation:(_id,data)=>data,updateExerciseTelegramButton(){},
    syncAssistantPatientBriefFromData:(id,patient)=>renders.push([id,patient.nombre_completo]),rememberSelectedPatient(){},
    historyNoteComposerHtml:'',renderPatientTelegramLinkBlock:()=>'',focusHistoryAnchor(){},
  };
  const loader=section('  const loadHistorial =',"  pageLoaders['historial']");
  runInNewContext(transpileModule(loader+'\nglobalThis.load=loadHistorial;',{}).outputText,context);
  const loadingA=context.load();context.selectedPatientId='B';context.selectedPatientName='B';await context.load();
  const renderedB=context.historialContent.innerHTML;
  old.resolve();await loadingA;
  assert.equal(context.historialContent.innerHTML,renderedB);
  assert.deepEqual(renders,[['B','B']]);
}
console.log('PASS: contexto y trabajos de informes aislados por paciente ante respuestas tardías.');
