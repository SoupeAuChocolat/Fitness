// État de l'application, sauvegardé dans le stockage local du navigateur.
// Rien ne quitte l'appareil.

const KEY = 'ma-forme-v1';
export const SCHEMA = 1;

let state;
let onError = () => {};
const listeners = new Set();

export const DEFAULT_REMINDERS = {
  enabled: false,
  checkin: { on: true, time: '21:00' },
  water: { on: true, from: '09:00', to: '19:00', every: 2 },
  sport: { on: true, time: '18:00' },
  teeth: { on: true, times: ['08:00', '13:30', '22:00'] },
};

export function emptyState() {
  return {
    version: SCHEMA,
    profile: null,
    days: {},
    habits: [],
    customFoods: [],
    badges: {},
    program: null,
    activeWorkout: null,
    health: { enabled: false, lastSync: null, lastSyncDay: null },
    reminders: structuredClone(DEFAULT_REMINDERS),
    setupDismissed: false,
  };
}

// Complète un état ancien (ou une sauvegarde) avec les champs ajoutés depuis.
function normalize(s) {
  const out = { ...emptyState(), ...s };
  out.reminders = { ...structuredClone(DEFAULT_REMINDERS), ...(s.reminders || {}) };
  if (out.profile) {
    out.profile = { stepsMode: 'budget', teethTracker: true, proteinGoal: null, weekGoal: 5, ...out.profile };
  }
  return out;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? normalize(JSON.parse(raw)) : emptyState();
  } catch {
    state = emptyState();
  }
  return state;
}

export const get = () => state;

export function save({ silent = false } = {}) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    onError(e);
  }
  if (!silent) listeners.forEach((fn) => fn(state));
}

export function update(fn, opts) {
  fn(state);
  save(opts);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const setErrorHandler = (fn) => (onError = fn);

export const ensureDay = (key) => (state.days[key] ||= {});

export function replace(next) {
  state = normalize(next);
  save();
}

export function reset() {
  state = emptyState();
  save();
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function isValidBackup(data) {
  return data && typeof data === 'object' && typeof data.days === 'object' && Array.isArray(data.habits);
}
