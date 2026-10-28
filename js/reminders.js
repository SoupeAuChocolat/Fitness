// Rappels (notifications locales Android, sans serveur).
import * as store from './store.js';
import { WEEK_PLAN } from './data/exercises.js';
import { LocalNotifications } from './native.js';

export const remindersAvailable = () => !!LocalNotifications;

const TEETH_LABELS = ['du matin', 'du midi', 'du soir'];
const SPORT_TEXT = {
  strength: 'Séance de renforcement au programme aujourd’hui. 20 à 30 minutes et c’est fait !',
  cardio: 'Cardio au programme : marche rapide, vélo ou natation.',
  active_rest: 'Repos actif : une petite marche de 20 minutes fera du bien.',
};

const hm = (t) => t.split(':').map(Number);
const toMinutes = (t) => hm(t)[0] * 60 + hm(t)[1];

// Construit la liste des notifications à programmer (fonction pure, testée).
export function buildNotifications(r) {
  const list = [];
  const daily = (id, time, title, body, route) => {
    const [hour, minute] = hm(time);
    list.push({ id, title, body, schedule: { on: { hour, minute }, allowWhileIdle: true }, extra: { route } });
  };
  if (r.checkin.on) daily(100, r.checkin.time, '🌙 Bilan du soir', 'Note tes habitudes et tes repas de la journée.', 'today');
  if (r.water.on) {
    const step = Math.max(1, Number(r.water.every)) * 60;
    for (let m = toMinutes(r.water.from), i = 0; m <= toMinutes(r.water.to) && i < 20; m += step, i++) {
      const time = `${Math.floor(m / 60)}:${m % 60}`;
      daily(200 + i, time, '💧 Un verre d’eau ?', 'Petit rappel pour rester bien hydraté.', 'today');
    }
  }
  if (r.sport.on) {
    const [hour, minute] = hm(r.sport.time);
    for (const [dow, plan] of Object.entries(WEEK_PLAN)) {
      if (!SPORT_TEXT[plan.type]) continue;
      list.push({
        id: 300 + Number(dow),
        title: '💪 Sport du jour',
        body: SPORT_TEXT[plan.type],
        // Capacitor : 1 = dimanche … 7 = samedi
        schedule: { on: { weekday: Number(dow) + 1, hour, minute }, allowWhileIdle: true },
        extra: { route: 'sport' },
      });
    }
  }
  if (r.teeth.on) {
    r.teeth.times.forEach((time, i) => daily(400 + i, time, '🪥 Brossage de dents', `C’est l’heure du brossage ${TEETH_LABELS[i]}.`, 'today'));
  }
  return list;
}

export async function notificationPermission() {
  if (!LocalNotifications) return 'unavailable';
  const { display } = await LocalNotifications.checkPermissions();
  return display;
}

export async function requestNotificationPermission() {
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

// Annule et reprogramme tous les rappels de l'app.
export async function applyReminders(r) {
  if (!LocalNotifications) return 0;
  const { notifications } = await LocalNotifications.getPending();
  if (notifications.length) await LocalNotifications.cancel({ notifications: notifications.map((n) => ({ id: n.id })) });
  if (!r.enabled || (await notificationPermission()) !== 'granted') return 0;
  const list = buildNotifications(r);
  if (list.length) await LocalNotifications.schedule({ notifications: list });
  return list.length;
}

// Demande l'autorisation d'afficher des notifications puis programme les rappels.
export async function enableReminders() {
  if (!(await requestNotificationPermission())) return false;
  store.update((s) => (s.reminders.enabled = true));
  await applyReminders(store.get().reminders);
  return true;
}

export async function exactAlarmsAllowed() {
  try {
    const { exact_alarm: state } = await LocalNotifications.checkExactNotificationSetting();
    return state === 'granted';
  } catch {
    return true;
  }
}

export const openExactAlarmSettings = () => LocalNotifications.changeExactNotificationSetting();

export function onReminderTap(handler) {
  LocalNotifications?.addListener('localNotificationActionPerformed', (e) => handler(e.notification?.extra?.route));
}
