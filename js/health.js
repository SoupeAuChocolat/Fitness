// Synchronisation des pas et du sommeil avec Connexion Santé (Health Connect).
import * as store from './store.js';
import { addDays, todayKey } from './dates.js';
import { HealthConnect } from './native.js';

export const healthAvailable = () => !!HealthConnect;

let syncing = null;
let lastAuto = 0;

export async function healthStatus() {
  if (!HealthConnect) return { status: 'web', steps: false, sleep: false };
  try {
    return await HealthConnect.getStatus();
  } catch {
    return { status: 'unavailable', steps: false, sleep: false };
  }
}

// Demande l'accès (écran système de Connexion Santé) puis importe les 30 derniers jours.
export async function connectHealth() {
  const granted = await HealthConnect.authorize();
  if (!granted.steps && !granted.sleep) return granted;
  store.update((s) => (s.health = { ...s.health, enabled: true, lastSyncDay: null }), { silent: true });
  await syncHealth({ force: true });
  return granted;
}

export function disconnectHealth() {
  store.update((s) => (s.health = { ...s.health, enabled: false }));
}

// Applique les valeurs lues ; une valeur saisie à la main (day.manual) n'est jamais écrasée.
export function applyHealthData(state, { steps = [], sleep = [] }) {
  let changed = 0;
  const set = (date, field, value) => {
    const day = (state.days[date] ||= {});
    if (day.manual?.[field] || day[field] === value) return;
    day[field] = value;
    (day.sync ||= {})[field] = true;
    changed++;
  };
  for (const d of steps) if (d.steps > 0) set(d.date, 'steps', Math.round(d.steps));
  for (const d of sleep) if (d.minutes > 0) set(d.date, 'sleep', Math.round(d.minutes / 6) / 10);
  return changed;
}

// Lit les jours manquants depuis la dernière synchro (30 jours la première fois).
// Sans « force », pas plus d'une synchro automatique toutes les 2 minutes.
export async function syncHealth({ force = false } = {}) {
  const state = store.get();
  if (!HealthConnect || !state.health?.enabled) return null;
  if (!force && Date.now() - lastAuto < 120000) return null;
  if (syncing) return syncing;
  lastAuto = Date.now();
  syncing = (async () => {
    const status = await HealthConnect.getStatus();
    if (status.status !== 'available' || (!status.steps && !status.sleep)) return { status };
    const today = todayKey();
    const start = state.health.lastSyncDay ? addDays(state.health.lastSyncDay, -2) : addDays(today, -29);
    const range = { start, end: today };
    const [steps, sleep] = await Promise.all([
      status.steps ? HealthConnect.readSteps(range).then((r) => r.days) : [],
      status.sleep ? HealthConnect.readSleep(range).then((r) => r.days) : [],
    ]);
    let changed = 0;
    store.update((s) => {
      changed = applyHealthData(s, { steps, sleep });
      s.health = { ...s.health, lastSync: Date.now(), lastSyncDay: today };
    }, { silent: true });
    if (changed) store.save();
    return { status, changed };
  })().finally(() => (syncing = null));
  return syncing;
}
