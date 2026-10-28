// État de l'application, sauvegardé dans le stockage local du navigateur.
// Rien ne quitte l'appareil.

const KEY = 'ma-forme-v1';
export const SCHEMA = 1;

let state;
let onError = () => {};
const listeners = new Set();

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
  };
}

const normalize = (s) => ({ ...emptyState(), ...s });

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
