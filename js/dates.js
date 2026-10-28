// Les jours sont manipulés sous forme de clés locales « AAAA-MM-JJ ».

const pad = (n) => String(n).padStart(2, '0');

export function toKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayKey = () => toKey(new Date());

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

// Nombre de jours de a vers b (b - a).
export function diffDays(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

// 0 = dimanche … 6 = samedi
export const weekday = (key) => parseKey(key).getDay();

// Lundi de la semaine contenant key.
export function weekStart(key) {
  return addDays(key, -((weekday(key) + 6) % 7));
}

export function keysBetween(from, to) {
  const keys = [];
  for (let k = from; k <= to; k = addDays(k, 1)) keys.push(k);
  return keys;
}

const fmt = (key, opts) => parseKey(key).toLocaleDateString('fr-FR', opts);

export const formatLong = (key) => fmt(key, { weekday: 'long', day: 'numeric', month: 'long' });
export const formatDayMonth = (key) => fmt(key, { day: 'numeric', month: 'short' });
export const formatShort = (key) => fmt(key, { day: '2-digit', month: '2-digit' });
export const formatFull = (key) => fmt(key, { day: 'numeric', month: 'long', year: 'numeric' });
export const formatMonth = (key) => fmt(key, { month: 'long', year: 'numeric' });
export const weekdayShort = (key) => fmt(key, { weekday: 'short' }).replace('.', '');

export function formatRelative(key, today = todayKey()) {
  const d = diffDays(key, today);
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return 'Hier';
  if (d === 2) return 'Avant-hier';
  return formatLong(key);
}
