// Défi hebdomadaire et bilan du dimanche (calculs purs).
import { habitStats, teethDone } from './calc.js';
import { diffDays, keysBetween, weekStart } from './dates.js';
import { weekTraining } from './program.js';

const sumDays = (state, keys, pred) => keys.filter((k) => pred(state.days[k] || {}, k)).length;

export const CHALLENGES = [
  {
    id: 'sans-sucre', title: 'Trois jours sans sucre ajouté', target: 3,
    available: (state) => state.habits.some((h) => !h.archived && h.preset === 'sugar'),
    count: (state, keys) => {
      const h = state.habits.find((x) => !x.archived && x.preset === 'sugar');
      return keys.filter((k) => h && k >= h.startDate && h.log?.[k] !== 'fail').length;
    },
  },
  {
    id: 'eau', title: 'Atteindre ton objectif d’eau 4 jours', target: 4,
    count: (state, keys) => sumDays(state, keys, (d) => (d.water || 0) >= (state.profile.waterGoal || 8)),
  },
  {
    id: 'sommeil', title: 'Dormir au moins 7 h, 4 nuits', target: 4,
    count: (state, keys) => sumDays(state, keys, (d) => (d.sleep || 0) >= 7),
  },
  {
    id: 'repas', title: 'Noter tes repas 5 jours', target: 5,
    count: (state, keys) => sumDays(state, keys, (d) => (d.meals || []).length > 0),
  },
  {
    id: 'pas', title: 'Deux jours à 8 000 pas', target: 2,
    count: (state, keys) => sumDays(state, keys, (d) => (d.steps || 0) >= 8000),
  },
  {
    id: 'dents', title: 'Les 3 brossages 5 jours', target: 5,
    available: (state) => state.profile?.teethTracker !== false,
    count: (state, keys) => sumDays(state, keys, (d) => teethDone(d)),
  },
];

const weekNumber = (monday) => Math.floor(diffDays('2024-01-01', monday) / 7);

// Un défi par semaine, en tournant ; on saute ceux qui ne s'appliquent pas.
export function challengeFor(state, today) {
  const monday = weekStart(today);
  const start = Math.abs(weekNumber(monday)) % CHALLENGES.length;
  for (let i = 0; i < CHALLENGES.length; i++) {
    const c = CHALLENGES[(start + i) % CHALLENGES.length];
    if (!c.available || c.available(state)) return c;
  }
  return CHALLENGES[start];
}

export function challengeProgress(state, today) {
  const c = challengeFor(state, today);
  const keys = keysBetween(weekStart(today), today);
  const done = Math.min(c.target, c.count(state, keys));
  return { id: c.id, title: c.title, target: c.target, done, completed: done >= c.target };
}

// Bilan de la semaine : une victoire, un point à améliorer, un objectif.
export function weeklyReview(state, today) {
  const p = state.profile || {};
  const keys = keysBetween(weekStart(today), today);
  const training = weekTraining(state, today);
  const sleeps = keys.map((k) => state.days[k]?.sleep).filter((v) => v != null);
  const sleepAvg = sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null;
  const steps = keys.map((k) => state.days[k]?.steps).filter((v) => v != null);
  const stepsAvg = steps.length ? steps.reduce((a, b) => a + b, 0) / steps.length : null;
  const relapses = state.habits.filter((h) => !h.archived).reduce((n, h) => n + keys.filter((k) => h.log?.[k] === 'fail').length, 0);

  let win = 'Tu as continué à noter ta semaine : c’est déjà une victoire.';
  if (training.done >= training.goal && training.goal > 0) win = `Tu as fait ${training.done} séance${training.done > 1 ? 's' : ''} sur ${training.goal} prévues.`;
  else if (relapses === 0 && state.habits.some((h) => !h.archived)) win = 'Aucune rechute cette semaine.';
  else if (stepsAvg && stepsAvg >= (p.stepsGoal || 7000)) win = `Tes pas ont dépassé ton objectif (${Math.round(stepsAvg)} par jour en moyenne).`;

  let improve = 'Rien d’important à corriger : continue sur ta lancée.';
  let objective = 'Garder le rythme de cette semaine.';
  if (sleepAvg != null && sleepAvg < (p.sleepGoal || 7.5) - 0.5) {
    improve = `Ton sommeil est court (${sleepAvg.toFixed(1).replace('.', ',')} h en moyenne).`;
    objective = `Viser ${p.sleepGoal || 7.5} h de sommeil pendant 4 nuits.`;
  } else if (training.done < training.goal) {
    improve = `Il manque ${training.goal - training.done} séance${training.goal - training.done > 1 ? 's' : ''} pour atteindre ton objectif.`;
    objective = `Planifier ${training.goal} séances la semaine prochaine.`;
  } else if (relapses > 0) {
    improve = `${relapses} rechute${relapses > 1 ? 's' : ''} cette semaine.`;
    objective = 'Repérer le déclencheur et préparer une alternative.';
  }
  return { win, improve, objective };
}

// Prochain dimanche à l'heure choisie (19 h par défaut) (aujourd'hui s'il n'est pas encore passé).
export function nextSundayEvening(now = new Date(), time = '19:00') {
  const offset = (7 - now.getDay()) % 7;
  const at = new Date(now);
  at.setDate(now.getDate() + offset);
  const [h, m] = time.split(':').map(Number);
  at.setHours(h, m, 0, 0);
  if (offset === 0 && at <= now) at.setDate(at.getDate() + 7);
  return { at };
}
