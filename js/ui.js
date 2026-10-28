// Petits outils d'interface : échappement, formats, feuilles modales, toasts, icônes.
import { formatLong, formatRelative, todayKey } from './dates.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const nf = (n, digits = 0) =>
  Number(n).toLocaleString('fr-FR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const fmtKg = (n) => (n == null ? '–' : `${nf(n, 1)} kg`);
export const fmtEuro = (n) => Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n >= 100 ? 0 : 2 });

// Accepte « 82,5 » comme « 82.5 ». Renvoie null si vide ou invalide.
export function parseNum(str) {
  if (str == null) return null;
  const s = String(str).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const plural = (n, word, pluralWord = `${word}s`) => `${nf(n)} ${Math.abs(n) >= 2 ? pluralWord : word}`;

export function bindActions(root, handlers) {
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t || !root.contains(t) || t.disabled) return;
    const fn = handlers[t.dataset.act];
    if (fn) fn(t, e);
  });
  root.addEventListener('change', (e) => {
    const t = e.target.closest('[data-change]');
    if (t && handlers[t.dataset.change]) handlers[t.dataset.change](t, e);
  });
  root.addEventListener('input', (e) => {
    const t = e.target.closest('[data-input]');
    if (t && handlers[t.dataset.input]) handlers[t.dataset.input](t, e);
  });
}

// --- Feuilles modales (bottom sheets) ---------------------------------------

let openSheets = 0;

export function openSheet({ title, html, onMount, onClose, className = '' }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `
    <div class="sheet ${className}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-head">
        <h2>${esc(title)}</h2>
        <button class="icon-btn" data-close aria-label="Fermer">${ICON.x}</button>
      </div>
      <div class="sheet-body">${html}</div>
    </div>`;
  document.body.appendChild(backdrop);
  openSheets++;
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => backdrop.classList.add('open'));

  let closed = false;
  const onKey = (e) => e.key === 'Escape' && close();
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    backdrop.classList.remove('open');
    openSheets--;
    if (!openSheets) document.body.classList.remove('no-scroll');
    setTimeout(() => backdrop.remove(), 220);
    onClose?.();
  }
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  const body = backdrop.querySelector('.sheet-body');
  onMount?.(body, close);
  return { body, close };
}

export function confirmSheet({ title, message, ok = 'Confirmer', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    openSheet({
      title,
      html: `<p class="muted">${esc(message)}</p>
        <div class="btn-row">
          <button class="btn" data-close>Annuler</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(ok)}</button>
        </div>`,
      onMount(body, close) {
        body.querySelector('[data-ok]').addEventListener('click', () => {
          answered = true;
          resolve(true);
          close();
        });
      },
      onClose: () => !answered && resolve(false),
    });
  });
}

// --- Toasts ------------------------------------------------------------------

export function toast(message, { icon = '', duration = 2800 } = {}) {
  let host = document.getElementById('toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${icon ? `<span class="toast-icon">${icon}</span>` : ''}<span>${esc(message)}</span>`;
  host.appendChild(el);
  while (host.children.length > 3) host.firstElementChild.remove();
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// --- Son & vibration (minuteurs) ----------------------------------------------

let audioCtx;
export function unlockAudio() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {
    /* audio indisponible */
  }
}

export function beep(times = 1) {
  try {
    unlockAudio();
    for (let i = 0; i < times; i++) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(audioCtx.destination);
      const t = audioCtx.currentTime + i * 0.28;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.start(t);
      o.stop(t + 0.22);
    }
  } catch {
    /* audio indisponible */
  }
  navigator.vibrate?.(times > 1 ? [200, 100, 200] : 200);
}

// --- Composants HTML partagés -----------------------------------------------

export function dateNav(key) {
  const isToday = key === todayKey();
  return `
    <div class="datenav">
      <button class="icon-btn" data-act="prevDay" aria-label="Jour précédent">${ICON.left}</button>
      <button class="datenav-label" data-act="pickDay">
        <strong>${esc(formatRelative(key))}</strong>
        ${isToday || formatRelative(key) !== formatLong(key) ? `<small>${esc(formatLong(key))}</small>` : ''}
      </button>
      <button class="icon-btn" data-act="nextDay" aria-label="Jour suivant" ${isToday ? 'disabled' : ''}>${ICON.right}</button>
    </div>`;
}

export const progressBar = (ratio, cls = '') =>
  `<div class="bar ${cls}"><span style="width:${Math.max(0, Math.min(1, ratio)) * 100}%"></span></div>`;

export const ICON = {
  today: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2.5v3M16 2.5v3M3 9.5h18M9 15l2 2 4-4"/></svg>',
  meals: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2.5v7a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-7M7.5 2.5v19M19 15V2.5a4.5 4.5 0 0 0-4.5 4.5v6a2 2 0 0 0 2 2H19zm0 0v6.5"/></svg>',
  sport: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/></svg>',
  habits: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.5s7.5-3.5 7.5-9.5V5.5L12 2.5l-7.5 3V12c0 6 7.5 9.5 7.5 9.5z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>',
  progress: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>',
};
