// motion.ts — discreet UI motion (200–400 ms), no libraries. Everything is skipped with
// prefers-reduced-motion. Helpers only read/animate existing nodes: they never change IDs, data-* or text
// beyond the final value the app already wrote.

const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Count up the first real value written into each element, once per page load.
 * The app keeps writing textContent as usual; the first non-zero value is animated from 0 (400 ms)
 * with the same format (integer or «1.234,50 €»). A later write cancels the animation and wins.
 */
export const countUpOnce = (elements: Array<HTMLElement | null>, duration = 400) => {
  if (prefersReducedMotion()) return;
  const integer = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
  const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });

  elements.forEach((el) => {
    if (!el) return;
    let done = false;
    let lastWritten = '';
    let frame = 0;
    const observer = new MutationObserver(() => {
      // Observer callbacks are async: ignore our own frames by comparing with the last text we wrote.
      if (frame && el.textContent === lastWritten) return;
      if (frame) {
        // The app wrote a newer value mid-animation: keep it.
        cancelAnimationFrame(frame);
        frame = 0;
        observer.disconnect();
        return;
      }
      if (done) return;
      const text = (el.textContent || '').trim();
      const isEuro = text.includes('€');
      const target = Number(text.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
      if (!Number.isFinite(target) || target <= 0) return;
      done = true;
      const format = (value: number) => (isEuro ? euro.format(value) : integer.format(Math.round(value)));
      let start = 0;
      const step = (now: number) => {
        if (!start) start = now;
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        lastWritten = t < 1 ? format(target * eased) : text;
        el.textContent = lastWritten;
        if (t < 1) frame = requestAnimationFrame(step);
        else { frame = 0; observer.disconnect(); }
      };
      // Observer callbacks run before paint: start from 0 so the final value never flashes first.
      lastWritten = format(0);
      el.textContent = lastWritten;
      frame = requestAnimationFrame(step);
    });
    observer.observe(el, { childList: true, characterData: true, subtree: true });
    // Stop listening if no value arrives soon: the count-up belongs to the first load only.
    window.setTimeout(() => { if (!done) observer.disconnect(); }, 15000);
  });
};

/**
 * After an appointment changes state and the lists re-render, fade each of its chips from the
 * previous state colour to the new one (CSS transition, 320 ms; transitions override !important).
 */
export const animateAppointmentChips = (appointmentId: string, fromStatus: string, toStatus: string) => {
  if (prefersReducedMotion() || !appointmentId || !fromStatus || !toStatus || fromStatus === toStatus) return;
  const safeId = CSS.escape(appointmentId);
  const holders = new Set<Element>();
  // Only the row (table) or card (mobile timeline) that holds this appointment's action buttons.
  document.querySelectorAll(`[data-appt-id="${safeId}"]`).forEach((node) => {
    const holder = node.closest('tr, .agenda-mobile-item');
    if (holder) holders.add(holder);
  });
  holders.forEach((holder) => {
    holder.querySelectorAll<HTMLElement>(`.status-chip.${CSS.escape(toStatus)}`).forEach((chip) => {
      chip.classList.remove(toStatus);
      chip.classList.add(fromStatus);
      void chip.offsetWidth;
      chip.classList.add('chip-status-change');
      chip.classList.remove(fromStatus);
      chip.classList.add(toStatus);
      window.setTimeout(() => chip.classList.remove('chip-status-change'), 420);
    });
  });
};

/**
 * Stagger the items of a list when its section is opened: on activation (or on the first render
 * that follows it) up to 12 items fade/slide in, 240 ms each, 30 ms apart. Re-renders while the
 * section stays open are not animated.
 */
export const staggerOnSectionOpen = (container: HTMLElement | null, itemSelector: string) => {
  const section = container?.closest('.page-section');
  if (!container || !section) return;
  let armedUntil = 0;

  const play = () => {
    if (prefersReducedMotion() || Date.now() > armedUntil) return false;
    const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector))
      .filter((item) => item.offsetParent !== null)
      .slice(0, 12);
    if (!items.length) return false;
    armedUntil = 0;
    items.forEach((item, index) => {
      item.animate(
        [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
        { duration: 240, delay: index * 30, easing: EASE_OUT, fill: 'backwards' },
      );
    });
    return true;
  };

  let wasActive = section.classList.contains('active');
  new MutationObserver(() => {
    const isActive = section.classList.contains('active');
    if (isActive && !wasActive) {
      armedUntil = Date.now() + 1500;
      requestAnimationFrame(() => { play(); });
    }
    wasActive = isActive;
  }).observe(section, { attributes: true, attributeFilter: ['class'] });

  new MutationObserver(() => { if (armedUntil) play(); }).observe(container, { childList: true, subtree: true });
};
