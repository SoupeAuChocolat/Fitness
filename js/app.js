// Point d'entrée : routage, barre d'onglets, badges, service worker.
import * as store from './store.js';
import { checkNewBadges } from './badges.js';
import { addDays, todayKey } from './dates.js';
import { syncHealth } from './health.js';
import { App, isNative, SystemBars } from './native.js';
import { applyReminders, onReminderTap } from './reminders.js';
import { closeTopSheet, esc, ICON, toast } from './ui.js';
import * as habit from './views/habit.js';
import * as habits from './views/habits.js';
import * as meals from './views/meals.js';
import * as onboarding from './views/onboarding.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';
import * as sport from './views/sport.js';
import * as today from './views/today.js';
import * as workout from './views/workout.js';

const ROUTES = {
  today: { view: today, title: "Aujourd'hui", tab: 'today' },
  meals: { view: meals, title: 'Repas', tab: 'meals' },
  sport: { view: sport, title: 'Sport', tab: 'sport' },
  workout: { view: workout, title: 'Séance en cours', tab: 'sport' },
  habits: { view: habits, title: 'Habitudes', tab: 'habits' },
  habit: { view: habit, title: 'Habitude', tab: 'habits' },
  progress: { view: progress, title: 'Progrès', tab: 'progress' },
  settings: { view: settings, title: 'Réglages', tab: null },
  onboarding: { view: onboarding, title: 'Ma Forme', tab: null },
};

const TABS = [
  ['today', "Aujourd'hui"],
  ['meals', 'Repas'],
  ['sport', 'Sport'],
  ['habits', 'Habitudes'],
  ['progress', 'Progrès'],
];

const ui = { date: todayKey() };
let currentRoute = null;
let lastHash = '#/today'; // pour le bouton retour des réglages
let lastToday = todayKey();

function parseRoute() {
  const [name = 'today', ...args] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name, args };
}

function go(name) {
  const hash = `#/${name}`;
  if (location.hash === hash) render();
  else location.hash = hash;
}

function setDate(key) {
  ui.date = key > todayKey() ? todayKey() : key;
  render();
}

function pickDate() {
  const input = document.createElement('input');
  input.type = 'date';
  input.max = todayKey();
  input.value = ui.date;
  input.className = 'hidden-date';
  document.body.appendChild(input);
  input.addEventListener('change', () => {
    if (input.value) setDate(input.value);
    input.remove();
  });
  input.addEventListener('blur', () => setTimeout(() => input.remove(), 1000));
  try {
    input.showPicker();
  } catch {
    input.focus();
  }
}

const dateHandlers = {
  prevDay: () => setDate(addDays(ui.date, -1)),
  nextDay: () => setDate(addDays(ui.date, 1)),
  pickDay: () => (ui.date !== todayKey() ? setDate(todayKey()) : pickDate()),
};

function announceBadges(fresh) {
  fresh.slice(0, 3).forEach((b, i) => setTimeout(() => toast(`Nouveau badge : ${b.label}`, { icon: b.icon, duration: 3500 }), 400 + i * 900));
  if (fresh.length > 3) setTimeout(() => toast(`+ ${fresh.length - 3} autres badges débloqués`, { icon: '🏅' }), 3200);
}

function renderChrome(name, state) {
  const route = ROUTES[name];
  document.body.dataset.route = name;
  document.getElementById('topbar-title').textContent = route.title;
  document.getElementById('settings-btn').hidden = name === 'onboarding' || name === 'settings';
  document.getElementById('back-btn').hidden = name !== 'settings';
  const tabbar = document.getElementById('tabbar');
  tabbar.hidden = name === 'onboarding';
  tabbar.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.tab === route.tab));
  const banner = document.getElementById('banner');
  const showBanner = state.activeWorkout && name !== 'workout' && name !== 'onboarding';
  banner.hidden = !showBanner;
  if (showBanner) banner.innerHTML = `<a href="#/workout">⏱️ Séance en cours : ${esc(state.activeWorkout.title)} — <strong>Reprendre</strong></a>`;
}

function render() {
  const state = store.get();
  let { name, args } = parseRoute();
  if (!state.profile) {
    name = 'onboarding';
    if (location.hash !== '#/onboarding') history.replaceState(null, '', '#/onboarding');
  } else if (name === 'onboarding' || !ROUTES[name]) {
    name = 'today';
    history.replaceState(null, '', '#/today');
  }

  if (state.profile) {
    const fresh = checkNewBadges(state, todayKey());
    if (fresh.length) {
      store.save({ silent: true });
      announceBadges(fresh);
    }
  }

  if (name !== 'settings' && name !== 'onboarding') lastHash = location.hash || '#/today';
  if (currentRoute !== name) {
    ROUTES[currentRoute]?.view.cleanup?.();
    currentRoute = name;
    window.scrollTo(0, 0);
  }

  renderChrome(name, state);
  const view = document.getElementById('view');
  const fresh = document.createElement('div');
  fresh.className = `view view-${name}`;
  view.replaceChildren(fresh);
  ROUTES[name].view.render(fresh, { state, ui, args, go, setDate, dateHandlers, rerender: render });
}

function buildTabbar() {
  document.getElementById('tabbar').innerHTML = TABS.map(
    ([id, label]) => `<a href="#/${id}" data-tab="${id}">${ICON[id]}<span>${label}</span></a>`,
  ).join('');
  document.getElementById('settings-btn').innerHTML = ICON.settings;
  document.getElementById('back-btn').innerHTML = ICON.left;
}

function init() {
  store.load();
  store.setErrorHandler(() => toast('Impossible d’enregistrer : stockage du navigateur plein ou bloqué.', { icon: '⚠️', duration: 5000 }));
  store.subscribe(render);
  buildTabbar();
  document.getElementById('settings-btn').addEventListener('click', () => go('settings'));
  document.getElementById('back-btn').addEventListener('click', () => (location.hash = lastHash));
  window.addEventListener('hashchange', render);

  // Passage à un nouveau jour pendant que l'app reste ouverte.
  const onResume = () => {
    const now = todayKey();
    if (now !== lastToday) {
      if (ui.date === lastToday) ui.date = now;
      lastToday = now;
      render();
    }
    syncHealth().catch(() => {});
  };
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && onResume());

  let resizeTimer;
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth !== lastWidth && currentRoute === 'progress') render();
      lastWidth = window.innerWidth;
    }, 250);
  });

  render();

  if (isNative) initAndroid(onResume);
  else {
    navigator.storage?.persist?.().catch(() => {});
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
}

function initAndroid(onResume) {
  document.body.classList.add('native');
  SystemBars?.setStyle({ style: 'DEFAULT' }).catch?.(() => {});
  // Bouton retour : ferme la feuille ouverte, sinon revient en arrière, sinon quitte l'app.
  App?.addListener('backButton', () => {
    if (closeTopSheet()) return;
    if (currentRoute === 'today' || currentRoute === 'onboarding') App.exitApp();
    else if (currentRoute === 'settings') location.hash = lastHash;
    else history.length > 1 ? history.back() : go('today');
  });
  App?.addListener('resume', onResume);
  onReminderTap((route) => route && go(route));
  const state = store.get();
  syncHealth({ force: true }).catch(() => {});
  // Reprogramme les rappels (après une mise à jour de l'app ou un redémarrage).
  if (state.reminders.enabled) applyReminders(state.reminders).catch(() => {});
}

init();
