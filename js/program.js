// Programme sportif : séance du jour, niveau et construction des séances.
import { addDays, diffDays, weekday, weekStart } from './dates.js';
import { lastPerformance } from './calc.js';
import {
  CARDIO_MINUTES, GYM_EXERCISES, GYM_REST, GYM_SESSIONS, HOME_EXERCISES, HOME_REST, HOME_SESSIONS, WEEK_PLAN,
} from './data/exercises.js';

export const LEVEL_NAMES = ['Découverte', 'Progression', 'Confirmation', 'Endurance'];

// Niveau maison : choisi à la main, sinon +1 toutes les 2 semaines (max 4).
export function homeLevel(program, today) {
  if (program.level) return program.level;
  return Math.min(4, 1 + Math.floor(Math.max(0, diffDays(program.startDate, today)) / 14));
}

// Les séances de renfo alternent A / B : semaine 1 = A B A, semaine 2 = B A B…
function strengthSession(key, program) {
  const week = Math.floor(diffDays(weekStart(program.startDate), weekStart(key)) / 7);
  const slot = { 1: 0, 3: 1, 5: 2 }[weekday(key)] ?? 0;
  return (((week * 3 + slot) % 2) + 2) % 2 === 0 ? 'A' : 'B';
}

export function planForDate(key, program) {
  const level = homeLevel(program, key);
  const { type } = WEEK_PLAN[weekday(key)];
  if (type === 'strength') {
    const session = strengthSession(key, program);
    return {
      type, session, level, icon: '💪',
      title: `Renforcement — séance ${session}`,
      text: program.place === 'gym'
        ? 'Full body en salle, environ 45 min.'
        : `Circuit au poids du corps, environ 20 à 30 min (niveau ${level}).`,
    };
  }
  if (type === 'cardio') {
    const minutes = CARDIO_MINUTES[level - 1];
    return {
      type, level, minutes, icon: '🏃',
      title: `Cardio — ${minutes} min`,
      text: 'Marche rapide, vélo, elliptique ou natation, à une allure où tu peux parler mais pas chanter.',
    };
  }
  if (type === 'active_rest') {
    return { type, level, icon: '🚶', title: 'Repos actif', text: '20 à 30 min de marche tranquille ou d’étirements.' };
  }
  return { type, level, icon: '😴', title: 'Repos', text: 'Journée de récupération : c’est pendant le repos que le corps progresse.' };
}

const makeSets = (n, target, kg = null) =>
  Array.from({ length: n }, () => ({ target, value: target, kg, done: false }));

export function buildHomeWorkout(session, level) {
  const exercises = HOME_SESSIONS[session]
    .map((item) => {
      const lv = item.levels[level - 1];
      if (!lv) return null;
      const id = Array.isArray(item.ex) ? item.ex[level - 1] : item.ex;
      const ex = HOME_EXERCISES[id];
      return { name: ex.name, mode: ex.mode, perSide: !!ex.perSide, sets: makeSets(lv[0], lv[1]) };
    })
    .filter(Boolean);
  return { kind: 'home', title: `Maison — séance ${session}`, rest: HOME_REST[level - 1], exercises };
}

export function buildGymWorkout(session, state, today) {
  const exercises = GYM_SESSIONS[session].map((item) => {
    const ex = GYM_EXERCISES[item.ex];
    const last = lastPerformance(state, ex.name, today);
    const kg = last ? last.sets.find((s) => s.kg != null)?.kg ?? null : null;
    return { name: ex.name, mode: ex.mode, perSide: !!ex.perSide, sets: makeSets(item.sets, item.target, ex.mode === 'reps' ? kg : null) };
  });
  return { kind: 'gym', title: `Salle — séance ${session}`, rest: GYM_REST, exercises };
}

export function newExercise(name, mode, perSide = false, sets = 3) {
  return { name, mode, perSide, sets: makeSets(sets, mode === 'time' ? 30 : 10) };
}

export function findExercise(name) {
  return Object.values(HOME_EXERCISES).find((e) => e.name === name)
    || Object.values(GYM_EXERCISES).find((e) => e.name === name)
    || null;
}

// Séances de la semaine (lundi → dimanche) par rapport à l'objectif réglé dans les réglages.
// Un jour de repos choisi (day.rest) n'est plus attendu : l'objectif se réduit d'autant,
// sans pouvoir descendre sous le nombre de jours d'entraînement restants.
export const isTrainingType = (type) => type === 'strength' || type === 'cardio';

export function weekTraining(state, today) {
  const monday = weekStart(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const expectable = days.filter((k) => isTrainingType(WEEK_PLAN[weekday(k)].type) && !state.days[k]?.rest).length;
  const goal = Math.min(state.profile?.weekGoal ?? 5, expectable);
  const done = days.filter((k) => k <= today && (state.days[k]?.workouts || []).length).length;
  return { done, goal, remaining: Math.max(0, goal - done) };
}
