import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='local-test';
const [{default:patients},{default:notes},{runWithRequestContext,serviceSupabase}]=await Promise.all([
  import('../src/routes/patients.js'),import('../src/routes/clinical-notes.js'),import('../src/lib/supabase.js'),
]);
async function invoke(router,method,path,db,body={},query={}) {
  const handler=router.stack.find(layer=>layer.route?.path===path && layer.route.methods[method]).route.stack[0].handle;
  const auth={profile_id:'profile-a',clinic_id:'clinic-a',role:'admin'};
  const res={statusCode:200,status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;},send(){return this;}};
  await runWithRequestContext({supabase:db,auth},()=>handler({body,query,params:{id:'patient-a',paciente_id:'patient-a'},auth},res,
    error=>{res.statusCode=500;res.body={error:error.message};}));
  return res;
}
const failureDb=error=>({from(){return {update(){return this;},delete(){assert.fail('No debe borrar definitivamente tras un fallo');},
  select(){return this;},eq(){return this;},async single(){return {error};},async maybeSingle(){return {error};},then(resolve){return resolve({error});}};}});

test('la baja conserva errores, no borra definitivamente y no simula anonimización',async()=>{
  let hardDelete=false;
  const failing=failureDb({code:'42501',message:'denied'});
  const nativeFrom=failing.from;
  failing.from=()=>({...nativeFrom(),delete(){hardDelete=true;return this;}});
  assert.equal((await invoke(patients,'delete','/:id',failing)).statusCode,500);
  assert.equal(hardDelete,false);
  const empty=failureDb(null);
  assert.equal((await invoke(patients,'delete','/:id',empty)).statusCode,404);
  const blocked={from(){assert.fail('No debe anonimizar parcialmente ni tocar fichas antiguas');}};
  assert.equal((await invoke(patients,'delete','/:id',blocked,{}, {anonymize:'true'})).statusCode,409);
});

test('edición de pacientes rechaza nombres/fechas inválidos y distingue registros inexistentes',async()=>{
  const blocked={from(){assert.fail('No debe escribir datos inválidos');}};
  for(const body of [{nombre:'   '},{nombre:{}},{fecha_nacimiento:'2026-02-30'},{email:'invalid'}])
    assert.equal((await invoke(patients,'patch','/:id',blocked,body)).statusCode,400);
  assert.equal((await invoke(patients,'patch','/:id',failureDb(null),{nombre:'Paciente'})).statusCode,404);
});

test('notas rechazan EVA/fecha/texto inválidos y no inventan éxito al editar o borrar',async()=>{
  const blocked={from(){assert.fail('No debe escribir una nota inválida');}};
  for(const changes of [{dolor_eva:11},{dolor_eva:1.5},{dolor_eva:''},{dolor_eva:true},{nota:' '},{fecha:'2026-02-30'}]) {
    const body={paciente_id:'patient-a',nota:'Seguimiento técnico',...changes};
    assert.equal((await invoke(notes,'post','/',blocked,body)).statusCode,400);
    assert.equal((await invoke(notes,'patch','/:id',blocked,changes)).statusCode,400);
  }
  assert.equal((await invoke(notes,'patch','/:id',failureDb(null),{nota:'Seguimiento técnico'})).statusCode,404);
  const empty={from(){return {delete(){return this;},select(){return this;},eq(){return this;},async maybeSingle(){return {data:null};}};}};
  assert.equal((await invoke(notes,'delete','/:id',empty)).statusCode,404);
});

test('la nota deriva su autor de la sesión y conserva un EVA cero',async t=>{
  let payload;
  const db={from(table){return {insert(value){payload=value;return this;},select(){return this;},eq(){return this;},
    async maybeSingle(){return {data:{id:'patient-a'}};},async single(){return {data:{id:'note-a',...payload}};}};}};
  t.mock.method(serviceSupabase,'from',()=>({insert(){return this;},select(){return this;},async maybeSingle(){return {data:{id:'audit-a'}};}}));
  const res=await invoke(notes,'post','/',db,{paciente_id:'patient-a',profesional_id:'forged-author',nota:'Sin dolor',dolor_eva:0});
  assert.equal(res.statusCode,201);
  assert.equal(payload.profesional_id,'profile-a');
  assert.equal(payload.dolor_eva,0);
});

test('evolución recalcula el resumen y lo vacía cuando no quedan notas',async()=>{
  let rows=[{id:'note-a',nota:'Evolución reciente',fecha:'2026-10-07',session_datetime:'2026-10-07T10:00:00Z',dolor_eva:0}];
  const db={from(table){return {select(){return this;},eq(){return this;},order(){return this;},limit(){return this;},range(){return this;},
    async maybeSingle(){return {data:{id:'patient-a',nombre:'Paciente',resumen_clinico_longitudinal:'Resumen obsoleto'}};},
    then(resolve){return resolve({data:rows,count:rows.length});}};}};
  const res=await invoke(notes,'get','/evolution/:paciente_id',db);
  assert.match(res.body.longitudinal_summary,/Evolución reciente/);
  rows=[];
  assert.equal((await invoke(notes,'get','/evolution/:paciente_id',db)).body.longitudinal_summary,null);
});
