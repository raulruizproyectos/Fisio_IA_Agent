export const shellConfig = {
  aliases: {
    inicio: 'dashboard',
    home: 'dashboard',
    finanzas: 'pagos',
    payments: 'pagos',
    documentos: 'documentos',
  },
  financeSections: ['pagos', 'facturas', 'bonos', 'gestoria'],
};

const aliases = shellConfig.aliases as Record<string, string>;
const financeSections = new Set(shellConfig.financeSections);
export const normalizeSection = (section: string) => {
  const raw = String(section || 'dashboard').trim();
  return aliases[raw] || raw || 'dashboard';
};


export function activateSection(section: string) {
  const targetSection = normalizeSection(section);
  const pages = Array.from(document.querySelectorAll('.page-section')) as HTMLElement[];
  const targetPage = pages.find((page) => page.dataset.page === targetSection);

  if (!targetPage) return false;

  pages.forEach((page) => {
    const active = page === targetPage;
    page.classList.toggle('active', active);
    page.hidden = !active;
    page.setAttribute('aria-hidden', active ? 'false' : 'true');
  });

  const sidebarSection = financeSections.has(targetSection) ? 'finanzas' : targetSection;
  document.querySelectorAll('.nav-item[data-section]').forEach((item) => {
    item.classList.toggle('active', item.getAttribute('data-section') === sidebarSection);
  });
  const sectionLabel = document.querySelector('.nav-item.active .nav-label')?.textContent?.trim() || 'Ficha de paciente';
  const breadcrumb = document.getElementById('topbarSectionLabel');
  if (breadcrumb) breadcrumb.textContent = sectionLabel;

  const mobileDock = document.getElementById('mobileDock');
  mobileDock?.setAttribute('data-active-section', targetSection);

  document.querySelectorAll('[data-mobile-nav]').forEach((item) => {
    item.classList.toggle('active', normalizeSection(item.getAttribute('data-mobile-nav') || '') === targetSection);
  });

  document.body.dataset.activePage = targetSection;
  document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'auto' });
  document.dispatchEvent(new CustomEvent('fisio:shell-navigate', { detail: { section: targetSection } }));
  return true;
}
