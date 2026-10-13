import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { transpileModule } = require('typescript');

const observers = new Map();
class Observer {
  constructor(callback) { this.callback = callback; }
  observe(element) { observers.set(element, this.callback); }
}
let onOverlayKey;
let modal = true;
const controls = [0,1,2,3,4].map(index => ({ disabled:index === 0 || index === 4, tabIndex:0, checkVisibility:() => index !== 2, focus() { document.activeElement = this; } }));
const overlay = { ariaHidden:'true', getAttribute() { return this.ariaHidden; }, contains:element => element === overlay,
  addEventListener(_name,handler) { onOverlayKey = handler; }, matches:() => modal, querySelectorAll:() => controls };
const tabs = [0,1,2].map(index => ({
  active:index === 0, offsetLeft:8 + index * 120, offsetWidth:120, attributes:{},
  classList:{ contains() { return tabs[index].active; } },
  setAttribute(key,value) { this.attributes[key] = value; },
}));
const values = {};
const nav = { querySelectorAll:() => tabs, clientWidth:250, scrollLeft:0, style:{ setProperty:(key,value) => { values[key] = value; } } };
const origin = { isConnected:true, focus() { document.activeElement = origin; } };
const document = { activeElement:origin, querySelectorAll:() => [overlay], querySelector:() => nav, fonts:{ ready:Promise.resolve() } };
const script = await readFile(new URL('../frontend/src/scripts/clinical-motion.js', import.meta.url),'utf8');
runInNewContext(script, { document, MutationObserver:Observer, ResizeObserver:Observer });
assert.equal(overlay.inert, true, 'closed overlays cannot receive focus during exit');
overlay.ariaHidden = 'false'; observers.get(overlay)();
assert.equal(overlay.inert, false, 'reopening restores interaction immediately');
document.activeElement = overlay;
overlay.ariaHidden = 'true'; observers.get(overlay)();
assert.equal(overlay.inert, true);
assert.equal(document.activeElement,origin,'closing restores focus before the visual exit ends');
let prevented = 0;
const tabKey = shiftKey => ({ key:'Tab', shiftKey, preventDefault() { prevented++; } });
overlay.ariaHidden = 'false'; observers.get(overlay)();
document.activeElement = controls[3]; onOverlayKey(tabKey(false));
assert.equal(document.activeElement,controls[1],'Tab skips disabled and hidden controls at the boundary');
onOverlayKey(tabKey(true));
assert.equal(document.activeElement,controls[3],'Shift+Tab skips disabled and hidden controls at the boundary');
assert.equal(prevented,2);
modal = false; onOverlayKey(tabKey(false));
assert.equal(prevented,2,'desktop copilot does not trap the workspace');
modal = true; overlay.inert = true; onOverlayKey(tabKey(false));
assert.equal(prevented,2,'closed overlays do not handle Tab');
overlay.inert = false; onOverlayKey({...tabKey(false),defaultPrevented:true});
assert.equal(prevented,2,'other dialog handlers retain their decision');
assert.equal(tabs[0].attributes['aria-pressed'], 'true');
tabs[0].active = false; tabs[2].active = true; observers.get(nav)();
assert.equal(tabs[2].attributes['aria-pressed'], 'true');
assert.equal(tabs[0].attributes['aria-pressed'], 'false');
assert.equal(values['--ficha-tab-x'], '248px');
assert.equal(values['--ficha-tab-width'], '120px');
assert.equal(nav.scrollLeft, 118, 'selected tab fits the navigation viewport');
tabs[2].offsetWidth = 150; observers.get(nav)();
assert.equal(values['--ficha-tab-width'], '150px', 'resizing realigns the indicator');
tabs[2].active = false; tabs[0].active = true; observers.get(nav)();
assert.equal(nav.scrollLeft, 8, 'returning to the first tab does not scroll the page');

const source = await readFile(new URL('../frontend/src/pages/index.astro', import.meta.url),'utf8');
const start = source.indexOf('  const getStateHint =');
const end = source.indexOf('  const upsertAgentProgress =', start);
const context = { escapeHtml:text => text.replaceAll('<','&lt;') };
runInNewContext(transpileModule(source.slice(start,end) + '\nglobalThis.state = renderState;', {}).outputText,context);
const loading = context.state('sync','Cargando <datos>',true,true);
assert.ok(loading.includes('role="status"') && loading.includes('aria-live="polite"'));
assert.ok(loading.includes('loading-lines') && loading.includes('&lt;datos>'));
for (const [icon,text] of [['person_off','Sin pacientes'],['cloud_off','No se pudo cargar']]) {
  const state = context.state(icon,text,true,false);
  assert.ok(!state.includes('loading-lines'), 'absence and errors never keep a loading skeleton');
  assert.ok(state.includes(text));
}
let onKey;
const clicks = [];
const keyboardStart = source.indexOf("    painMapSvg.addEventListener('keydown'");
const keyboardEnd = source.indexOf("    painMapSvg.addEventListener('click'",keyboardStart);
assert.ok(keyboardStart >= 0 && keyboardEnd > keyboardStart);
runInNewContext(transpileModule(source.slice(keyboardStart,keyboardEnd),{}).outputText,{
  painMapSvg:{addEventListener:(_name,handler) => {onKey=handler;}},
  MouseEvent:class {constructor(type,options) {this.type=type;Object.assign(this,options);}},
});
const bodyZone = {matches:selector => selector === '.pain-zone-path',dispatchEvent:event => clicks.push(event)};
for (const key of ['Enter',' ']) {
  let prevented = false;
  onKey({target:bodyZone,key,preventDefault() {prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(clicks.at(-1).type,'click');
  assert.equal(clicks.at(-1).bubbles,true,'keyboard uses the existing zone selection handler');
}
onKey({target:bodyZone,key:'Tab',preventDefault() {throw Error('Tab must keep native navigation');}});
assert.equal(clicks.length,2);
console.log('PASS: overlays/focus, tab selection, loading states and keyboard activation of body zones.');
