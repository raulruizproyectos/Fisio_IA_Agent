import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const {transpileModule}=createRequire(new URL('../frontend/package.json',import.meta.url))('typescript');
const source=readFileSync(new URL('../frontend/src/pages/index.astro',import.meta.url),'utf8');
const section=(start,end)=>{const from=source.indexOf(start),to=source.indexOf(end,from);assert.ok(from>=0&&to>from,start);return source.slice(from,to);};
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
function setup(fetchJson){
  const priorities=[];const context={fetchJson,BACKEND_BASE:'',pagosLoadVersion:1,pagosAnioFilter:{value:'2026'},setFinancePriority:(...args)=>priorities.push(args),fmtMoney:n=>`${n} EUR`};
  for(const name of ['financePaidValue','financePaidMeta','financePendingValue','financePendingMeta','financeBonosValue','financeBonosMeta','financeTrendValue','financeTrendMeta'])context[name]={textContent:''};
  runInNewContext(transpileModule(section('  const renderFinanceOverview =','  const renderPagosMobile =')+'\nglobalThis.render=renderFinanceOverview;',{}).outputText,context);
  return{context,priorities};
}
// Failed invoice reads cannot become a claim that the clinic has nothing to collect.
{
  const h=setup(async url=>{if(url.includes('/facturas'))throw new Error('unavailable');return{data:[]};});
  await h.context.render([{importe:50}],1);
  assert.equal(h.context.financePendingValue.textContent,'—');
  assert.match(h.context.financePendingMeta.textContent,/no se pudo/i);
  assert.ok(!h.priorities.some(args=>args[0]==='Caja al día'));
  assert.equal(h.context.financePaidValue.textContent,'50 EUR');
}
// Explicit unavailable responses have the same unknown state as transport failures.
{
  const h=setup(async()=>({data:[],unavailable:true}));await h.context.render([],1);
  assert.equal(h.context.financePendingValue.textContent,'—');
  assert.equal(h.context.financeBonosValue.textContent,'—');
  assert.equal(h.context.financeTrendValue.textContent,'—');
}
// A response for a previously selected year must not replace the current summary.
{
  const old=deferred();const h=setup(()=>old.promise);const loading=h.context.render([{importe:50}],1);
  h.context.pagosLoadVersion=2;h.context.financePendingValue.textContent='current';old.resolve({data:[]});await loading;
  assert.equal(h.context.financePendingValue.textContent,'current');
}
// With real empty responses, zero remains a valid result.
{
  const h=setup(async()=>({data:[]}));await h.context.render([{importe:50}],1);
  assert.equal(h.context.financePendingValue.textContent,'0 EUR');assert.equal(h.context.financeBonosValue.textContent,'0');
  assert.ok(h.priorities.some(args=>args[0]==='Caja al día'));
}
// Each filtered list uses the latest request, with unknown counts on failure rather than empty successes.
for(const[name,end,body,version,summary,mobile,availability]of[
  ['Facturas',"  pageLoaders['facturas']",'facturasBody','facturasLoadVersion','renderFacturasSummary','renderFacturasMobile','syncFacturasAvailabilityUi'],
  ['Bonos',"  pageLoaders['bonos']",'bonosBody','bonosLoadVersion','renderBonosSummary','renderBonosMobile','syncBonosAvailabilityUi'],
  ['Documentos',"  pageLoaders['documentos']",'documentosBody','documentosLoadVersion','renderDocumentosSummary','renderDocumentosMobile',null],
]){
  for(const fail of [false,true]){
    const old=deferred(),summaries=[];
    let requests=0;
    const context={BACKEND_BASE:'',isDevMode:false,fetchJson:()=>++requests===1?old.promise:fail?Promise.reject(new Error('failed')):Promise.resolve({data:[]}),
      [body]:{innerHTML:''},[version]:0,[summary]:(rows)=>summaries.push(rows),[mobile](){},setTableState(){},setListState(){},
      facturasUnavailableMessage:'',bonosUnavailableMessage:'',facturasAnioFilter:{value:'2026'},bonosEstadoFilter:{value:'activo'},documentosEstadoFilter:{value:''}};
    context.facturasMobileList={};context.bonosMobileList={};context.documentosMobileList={};
    if(availability)context[availability]=()=>{};
    runInNewContext(transpileModule(section(`  const load${name} =`,end)+`\nglobalThis.load=load${name};`,{}).outputText,context);
    const older=context.load();await context.load();const count=summaries.length;
    assert.equal(summaries.at(-1)===null,fail,name+' failure must remain unknown');
    old.resolve({data:[{id:'old',fecha:'2025-01-01'}]});await older;
    assert.equal(summaries.length,count,name+' stale result');
  }
}
console.log('PASS: fallos financieros son desconocidos y respuestas antiguas no sustituyen el filtro actual.');
