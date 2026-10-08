import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='local-test';
const [{ default: bonos },{ default: invoices },{ runWithRequestContext }]=await Promise.all([
  import('../src/routes/bonos.js'),import('../src/routes/invoices.js'),import('../src/lib/supabase.js'),
]);
async function invoke(router,method,path,body,db,query={}) {
  const handler=router.stack.find(layer=>layer.route?.path===path && layer.route.methods[method]).route.stack[0].handle;
  const res={statusCode:200,status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};
  await runWithRequestContext({supabase:db},()=>handler({body,query,params:{id:'bono-a'}},res,error=>{throw error;}));
  return res;
}
test('bonos rechazan sesiones/precios/fechas inválidos antes de escribir',async()=>{
  const db={from(){assert.fail('No debe escribir datos inválidos');}};
  for(const changes of [{sesiones_total:1.5},{sesiones_total:-1},{sesiones_total:true},{sesiones_total:32768},{precio:'NaN'},
    {precio:-1},{precio:0.001},{fecha_caducidad:'2026-02-30'},{fecha_inicio:'2026-02-30'}]) {
    assert.equal((await invoke(bonos,'post','/',{paciente_id:'patient-a',sesiones_total:5,precio:250,...changes},db)).statusCode,400);
    assert.equal((await invoke(bonos,'patch','/:id',changes,db)).statusCode,400);
  }
  assert.equal((await invoke(bonos,'post','/',{paciente_id:'patient-a',sesiones_total:5,precio:250,fecha_inicio:'2026-11-01',fecha_caducidad:'2026-10-01'},db)).statusCode,400);
  for(const fecha_inicio of ['',null,'2026-02-30']) assert.equal((await invoke(bonos,'post','/',{paciente_id:'patient-a',sesiones_total:5,precio:250,fecha_inicio},db)).statusCode,400);
});
test('consumir bono usa la operación atómica y conserva conflictos o migración pendiente',async()=>{
  let call;
  for(const [code,status] of [['PT409',409],['PT404',404],['PGRST202',503]]) {
    const res=await invoke(bonos,'post','/:id/usar',{}, {async rpc(name,args){call={name,args};return {error:{code,message:'Local failure'}};}});
    assert.equal(res.statusCode,status);
    assert.equal(call.name,'consume_clinic_bono');
  }
});
test('facturas sanitarias usan exención por defecto y emisión atómica',async()=>{
  let args;
  const res=await invoke(invoices,'post','/',{paciente_id:'patient-a'}, {async rpc(name,input){assert.equal(name,'issue_clinic_invoice');args=input;return {data:{id:'invoice-a'}};}});
  assert.equal(res.statusCode,201);
  assert.equal(args.tax_percent,0);
  assert.equal(args.payment_ids,null);
});
test('facturas rechazan IVA inválido o selección de cobros vacía/duplicada',async()=>{
  const db={rpc(){assert.fail('No debe emitir factura inválida');},from(){assert.fail('No debe consultar datos inválidos');}};
  for(const changes of [{iva_pct:-1},{iva_pct:'NaN'},{iva_pct:Infinity},{iva_pct:101},{iva_pct:0.001},{pago_ids:[]},{pago_ids:'all'},
    {pago_ids:['------------------------------------']},
    {pago_ids:['aaaaaaaa-aaaa-4000-8000-000000000001','AAAAAAAA-AAAA-4000-8000-000000000001']}]) {
    assert.equal((await invoke(invoices,'post','/',{paciente_id:'patient-a',...changes},db)).statusCode,400);
  }
  assert.equal((await invoke(invoices,'get','/',{},db,{anio:'2026',mes:'13'})).statusCode,400);
});
test('el filtro de febrero usa el inicio de marzo y evita fechas inexistentes',async()=>{
  const filters=[];
  const db={from(){return {select(){return this;},order(){return this;},limit(){return this;},gte(k,v){filters.push([k,'>=',v]);return this;},
    lte(){return this;},lt(k,v){filters.push([k,'<',v]);return this;},then(resolve){return Promise.resolve({data:[]}).then(resolve);}};}};
  assert.equal((await invoke(invoices,'get','/',{},db,{anio:'2026',mes:'2'})).statusCode,200);
  assert.ok(filters.some(row=>row[1]==='<' && row[2]==='2026-03-01'));
});
