// income-chart.ts — monthly income chart for Finanzas: own SVG, no libraries.
// Bars ⇄ line: bars fold down (staggered) while the line draws itself and its points appear.
// Only real totals from /api/pagos/resumen; with no data it shows an empty state, never sample values.

const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const euroShort = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export type IncomeChartState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'data'; year: number; totals: number[]; currentMonth: number | null };

const emptyState = (icon: string, title: string, hint: string) => `
  <div class="fi-empty">
    <span class="material-symbols-rounded" aria-hidden="true">${icon}</span>
    <strong>${title}</strong>
    <small>${hint}</small>
  </div>`;

// Drawn at the plot's real width (legible text on phones); redrawn when that width changes.
const lastState = new WeakMap<HTMLElement, IncomeChartState>();
const observed = new WeakSet<HTMLElement>();

export const renderIncomeChart = (plot: HTMLElement | null, state: IncomeChartState) => {
  if (!plot) return;
  lastState.set(plot, state);
  if (!observed.has(plot) && typeof ResizeObserver !== 'undefined') {
    observed.add(plot);
    let drawnWidth = plot.clientWidth;
    new ResizeObserver(() => {
      const width = plot.clientWidth;
      const current = lastState.get(plot);
      if (!width || Math.abs(width - drawnWidth) < 24 || current?.kind !== 'data') return;
      drawnWidth = width;
      renderIncomeChart(plot, current);
    }).observe(plot);
  }
  if (state.kind === 'loading') {
    plot.innerHTML = emptyState('sync', 'Cargando ingresos…', 'Leyendo el resumen mensual de cobros.');
    return;
  }
  if (state.kind === 'error') {
    plot.innerHTML = emptyState('cloud_off', 'No se pudieron cargar los ingresos', 'El resto de Finanzas sigue disponible. Vuelve a intentarlo más tarde.');
    return;
  }
  const totals = state.totals.map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
  const yearTotal = totals.reduce((sum, value) => sum + value, 0);
  if (!yearTotal) {
    plot.innerHTML = emptyState('bar_chart', `Sin ingresos registrados en ${state.year}`, 'El gráfico aparecerá con el primer cobro del año.');
    return;
  }

  const W = Math.max(300, Math.round(plot.clientWidth || 640));
  const H = W < 480 ? 200 : 240;
  const pad = { top: 16, right: 12, bottom: 28, left: 52 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const max = Math.max(...totals);
  const slot = chartW / 12;
  const barW = Math.min(28, slot * 0.56);
  const xCenter = (i: number) => pad.left + slot * i + slot / 2;
  const yOf = (value: number) => pad.top + chartH - (value / max) * chartH;
  const lastMonth = state.currentMonth ?? 12;
  const linePoints = totals.slice(0, lastMonth).map((value, i) => `${xCenter(i).toFixed(1)},${yOf(value).toFixed(1)}`).join(' ');

  const grid = [1, 0.5, 0].map((ratio) => {
    const y = pad.top + chartH - ratio * chartH;
    return `<line class="fi-grid" x1="${pad.left}" x2="${W - pad.right}" y1="${y}" y2="${y}"></line>
      <text class="fi-axis" x="${pad.left - 8}" y="${y + 4}" text-anchor="end">${euroShort.format(max * ratio)}</text>`;
  }).join('');

  const bars = totals.map((value, i) => {
    const y = yOf(value);
    const label = `${MONTH_NAMES[i]}: ${euro.format(value)}`;
    const current = state.currentMonth === i + 1 ? ' is-current' : '';
    return `<rect class="fi-bar${current}" style="--i:${i}" x="${(xCenter(i) - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${(pad.top + chartH - y).toFixed(1)}" rx="4"><title>${label}</title></rect>`;
  }).join('');

  const dots = totals.slice(0, lastMonth).map((value, i) => {
    const current = state.currentMonth === i + 1 ? ' is-current' : '';
    return `<circle class="fi-dot${current}" style="--i:${i}" cx="${xCenter(i).toFixed(1)}" cy="${yOf(value).toFixed(1)}" r="4"><title>${MONTH_NAMES[i]}: ${euro.format(value)}</title></circle>`;
  }).join('');

  const labels = MONTHS.map((month, i) => {
    const current = state.currentMonth === i + 1 ? ' is-current' : '';
    return `<text class="fi-month${current}" x="${xCenter(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${month}</text>`;
  }).join('');

  plot.innerHTML = `
    <svg class="fi-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos por mes en ${state.year}: ${euro.format(yearTotal)} en total">
      ${grid}
      <g class="fi-bars">${bars}</g>
      <polyline class="fi-line" pathLength="1" points="${linePoints}"></polyline>
      <g class="fi-dots">${dots}</g>
      ${labels}
    </svg>
    <p class="fi-total">Total ${state.year}: <strong>${euro.format(yearTotal)}</strong></p>`;
};
