// Closed overlays stay inert while their visual exit finishes.
document.querySelectorAll('.modal-shell, .patient-modal-overlay, #assistantRail, #confirmDialog, #firmaModal, #voiceSessionModal').forEach((overlay) => {
  let returnFocus = null;
  const sync = () => {
    const closed = overlay.getAttribute('aria-hidden') === 'true';
    if (!closed && overlay.inert && !overlay.contains(document.activeElement)) returnFocus = document.activeElement;
    const restoreFocus = closed && overlay.contains(document.activeElement);
    overlay.inert = closed;
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
    if (closed) returnFocus = null;
  };
  sync();
  new MutationObserver(sync).observe(overlay, { attributes: true, attributeFilter: ['aria-hidden'] });
  overlay.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || event.defaultPrevented || overlay.inert) return;
    // Desktop copilot stays alongside the workspace; mobile covers it.
    if (!overlay.matches('.modal-shell, #assistantRail.is-open-mobile')) return;
    const controls = [...overlay.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
      .filter((control) => !control.disabled && control.tabIndex >= 0 && control.checkVisibility());
    const first = controls[0], last = controls.at(-1);
    if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  });
});

const fichaTabs = document.querySelector('.ficha-tabs-nav');
if (fichaTabs) {
  const tabs = [...fichaTabs.querySelectorAll('.ficha-tab')];
  const syncSelection = () => {
    const active = tabs.find((tab) => tab.classList.contains('active'));
    tabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab === active)));
    if (!active || !active.offsetWidth) return;
    fichaTabs.style.setProperty('--ficha-tab-x', `${active.offsetLeft}px`);
    fichaTabs.style.setProperty('--ficha-tab-width', `${active.offsetWidth}px`);
    if (active.offsetLeft < fichaTabs.scrollLeft) fichaTabs.scrollLeft = active.offsetLeft;
    else if (active.offsetLeft + active.offsetWidth > fichaTabs.scrollLeft + fichaTabs.clientWidth) {
      fichaTabs.scrollLeft = active.offsetLeft + active.offsetWidth - fichaTabs.clientWidth;
    }
  };
  new MutationObserver(syncSelection).observe(fichaTabs, { subtree: true, attributes: true, attributeFilter: ['class'] });
  new ResizeObserver(syncSelection).observe(fichaTabs);
  document.fonts.ready.then(syncSelection);
  syncSelection();
}
