// Graphiques SVG légers (ligne et barres) avec info-bulle au survol / toucher.
import { diffDays, formatShort } from './dates.js';
import { esc, nf } from './ui.js';

const PAD = { top: 14, right: 14, bottom: 26, left: 40 };

function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return { lo, hi, ticks };
}

function barPath(x, y, w, h, r = 4) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h}Z`;
}

function setupTooltip(el, svg, hitTest) {
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;
  el.appendChild(tip);
  const cross = svg.querySelector('.c-cross');
  const move = (e) => {
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hit = hitTest(x);
    if (!hit) return hide();
    tip.innerHTML = hit.html;
    tip.hidden = false;
    if (cross) {
      cross.setAttribute('x1', hit.cx);
      cross.setAttribute('x2', hit.cx);
      cross.style.opacity = 1;
    }
    const tw = tip.offsetWidth;
    const left = Math.min(Math.max(hit.cx - tw / 2, 0), rect.width - tw);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(0, hit.cy - tip.offsetHeight - 12)}px`;
  };
  const hide = () => {
    tip.hidden = true;
    if (cross) cross.style.opacity = 0;
  };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', hide);
}

// points : [{x: 'AAAA-MM-JJ', y}] ; trend : idem (moyenne glissante) ; goal : nombre.
export function renderLineChart(el, { points, trend, goal, unit = '', height = 200, digits = 1, pointLabel = 'Valeur', trendLabel = 'Moyenne 7 j' }) {
  el.classList.add('chart');
  if (points.length < 2) {
    el.innerHTML = '<p class="chart-empty">Ajoute au moins 2 mesures pour voir la courbe.</p>';
    return;
  }
  const width = Math.max(260, el.clientWidth || 320);
  const iw = width - PAD.left - PAD.right;
  const ih = height - PAD.top - PAD.bottom;
  const first = points[0].x;
  const span = Math.max(1, diffDays(first, points[points.length - 1].x));
  const ys = points.map((p) => p.y);
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  const showGoal = goal != null && goal >= min - Math.max(2, max - min) && goal <= max + Math.max(2, max - min);
  if (showGoal) {
    min = Math.min(min, goal);
    max = Math.max(max, goal);
  }
  const pad = Math.max(0.5, (max - min) * 0.1);
  const { lo, hi, ticks } = niceTicks(min - pad, max + pad);
  const X = (key) => PAD.left + (diffDays(first, key) / span) * iw;
  const Y = (v) => PAD.top + ih - ((v - lo) / (hi - lo)) * ih;

  const grid = ticks
    .map((t) => `<line class="c-grid" x1="${PAD.left}" x2="${width - PAD.right}" y1="${Y(t)}" y2="${Y(t)}"/>
      <text class="c-tick" x="${PAD.left - 6}" y="${Y(t) + 4}" text-anchor="end">${nf(t, 1)}</text>`)
    .join('');
  const mid = points[Math.floor(points.length / 2)].x;
  const xLabels = [...new Set([first, mid, points[points.length - 1].x])]
    .map((k, i, arr) => `<text class="c-tick" x="${X(k)}" y="${height - 6}" text-anchor="${i === 0 ? 'start' : i === arr.length - 1 ? 'end' : 'middle'}">${formatShort(k)}</text>`)
    .join('');
  const goalLine = showGoal
    ? `<line class="c-goal" x1="${PAD.left}" x2="${width - PAD.right}" y1="${Y(goal)}" y2="${Y(goal)}"/>
       <text class="c-goal-label" x="${width - PAD.right}" y="${Y(goal) - 5}" text-anchor="end">Objectif ${nf(goal, digits)} ${esc(unit)}</text>`
    : '';
  const dots = points.map((p) => `<circle class="c-dot" cx="${X(p.x)}" cy="${Y(p.y)}" r="4"/>`).join('');
  const line = trend && trend.length > 1
    ? `<path class="c-line" d="${trend.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('')}"/>`
    : '';
  const last = (trend && trend.length ? trend : points)[points.length - 1];
  const endDot = `<circle class="c-end" cx="${X(last.x)}" cy="${Y(last.y)}" r="5"/>`;

  el.innerHTML = `
    ${trend ? `<div class="chart-legend"><span><i class="lg-dot"></i>${esc(pointLabel)}</span><span><i class="lg-line"></i>${esc(trendLabel)}</span></div>` : ''}
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Graphique ${esc(pointLabel)}">
      ${grid}${goalLine}
      <line class="c-cross" x1="0" x2="0" y1="${PAD.top}" y2="${PAD.top + ih}"/>
      ${dots}${line}${endDot}${xLabels}
    </svg>`;

  const svg = el.querySelector('svg');
  setupTooltip(el, svg, (x) => {
    let best = null;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(X(points[i].x) - x);
      if (!best || d < best.d) best = { d, i };
    }
    if (!best || best.d > 40) return null;
    const p = points[best.i];
    const t = trend ? trend[best.i] : null;
    return {
      cx: X(p.x),
      cy: Y(p.y) + (el.querySelector('.chart-legend')?.offsetHeight || 0),
      html: `<strong>${formatShort(p.x)}</strong><br>${esc(pointLabel)} : ${nf(p.y, digits)} ${esc(unit)}${t ? `<br>${esc(trendLabel)} : ${nf(t.y, digits)} ${esc(unit)}` : ''}`,
    };
  });
}

// bars : [{label, value, tip, over}] ; target : ligne de référence optionnelle.
export function renderBarChart(el, { bars, target, targetLabel = 'Objectif', unit = '', height = 190, overLabel, valueLabel = '' }) {
  el.classList.add('chart');
  const width = Math.max(260, el.clientWidth || 320);
  const iw = width - PAD.left - PAD.right;
  const ih = height - PAD.top - PAD.bottom;
  const max = Math.max(1, ...bars.map((b) => b.value), target || 0);
  const { hi, ticks } = niceTicks(0, max * 1.08, 4);
  const band = iw / bars.length;
  const bw = Math.min(24, band * 0.62);
  const X = (i) => PAD.left + band * i + (band - bw) / 2;
  const Y = (v) => PAD.top + ih - (v / hi) * ih;
  const longest = Math.max(...bars.map((b) => String(b.label).length));
  const every = Math.max(1, Math.ceil((longest * 7 + 8) / band));

  const grid = ticks
    .map((t) => `<line class="c-grid" x1="${PAD.left}" x2="${width - PAD.right}" y1="${Y(t)}" y2="${Y(t)}"/>
      <text class="c-tick" x="${PAD.left - 6}" y="${Y(t) + 4}" text-anchor="end">${nf(t)}</text>`)
    .join('');
  const rects = bars
    .map((b, i) => (b.value > 0
      ? `<path class="c-bar ${b.over ? 'c-bar-over' : ''}" d="${barPath(X(i), Y(b.value), bw, Y(0) - Y(b.value))}"/>`
      : ''))
    .join('');
  const labels = bars
    .map((b, i) => ((bars.length - 1 - i) % every === 0
      ? `<text class="c-tick" x="${X(i) + bw / 2}" y="${height - 6}" text-anchor="middle">${esc(b.label)}</text>`
      : ''))
    .join('');
  const targetLine = target
    ? `<line class="c-goal" x1="${PAD.left}" x2="${width - PAD.right}" y1="${Y(target)}" y2="${Y(target)}"/>
       <text class="c-goal-label" x="${width - PAD.right}" y="${Y(target) - 5}" text-anchor="end">${esc(targetLabel)} ${nf(target)}</text>`
    : '';
  const hasOver = overLabel && bars.some((b) => b.over);

  el.innerHTML = `
    ${hasOver ? `<div class="chart-legend"><span><i class="lg-sq"></i>${esc(valueLabel)}</span><span><i class="lg-sq lg-over"></i>${esc(overLabel)}</span></div>` : ''}
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Graphique en barres">
      ${grid}
      <line class="c-base" x1="${PAD.left}" x2="${width - PAD.right}" y1="${Y(0)}" y2="${Y(0)}"/>
      ${rects}${targetLine}${labels}
    </svg>`;

  const svg = el.querySelector('svg');
  setupTooltip(el, svg, (x) => {
    const i = Math.floor((x - PAD.left) / band);
    if (i < 0 || i >= bars.length) return null;
    const b = bars[i];
    return {
      cx: X(i) + bw / 2,
      cy: Y(b.value) + (el.querySelector('.chart-legend')?.offsetHeight || 0),
      html: b.tip || `<strong>${esc(b.label)}</strong><br>${nf(b.value)} ${esc(unit)}`,
    };
  });
}
