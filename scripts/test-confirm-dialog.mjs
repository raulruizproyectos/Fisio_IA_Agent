// Execute the actual component script and its event/store contract; browser checks cover CSS/focus geometry.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { transpileModule } = require('typescript');
const { map } = require('nanostores');
const document = new EventTarget();
class Element extends EventTarget {
  hidden = false;
  attributes = {};
  classList = { add() {}, remove() {} };
  setAttribute(key,value) { this.attributes[key]=value; }
  focus() { document.activeElement=this; }
  querySelector() { return new Element(); }
}
const elements = new Map();
document.getElementById = id => {
  if (!elements.has(id)) elements.set(id,new Element());
  return elements.get(id);
};
const modalState = map({confirm:{isOpen:false,options:{}}});
const source = await readFile(new URL('../frontend/src/components/ConfirmDialog.astro',import.meta.url),'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/import .*?;/g,'');
runInNewContext(transpileModule(script,{}).outputText,{document,modalState,CustomEvent,window:{setTimeout:fn=>fn()}});
const origin = new Element(); origin.focus();
let returned;
document.addEventListener('fisio:close-confirm',event=>{returned=event.detail.value;});
const open = options=>document.dispatchEvent(new CustomEvent('fisio:open-confirm',{detail:{options}}));
open({title:'Eliminar nota',confirmLabel:'Eliminar',expectsText:false});
assert.equal(modalState.get().confirm.isOpen,true);
assert.equal(elements.get('confirmDialog').attributes['aria-hidden'],'false');
assert.equal(elements.get('confirmOkBtn').textContent,'Eliminar');
elements.get('confirmOkBtn').dispatchEvent(new Event('click'));
assert.equal(returned,true);
assert.equal(modalState.get().confirm.isOpen,false);
assert.equal(elements.get('confirmDialog').attributes['aria-hidden'],'true');
assert.equal(document.activeElement,origin);
open({expectsText:true,inputLabel:'Nombre'});
elements.get('confirmInput').value='Texto confirmado';
elements.get('confirmOkBtn').dispatchEvent(new Event('click'));
assert.equal(returned,'Texto confirmado');
open({expectsText:false});
const escape=new Event('keydown',{cancelable:true});
Object.defineProperty(escape,'key',{value:'Escape'});
document.dispatchEvent(escape);
assert.equal(returned,false);
assert.equal(modalState.get().confirm.isOpen,false);
console.log('PASS: actual dialog script opens/closes through shared events, returns boolean/text, cancels with Escape and restores focus.');
