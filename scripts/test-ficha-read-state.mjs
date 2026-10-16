import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const{transpileModule}=createRequire(new URL('../frontend/package.json',import.meta.url))('typescript');
const source=readFileSync(new URL('../frontend/src/pages/index.astro',import.meta.url),'utf8');
const section=(start,end)=>{const from=source.indexOf(start),to=source.indexOf(end,from);assert.ok(from>=0&&to>from,start);return source.slice(from,to);};
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
// Editing notes created by the map or dictation must preserve their stored body area.
{
  const view=readFileSync(new URL('../frontend/src/components/views/FichaPacienteView.astro',import.meta.url),'utf8');
  const options=html=>new Set([...html.matchAll(/<option value="([^"]*)"/g)].map(match=>match[1]));
  const manual=options(view.match(/<select name="zona_corporal"[\s\S]*?<\/select>/)?.[0]||'');
  const voice=options(view.match(/<select id="voiceReviewZone"[\s\S]*?<\/select>/)?.[0]||'');
  const map=[...view.matchAll(/data-zone="([^"]+)"/g)].map(match=>match[1]);
  for(const area of [...voice,...map])assert.ok(manual.has(area),'Editing must preserve '+area);
}
// Loading and failed cases hide the previous clinical contents while keeping a usable back button.
{
  const nodes=Array.from({length:3},()=>({inert:false,style:{value:'',setProperty(_name,value){this.value=value;},removeProperty(){this.value='';}}}));
  const buttons=[{disabled:false}],notice={hidden:true,textContent:''};
  const page={setAttribute(){},querySelectorAll:selector=>{if(selector.includes('button'))return buttons;assert.ok(selector.includes('.ficha-followup'),'The previous clinical follow-up must also be hidden');return nodes;}};
  const context={document:{querySelector:()=>page},fichaAvailabilityNotice:notice};
  runInNewContext(transpileModule(section('  const setFichaLoadState =','  const openFichaPaciente =')+'\nglobalThis.state=setFichaLoadState;',{}).outputText,context);
  context.state('Cargando expediente…');assert.ok(nodes.every(node=>node.inert&&node.style.value==='none'));assert.ok(buttons[0].disabled);assert.equal(notice.hidden,false);
  context.state('No se pudo cargar');assert.ok(nodes.every(node=>node.inert&&node.style.value==='none'));
  context.state();assert.ok(nodes.every(node=>!node.inert&&node.style.value===''));assert.equal(buttons[0].disabled,false);
}
// A late document read from A cannot put A's consent or signature actions into B's file.
{
  const old=deferred(),renders=[];const container={innerHTML:''};
  const context={fichaPatientId:'A',fichaLoadVersion:1,fichaDocumentsVersion:0,fichaData:{recommendations:[]},BACKEND_BASE:'',
    isCurrentFicha:(id,version)=>id===context.fichaPatientId&&version===context.fichaLoadVersion,
    document:{getElementById:()=>container},setListState:(_node,_icon,text)=>{container.innerHTML=text;},
    fetchJson:url=>url.endsWith('=A')?old.promise:Promise.resolve({data:[{id:'B-doc'}]}),renderFichaDocumentos:docs=>renders.push(docs[0].id)};
  runInNewContext(transpileModule(section('  const loadFichaDocumentos =','  // ===================== GESTORIA')+'\nglobalThis.load=loadFichaDocumentos;',{}).outputText,context);
  const loadingA=context.load();context.fichaPatientId='B';context.fichaLoadVersion=2;await context.load();
  old.resolve({data:[{id:'A-doc'}]});await loadingA;assert.deepEqual(renders,['B-doc']);
}
// Missing synthesis facts stay missing; the AI's documented 'mejora' maps to the UI label.
{
  const evolution=source.match(/if \(voiceReviewEvolution\) voiceReviewEvolution\.value = [^\n]+;/)?.[0];assert.ok(evolution);
  for(const[input,expected]of [[null,''],['mejora','favorable'],['estable','estable'],['recaida','recaida']]){
    const context={voiceReviewEvolution:{value:'favorable'},preview:{evolucion:input}};runInNewContext(evolution,context);assert.equal(context.voiceReviewEvolution.value,expected);
  }
}
// A failed plan read is unavailable, never proof that the patient has no plans.
{
  const errors=[];
  const context={fichaPatientId:null,fichaLoadVersion:0,fichaData:null,fichaReviewBanner:null,fichaDatosForm:null,fichaDatosView:{},fichaNotaFormCard:null,selectedPatientId:null,selectedPatientName:'',
    painMapEditor:null,activeSelectedZone:null,fichaTitulo:null,isDevMode:false,BACKEND_BASE:'',firmaDocId:null,
    document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null},syncFichaAvailabilityUi(){},setFichaLoadState(){},activateFichaTab(){},
    closeVoiceSessionModal(){},closeFirmaModal(){},loadFichaReview(){},getPatientFullName:patient=>patient.nombre,escapeHtml:String,console:{error:(...args)=>errors.push(args)},
    renderFichaHero(){},renderFichaWorkspace(){},renderFichaDatos(){},renderFichaCitas(){},renderFichaPagos(){},renderFichaNotas(){},
    fetchJson:async url=>{if(url.includes('/api/exercises/'))throw new Error('unavailable');return{paciente:{id:'B',nombre:'B'},citas:[],pagos:[],notas:[],module_availability:[]};},
  };
  runInNewContext(transpileModule(section('  const openFichaPaciente =','  const fichaField =')+'\nglobalThis.open=openFichaPaciente;',{}).outputText,context);
  await context.open('B');assert.ok(context.fichaData.module_availability.some(item=>item.key==='recommendations'));assert.equal(errors.length,0);
}
// The latest timestamp decides each pain zone, including a genuine EVA 0 which clears old pain.
{
  const zone={classList:{pain:false,remove(){this.pain=false;},add(){this.pain=true;}},style:{fill:''},getAttribute:()=> 'rodilla',setAttribute(){},removeAttribute(){}};
  const context={window:{},document:{querySelectorAll:()=>[zone]},zonaLabels:{rodilla:'Rodilla'},fmtDate:String};
  runInNewContext(transpileModule(section('  (window as any).updatePainMapVisuals =','  // Pain Map Event Listeners'),{}).outputText,context);
  context.window.updatePainMapVisuals([{id:'later',fecha:'2026-10-15',session_datetime:'2026-10-15T16:00Z',zona_corporal:'rodilla',dolor_eva:0},
    {id:'early',fecha:'2026-10-15',session_datetime:'2026-10-15T08:00Z',zona_corporal:'rodilla',dolor_eva:8}]);
  assert.equal(zone.classList.pain,false);assert.equal(zone.style.fill,'');
  context.window.updatePainMapVisuals([{fecha:'2026-10-15',zona_corporal:'rodilla',dolor_eva:8}]);assert.equal(zone.classList.pain,true);
  context.window.updatePainMapVisuals([]);assert.equal(zone.classList.pain,false);
}
console.log('PASS: ficha y documentos no muestran otro paciente; voz no inventa evolución y el mapa sigue la última EVA.');
