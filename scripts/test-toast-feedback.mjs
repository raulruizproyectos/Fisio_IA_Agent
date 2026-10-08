// Run the shared page feedback, without UI libraries or clinical data.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const require=createRequire(new URL('../frontend/package.json',import.meta.url));
const {transpileModule}=require('typescript');
const source=await readFile(new URL('../frontend/src/pages/index.astro',import.meta.url),'utf8');
const start=source.indexOf('  type ToastTone ='),end=source.indexOf('  type ConfirmOptions =',start);
assert.ok(start>=0 && end>start);
const cards=[],timers=[];
const context={toastRegion:{appendChild:t=>cards.push(t)},escapeHtml:text=>text.replaceAll('<','&lt;'),
 document:{createElement:()=>({attributes:{},classList:{add(){}},setAttribute(k,v){this.attributes[k]=v;},
   querySelector(){return {addEventListener:(_event,fn)=>{this.close=fn;}};},remove(){this.removed=true;}})},
 window:{setTimeout:(fn,ms)=>timers.push({fn,ms})}};
runInNewContext(transpileModule(source.slice(start,end)+'\nglobalThis.notify=showToast;',{}).outputText,context);
for(const tone of ['error','warning']){
 context.notify('Keep this instruction',tone);assert.equal(timers.length,0,'Errors and warnings must remain until dismissed');
 assert.equal(cards.at(-1).attributes.role,'alert');
}
context.notify('Saved <draft>','success');assert.equal(timers.length,1);assert.equal(timers[0].ms,4400);
assert.equal(cards.at(-1).attributes.role,'status');assert.ok(cards.at(-1).innerHTML.includes('&lt;draft>'));
context.notify('Information','info');assert.equal(timers.length,2);assert.equal(timers.at(-1).ms,4400);
assert.equal(cards.at(-1).attributes.role,'status');
cards[0].close();assert.equal(timers.at(-1).ms,180);timers.at(-1).fn();assert.equal(cards[0].removed,true);
console.log('PASS: actual shared feedback keeps errors/warnings until dismissal, announces severity, escapes text and expires success/info only.');
