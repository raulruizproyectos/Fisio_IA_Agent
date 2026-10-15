import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const { transpileModule } = createRequire(new URL('../frontend/package.json', import.meta.url))('typescript');
const page = readFileSync(new URL('../frontend/src/pages/index.astro', import.meta.url), 'utf8');
const workbench = {};
const title = { closest: () => workbench };
const context = {
  financePriorityTitle: title, financePriorityMeta: {}, financePrimaryActionBtn: {}, financeSecondaryActionBtn: {},
  setFinanceActionButton(button, label, icon, action) { Object.assign(button, { label, action }); },
};
const finance = page.slice(page.indexOf('  const setFinancePriority ='), page.indexOf('  const runFinanceAction ='));
runInNewContext(transpileModule(finance + '\nglobalThis.render = setFinancePriority;', {}).outputText, context);
for (const [action, hidden] of [['pago', true], ['facturas', false], ['bonos', false], ['pago', true]]) {
  context.render('Aviso', 'Detalle', { label: 'Acción', icon: 'info', action }, { label: 'Secundaria', icon: 'info', action: 'pago' });
  assert.equal(workbench.hidden, hidden, 'Keep contextual financial alerts; hide generic repeated shortcuts');
  assert.equal(context.financePrimaryActionBtn.action, action);
}

const topbar = readFileSync(new URL('../frontend/src/components/Topbar.astro', import.meta.url), 'utf8');
const shortcutCode = topbar.slice(topbar.indexOf('  const search ='), topbar.indexOf('  const assistantRailToggle ='));
let onKey, focused = 0, selected = 0, blocked = false;
runInNewContext(transpileModule(shortcutCode, {}).outputText, {
  navigator: { platform: 'Win32' },
  document: {
    getElementById: () => ({ focus() { focused++; }, select() { selected++; } }),
    querySelector: () => ({}), querySelectorAll: () => [{ closest: () => ({ getAttribute: () => blocked ? 'false' : 'true' }), checkVisibility: () => false }],
    addEventListener: (type, listener) => { onKey = listener; },
  },
});
let prevented = 0;
const key = { key: 'k', ctrlKey: true, preventDefault() { prevented++; } };
onKey(key);
assert.equal(focused, 1); assert.equal(selected, 1); assert.equal(prevented, 1);
blocked = true;
onKey(key);
assert.equal(focused, 1, 'Search must not steal focus from an open dialog');
blocked = false;
onKey({ ...key, ctrlKey: false, metaKey: true });
assert.equal(focused, 2, 'Command K also opens search');
console.log('PASS: contextual financial alerts and accessible Ctrl/Command K without escaping dialogs.');
