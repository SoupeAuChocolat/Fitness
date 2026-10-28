// Thèmes visuels : défaut (clair/sombre auto), Cyberpunk, Solo Leveling.
import { MaFormeWidget, SystemBars } from './native.js';

const KEY = 'ma-forme-theme';
export const THEMES = [
  { id: 'default', label: 'Classique' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'solo', label: 'Solo Leveling' },
];
const BAR_COLOR = { cyberpunk: '#08080d', solo: '#050a14' };

export function getTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return THEMES.some((x) => x.id === t) ? t : 'default';
  } catch {
    return 'default';
  }
}

export function applyTheme(id = getTheme()) {
  const root = document.documentElement;
  if (id === 'default') delete root.dataset.theme;
  else root.dataset.theme = id;
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    if (!m.dataset.orig) m.dataset.orig = m.content;
    m.content = BAR_COLOR[id] || m.dataset.orig;
  }
  // Icône du lanceur et écran de démarrage (Android) : pris en compte au prochain lancement.
  MaFormeWidget?.setLauncherTheme({ theme: id }).catch?.(() => {});
  SystemBars?.setStyle({ style: id === 'default' ? 'DEFAULT' : 'DARK' })?.catch?.(() => {});
}

export function themePickerHtml() {
  const cur = getTheme();
  return `<div class="theme-picker">${THEMES.map((th) => `<button class="theme-opt ${cur === th.id ? 'on' : ''}" data-act="theme" data-id="${th.id}"><span class="theme-swatch sw-${th.id}"></span>${th.label}</button>`).join('')}</div>`;
}

export function setTheme(id) {
  try {
    localStorage.setItem(KEY, id);
  } catch { /* stockage indisponible : le thème vaut pour cette session */ }
  applyTheme(id);
}
