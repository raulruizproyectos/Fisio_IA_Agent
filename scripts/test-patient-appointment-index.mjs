import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const {transpileModule}=createRequire(new URL('../frontend/package.json',import.meta.url))('typescript');
const source=readFileSync(new URL('../frontend/src/pages/index.astro',import.meta.url),'utf8');
const start=source.indexOf('    const nextAppointments = new Map'),end=source.indexOf('    // Generate table rows',start);
assert.ok(start>0&&end>start);
const inputs=[{paciente_id:'B',id:'B-first'},{paciente_id:'A',id:'A-first'},{paciente_id:'A',id:'A-later'}];
for(const isDevMode of [false,true]){
  let sorts=0;const context={isDevMode,DEMO_APPOINTMENTS:inputs,latestAgendaAppointments:inputs,upcomingAppointments:rows=>{sorts++;return rows;}};
  runInNewContext(transpileModule(source.slice(start,end)+'\nglobalThis.next=nextAppointments;',{}).outputText,context);
  assert.equal(sorts,1);assert.equal(context.next.get('A').id,'A-first');assert.equal(context.next.get('B').id,'B-first');assert.equal(context.next.get('C'),undefined);
}
console.log('Patient directory indexes the sorted appointments once and preserves the earliest appointment per patient.');
