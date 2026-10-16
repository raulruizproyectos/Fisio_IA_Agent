import assert from 'node:assert/strict';
import { loadFrontendModule } from './load-frontend-module.mjs';
const { activateSection, normalizeSection } = await loadFrontendModule('lib/navigation.ts');
const node = (dataset = {}) => ({
  dataset, attributes: {}, classes: new Set(), hidden: false,
  classList: { toggle(name, on) { on ? this.owner.classes.add(name) : this.owner.classes.delete(name); } },
  setAttribute(name, value) { this.attributes[name] = value; },
  getAttribute(name) { return name === 'data-section' ? this.dataset.section : name === 'data-mobile-nav' ? this.dataset.mobileNav : this.attributes[name]; },
});
const makeNode = dataset => { const element = node(dataset); element.classList.owner = element; return element; };
const pages = ['dashboard', 'pacientes', 'citas', 'pagos', 'facturas', 'bonos', 'gestoria', 'ficha-paciente'].map(page => makeNode({ page }));
const nav = ['dashboard', 'pacientes', 'citas', 'finanzas'].map(section => makeNode({ section }));
const dock = ['dashboard', 'pacientes', 'citas', 'finanzas'].map(mobileNav => makeNode({ mobileNav }));
const labels = { dashboard: 'Inicio', pacientes: 'Pacientes', citas: 'Agenda', finanzas: 'Finanzas' };
const breadcrumb = {}, mobileDock = makeNode({}), events = [], scrolls = [];
globalThis.document = {
  body: { dataset: {} },
  querySelectorAll(selector) { return ({ '.page-section': pages, '.nav-item[data-section]': nav, '[data-mobile-nav]': dock })[selector]; },
  querySelector(selector) {
    if (selector === '.content') return { scrollTo: options => scrolls.push(options) };
    return { textContent: labels[nav.find(item => item.classes.has('active'))?.dataset.section] || '' };
  },
  getElementById: id => id === 'topbarSectionLabel' ? breadcrumb : mobileDock,
  dispatchEvent: event => events.push(event),
};
for (const [input, expected] of [['inicio', 'dashboard'], ['home', 'dashboard'], [' finanzas ', 'pagos'], ['payments', 'pagos'], ['', 'dashboard']]) assert.equal(normalizeSection(input), expected);
for (const section of ['pacientes', 'finanzas', 'facturas', 'bonos', 'gestoria', 'citas', 'ficha-paciente']) {
  assert.equal(activateSection(section), true);
  const target = normalizeSection(section);
  assert.deepEqual(pages.filter(page => !page.hidden).map(page => page.dataset.page), [target]);
  assert.equal(document.body.dataset.activePage, target);
  for (const page of pages) assert.equal(page.attributes['aria-hidden'], String(page.dataset.page !== target));
  assert.equal(events.at(-1).detail.section, target);
  assert.equal(mobileDock.attributes['data-active-section'], target);
}
assert.equal(breadcrumb.textContent, 'Ficha de paciente');
const count = events.length;
assert.equal(activateSection('unknown'), false);
assert.equal(events.length, count, 'Unknown destinations cannot change the current view');
assert.deepEqual(scrolls[0], { top: 0, behavior: 'auto' });
console.log('PASS: shared navigation keeps one visible page, aliases, financial grouping, breadcrumb, dock and unknown-destination safety.');
