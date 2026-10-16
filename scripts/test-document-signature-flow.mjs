import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import{createRequire}from'node:module';
import{runInNewContext}from'node:vm';
const{transpileModule}=createRequire(new URL('../frontend/package.json',import.meta.url))('typescript');
const source=readFileSync(new URL('../frontend/src/pages/index.astro',import.meta.url),'utf8');
const section=(start,end)=>{const from=source.indexOf(start),to=source.indexOf(end,from);assert.ok(from>=0&&to>from,start);return source.slice(from,to);};
// Existing pending documents must open the same drawing pad, not POST an unsupported name signature.
{
  let click;const requests=[],opened=[];
  const doc={id:'doc-A',paciente_id:'A',contenido:'Texto que se firma',estado:'pendiente'};
  const context={el:{querySelectorAll:()=>[{addEventListener:(_event,handler)=>{click=handler;},getAttribute:()=>doc.id}]},safeDocs:[doc],patientId:'A',loadVersion:1,
    fichaPatientId:'A',BACKEND_BASE:'',isCurrentFicha:()=>true,requestTextInput:async()=> 'Nombre',
    fetchJson:async(...args)=>{requests.push(args);return{data:[]};},loadFichaDocumentos:async()=>{},showToast(){},
    openDocumentForSignature:record=>opened.push(record)};
  runInNewContext(transpileModule(section("  el.querySelectorAll('[data-doc-sign]')","  el.querySelectorAll('[data-doc-delete]')"),{}).outputText,context);
  await click();assert.equal(requests.length,0,'Signing is explicit after drawing, not on opening');assert.equal(opened[0],doc);
}
// The actual modal initializer validates the selected case and shows the exact stored legal text.
{
  const events=[],toasts=[];
  const context={fichaPatientId:'A',fichaLoadVersion:1,firmaDocId:null,firmaModalTitle:{},firmaDocContenido:{},
    isCurrentFicha:(id,version)=>id===context.fichaPatientId&&version===context.fichaLoadVersion,
    setFirmaFeedback(){},initFirmaPad(){events.push('pad');},showToast:(...args)=>toasts.push(args),
    document:{dispatchEvent:event=>events.push(event.type)},CustomEvent:class{constructor(type){this.type=type;}}};
  runInNewContext(transpileModule(section('  const openDocumentForSignature =','  const openFirmaModal =')+'\nglobalThis.open=openDocumentForSignature;',{}).outputText,context);
  context.open({id:'doc-A',paciente_id:'A',titulo:'Consentimiento',contenido:'Texto exacto',estado:'pendiente'});
  assert.equal(context.firmaDocId,'doc-A');assert.equal(context.firmaDocContenido.textContent,'Texto exacto');
  assert.deepEqual(events,['fisio:open-firma-modal','pad']);
  context.open({id:'doc-B',paciente_id:'B',contenido:'No mostrar'});assert.equal(events.length,2);
  context.open({id:'signed',paciente_id:'A',contenido:'Firmado',estado:'firmado'});assert.equal(events.length,2);assert.equal(toasts.length,1);
}
// Drawing with a mouse works even on browsers which do not expose TouchEvent.
{
  const strokes=[];
  const ctx={clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){strokes.push('stroke');}};
  const canvas={width:300,height:150,getContext:()=>ctx,getBoundingClientRect:()=>({width:300,height:150,left:0,top:0})};
  const context={firmaCanvas:canvas,firmaHasSig:false,firmaDrawing:false,firmaStatus:{}};
  runInNewContext(transpileModule(section('  const initFirmaPad =',"  document.getElementById('firmaClearBtn')")+'\ninitFirmaPad();',{}).outputText,context);
  canvas.onmousedown({clientX:10,clientY:10});canvas.onmousemove({clientX:20,clientY:15});canvas.onmouseup();
  assert.equal(context.firmaHasSig,true);assert.deepEqual(strokes,['stroke']);
}
// Saving uses the PNG field expected by the API and retains the document/patient captured at click time.
{
  let save;const requests=[];
  const button={disabled:false,innerHTML:'Guardar',addEventListener:(_event,handler)=>{save=handler;}};
  const context={firmaDocId:'doc-A',firmaHasSig:true,fichaPatientId:'A',fichaLoadVersion:1,
    firmaCanvas:{toDataURL:()=> 'data:image/png;base64,fixture'},BACKEND_BASE:'',
    document:{getElementById:()=>button},fetchJson:async(url,options)=>{requests.push([url,options]);return{data:{id:'doc-A'}};},
    isCurrentFicha:()=>true,closeFirmaModal(){},openProtectedUrl:async()=>{},buildClinicParams:()=>'',loadFichaDocumentos:async()=>{},setFirmaFeedback(){}};
  runInNewContext(transpileModule(section("  document.getElementById('firmaGuardarBtn')",'// Render documents list'),{}).outputText,context);
  await save();assert.equal(requests[0][0],'/api/documentos/doc-A/firmar');
  assert.deepEqual(JSON.parse(requests[0][1].body),{firma_base64:'data:image/png;base64,fixture'});
  assert.equal(button.disabled,false);
}
console.log('PASS: la firma de documentos pendientes abre el mismo lienzo sin crear documentos ni enviar firmas por nombre.');
