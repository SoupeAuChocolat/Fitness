// Badges de motivation, calculés à partir des données.
import { currentWeight, dailyTarget, dayTotals, habitStats, teethStats } from './calc.js';
import { weekStart } from './dates.js';
import { nf } from './ui.js';

const HABIT_STEPS = [1, 3, 7, 14, 30, 60, 90, 180, 365];

export function computeBadges(state, today) {
  const p = state.profile;
  const keys = Object.keys(state.days).sort();
  let weighDays = 0;
  let mealDays = 0;
  let waterDays = 0;
  let sleepDays = 0;
  let underDays = 0;
  let workouts = 0;
  let maxSteps = 0;
  const perWeek = {};
  const stepsWeek = {};

  for (const k of keys) {
    const d = state.days[k];
    if (d.weight != null) weighDays++;
    if (d.water >= p.waterGoal) waterDays++;
    if (d.sleep >= p.sleepGoal) sleepDays++;
    maxSteps = Math.max(maxSteps, d.steps || 0);
    if (d.steps) stepsWeek[weekStart(k)] = (stepsWeek[weekStart(k)] || 0) + d.steps;
    const n = (d.workouts || []).length;
    workouts += n;
    if (n) perWeek[weekStart(k)] = (perWeek[weekStart(k)] || 0) + n;
    if (d.meals && d.meals.length) {
      mealDays++;
      if (d.meals.length >= 2 && dayTotals(d).eaten <= dailyTarget(state, k).target) underDays++;
    }
  }

  const bestWeek = Math.max(0, ...Object.values(perWeek));
  const bestStepsWeek = Math.max(0, ...Object.values(stepsWeek));
  const weight = currentWeight(state, today);
  const lost = p.startWeight - weight;
  const toLose = p.startWeight - p.goalWeight;
  const urges = state.habits.reduce((s, h) => s + (h.urges || []).length, 0);

  const list = [];
  const add = (id, icon, title, desc, value, goal, group, label = title) =>
    list.push({ id, icon, title, label, desc, ok: value >= goal, progress: Math.max(0, Math.min(1, value / goal)), group });

  add('weigh_1', '⚖️', 'Première pesée', 'Noter ton poids une première fois', weighDays, 1, 'Poids');
  add('weigh_7', '📅', 'Pesée régulière', '7 jours avec une pesée', weighDays, 7, 'Poids');
  add('weigh_30', '📆', 'Suivi au top', '30 jours avec une pesée', weighDays, 30, 'Poids');
  for (const kg of [1, 2, 3, 5, 7, 10, 15, 20, 25, 30]) {
    if (kg <= 3 || kg <= toLose) add(`loss_${kg}`, '📉', `−${kg} kg`, `Perdre ${kg} kg depuis le début`, lost, kg, 'Poids');
  }
  add('goal', '🏆', 'Objectif atteint', `Atteindre ${nf(p.goalWeight, 1)} kg`, weight <= p.goalWeight ? 1 : 0, 1, 'Poids');

  add('workout_1', '👟', 'Première séance', 'Terminer une première séance de sport', workouts, 1, 'Sport');
  add('workout_10', '💪', '10 séances', 'Enregistrer 10 séances', workouts, 10, 'Sport');
  add('workout_25', '🔥', '25 séances', 'Enregistrer 25 séances', workouts, 25, 'Sport');
  add('workout_50', '🚀', '50 séances', 'Enregistrer 50 séances', workouts, 50, 'Sport');
  add('workout_100', '🦾', '100 séances', 'Enregistrer 100 séances', workouts, 100, 'Sport');
  add('week_3', '🗓️', 'Semaine active', '3 séances dans la même semaine', bestWeek, 3, 'Sport');
  add('week_5', '⚡', 'Semaine de champion', '5 séances dans la même semaine', bestWeek, 5, 'Sport');
  add('steps_10k', '👣', '10 000 pas', 'Faire 10 000 pas dans une journée', maxSteps, 10000, 'Sport');

  add('meals_7', '📝', 'Journal tenu', '7 jours avec des repas notés', mealDays, 7, 'Alimentation');
  add('meals_30', '📒', 'Journal de pro', '30 jours avec des repas notés', mealDays, 30, 'Alimentation');
  add('under_7', '🎯', 'Dans les clous', '7 jours sous ton objectif calorique', underDays, 7, 'Alimentation');
  add('under_30', '🥇', 'Maîtrise totale', '30 jours sous ton objectif calorique', underDays, 30, 'Alimentation');
  add('water_7', '💧', 'Bien hydraté', '7 jours avec l’objectif d’eau atteint', waterDays, 7, 'Bien-être');
  add('sleep_7', '😴', 'Bien reposé', '7 nuits avec ton objectif de sommeil', sleepDays, 7, 'Bien-être');

  if (p.teethTracker) {
    const teeth = teethStats(state, today);
    add('teeth_1', '🪥', 'Sourire éclatant', 'Les 3 brossages dans la même journée', teeth.total, 1, 'Bien-être');
    add('teeth_7', '😁', 'Dents au top', '7 jours d’affilée avec les 3 brossages', teeth.best, 7, 'Bien-être');
    add('teeth_30', '🦷', 'Hygiène de champion', '30 jours d’affilée avec les 3 brossages', teeth.best, 30, 'Bien-être');
  }
  add('steps_70k', '🚶', 'Grand marcheur', '70 000 pas en une semaine', bestStepsWeek, 70000, 'Sport');

  add('urges_10', '🧠', 'Plus fort que l’envie', 'Résister à 10 envies', urges, 10, 'Habitudes');
  add('urges_50', '🗿', 'Mental d’acier', 'Résister à 50 envies', urges, 50, 'Habitudes');
  for (const h of state.habits.filter((x) => !x.archived)) {
    const best = habitStats(h, today).best;
    for (const n of HABIT_STEPS) {
      const days = `${n} jour${n > 1 ? 's' : ''}`;
      add(`habit_${h.id}_${n}`, h.icon, days, `${days} d’affilée`, best, n, h.name, `${h.name} — ${days}`);
    }
  }
  return list;
}

// Marque les nouveaux badges obtenus et les renvoie.
export function checkNewBadges(state, today) {
  if (!state.profile) return [];
  const fresh = computeBadges(state, today).filter((b) => b.ok && !state.badges[b.id]);
  for (const b of fresh) state.badges[b.id] = today;
  return fresh;
}
