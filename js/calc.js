// Calculs purs (sans DOM) : objectifs caloriques, tendances, séries, habitudes.
import { addDays, diffDays, keysBetween, parseKey, toKey } from './dates.js';
import { MILESTONES } from './data/habits.js';

export const ACTIVITY_LEVELS = [
  { v: 1.2, label: 'Sédentaire', desc: 'Travail assis, peu de marche' },
  { v: 1.375, label: 'Légèrement actif', desc: 'Un peu de marche, sport 1 à 2 fois par semaine' },
  { v: 1.55, label: 'Actif', desc: 'Souvent debout ou sport 3 à 4 fois par semaine' },
  { v: 1.725, label: 'Très actif', desc: 'Travail physique ou sport presque tous les jours' },
];

export const RATES = [
  { v: 0.25, label: 'Doux', desc: '−0,25 kg / semaine' },
  { v: 0.5, label: 'Recommandé', desc: '−0,5 kg / semaine' },
  { v: 0.75, label: 'Soutenu', desc: '−0,75 kg / semaine' },
];

export const round = (n, step = 1) => Math.round(n / step) * step;
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const sum = (arr, f) => arr.reduce((s, x) => s + (Number(x[f]) || 0), 0);
const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);

export const ageOf = (profile, today) => Number(today.slice(0, 4)) - profile.birthYear;

// Métabolisme de base, formule de Mifflin-St Jeor.
export function bmr({ sex, weight, height, age }) {
  return 10 * weight + 6.25 * height - 5 * age + (sex === 'f' ? -161 : 5);
}

export function calorieTarget(profile, weight, today) {
  const base = bmr({ sex: profile.sex, weight, height: profile.heightCm, age: ageOf(profile, today) });
  const tdee = base * profile.activity;
  const floor = profile.sex === 'f' ? 1200 : 1500;
  const maintenance = weight <= profile.goalWeight;
  let deficit = maintenance ? 0 : (profile.rate * 7700) / 7;
  let capped = false;
  if (deficit > tdee * 0.25) {
    deficit = tdee * 0.25;
    capped = true;
  }
  let target = tdee - deficit;
  if (target < floor) {
    target = Math.min(floor, tdee);
    capped = true;
  }
  const auto = round(target, 10);
  const manual = profile.kcalOverride > 0;
  return {
    bmr: Math.round(base),
    tdee: Math.round(tdee),
    auto,
    target: manual ? profile.kcalOverride : auto,
    deficit: Math.round(tdee - auto),
    capped,
    maintenance,
    manual,
  };
}

// --- Pas -------------------------------------------------------------------------
// Longueur de pas estimée à partir de la taille (≈ 41,5 % chez l'homme, 41,3 % chez la femme).
export const strideMeters = (profile) => (profile.heightCm / 100) * (profile.sex === 'f' ? 0.413 : 0.415);

// Distance estimée en kilomètres.
export const stepsKm = (steps, profile) => (steps * strideMeters(profile)) / 1000;

// Coût net de la marche, équation métabolique de l'ACSM : 0,1 ml d'O2 par kg et par mètre,
// soit ≈ 0,5 kcal par kg et par km (1 litre d'O2 ≈ 5 kcal). Le métabolisme de repos,
// déjà compté dans la dépense de base, n'est pas inclus.
export function walkingKcal(steps, profile, weight) {
  const km = (steps * strideMeters(profile)) / 1000;
  return Math.round(0.5 * weight * km);
}

// Les ~4 000 premiers pas de la journée sont déjà inclus dans la dépense « sédentaire ».
export const STEP_BASELINE = 4000;

export const proteinTarget = (profile) => profile.proteinGoal || Math.round((profile.goalWeight * 1.6) / 5) * 5;

// Objectif calorique du jour. En mode « budget », la base est celle d'une journée
// sédentaire et les pas au-delà de STEP_BASELINE s'ajoutent.
export function dailyTarget(state, key) {
  const p = state.profile;
  const weight = currentWeight(state, key);
  const steps = state.days[key]?.steps || 0;
  const budget = p.stepsMode !== 'info';
  const base = calorieTarget(budget ? { ...p, activity: 1.2 } : p, weight, key);
  const bonus = budget ? walkingKcal(Math.max(0, steps - STEP_BASELINE), p, weight) : 0;
  return {
    ...base,
    base: base.target,
    bonus,
    target: base.target + bonus,
    steps,
    walkKcal: walkingKcal(steps, p, weight),
    protein: proteinTarget(p),
  };
}

export const defaultWaterGoal = (weight, glassMl = 250) => clamp(Math.round((weight * 30) / glassMl), 6, 14);

export const bmi = (weight, heightCm) => weight / (heightCm / 100) ** 2;

export function bmiLabel(v) {
  if (v < 18.5) return 'Insuffisance pondérale';
  if (v < 25) return 'Corpulence normale';
  if (v < 30) return 'Surpoids';
  if (v < 35) return 'Obésité modérée';
  if (v < 40) return 'Obésité sévère';
  return 'Obésité massive';
}

export const kcalFromMet = (met, weightKg, minutes) => Math.round((met * weightKg * minutes) / 60);

export function dayTotals(day = {}) {
  const meals = day.meals || [];
  const workouts = day.workouts || [];
  return {
    eaten: Math.round(sum(meals, 'kcal')),
    prot: Math.round(sum(meals, 'prot')),
    carb: Math.round(sum(meals, 'carb')),
    fat: Math.round(sum(meals, 'fat')),
    // nombre d'aliments sans valeurs nutritionnelles détaillées
    noMacros: meals.filter((m) => m.prot == null).length,
    burned: Math.round(sum(workouts, 'kcal')),
    sportMin: Math.round(sum(workouts, 'minutes')),
    items: meals.length,
  };
}

// Série chronologique d'un champ numérique des journées (ex. 'weight', 'waist').
export function series(state, field) {
  return Object.keys(state.days)
    .sort()
    .filter((k) => state.days[k][field] != null)
    .map((k) => ({ x: k, y: state.days[k][field] }));
}

export function latestValue(state, field, upTo) {
  const keys = Object.keys(state.days).sort();
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i] <= upTo && state.days[keys[i]][field] != null) return state.days[keys[i]][field];
  }
  return null;
}

export const currentWeight = (state, upTo) => latestValue(state, 'weight', upTo) ?? state.profile.startWeight;

// Moyenne glissante sur `window` jours calendaires.
export function movingAverage(points, window = 7) {
  return points.map((p, i) => {
    let s = 0;
    let n = 0;
    for (let j = i; j >= 0 && diffDays(points[j].x, p.x) < window; j--) {
      s += points[j].y;
      n++;
    }
    return { x: p.x, y: s / n };
  });
}

// Tendance (régression linéaire) sur les 4 dernières semaines et date estimée d'objectif.
export function weightTrend(points, goal, today) {
  const recent = points.filter((p) => p.x <= today && diffDays(p.x, today) <= 28);
  if (recent.length < 4) return null;
  const first = recent[0].x;
  const last = recent[recent.length - 1].x;
  if (diffDays(first, last) < 7) return null;
  const xs = recent.map((p) => diffDays(first, p.x));
  const ys = recent.map((p) => p.y);
  const mx = avg(xs);
  const my = avg(ys);
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my);
    den += (x - mx) ** 2;
  });
  const slope = num / den;
  const fitted = my + slope * (xs[xs.length - 1] - mx);
  let goalDate = null;
  if (slope < -0.005 && fitted > goal) {
    const days = Math.ceil((fitted - goal) / -slope);
    if (days < 3 * 365) goalDate = addDays(last, days);
  }
  return { perWeek: slope * 7, goalDate };
}

// Statistiques d'une habitude à arrêter.
// Un jour sans check-in compte comme « tenu » ; seul « craqué » remet la série à zéro.
export function habitStats(habit, today) {
  const start = habit.startDate;
  const log = habit.log || {};
  const fails = Object.keys(log)
    .filter((k) => log[k] === 'fail' && k >= start && k <= today)
    .sort();
  const todayOk = log[today] === 'ok';
  const lastFail = fails.length ? fails[fails.length - 1] : null;
  const cleanStart = lastFail ? addDays(lastFail, 1) : start;
  const current = Math.max(0, diffDays(cleanStart, today)) + (todayOk ? 1 : 0);

  let best = current;
  let prev = start;
  for (const f of fails) {
    best = Math.max(best, diffDays(prev, f));
    prev = addDays(f, 1);
  }

  const elapsed = Math.max(0, diffDays(start, today)) + (todayOk ? 1 : 0);
  const totalClean = Math.max(0, elapsed - fails.filter((f) => f < today).length);

  const next = MILESTONES.find((m) => m > current) ?? (Math.floor(current / 365) + 1) * 365;
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= current) ?? 0;
  const span = next - prevMilestone;

  const triggers = {};
  for (const e of [...(habit.urges || []), ...(habit.relapses || [])]) {
    if (e.trigger) triggers[e.trigger] = (triggers[e.trigger] || 0) + 1;
  }

  return {
    current,
    best,
    totalClean,
    lastFail,
    cleanStart,
    relapses: fails.length,
    todayStatus: log[today] || null,
    next,
    toNext: next - current,
    progress: span > 0 ? (current - prevMilestone) / span : 1,
    money: totalClean * (habit.costPerDay || 0),
    units: Math.round(totalClean * (habit.unitsPerDay || 0)),
    urgesResisted: (habit.urges || []).length,
    triggers: Object.entries(triggers).sort((a, b) => b[1] - a[1]),
  };
}

// Instant (ms) depuis lequel l'habitude est tenue, pour la frise santé.
export function cleanSinceMs(habit, stats) {
  if (stats.lastFail) {
    const rel = (habit.relapses || []).filter((r) => r.date === stats.lastFail && r.at);
    if (rel.length) return rel[rel.length - 1].at;
    return parseKey(addDays(stats.lastFail, 1)).getTime();
  }
  if (habit.startedAt && toKey(new Date(habit.startedAt)) === habit.startDate) return habit.startedAt;
  return parseKey(habit.startDate).getTime();
}

// Brossage de dents : un jour est réussi quand les 3 brossages sont cochés.
export const teethDone = (day) => !!day?.teeth && day.teeth.filter(Boolean).length === 3;

export function teethStats(state, today) {
  let current = teethDone(state.days[today]) ? 1 : 0;
  for (let k = addDays(today, -1); teethDone(state.days[k]); k = addDays(k, -1)) current++;
  let best = 0;
  let run = 0;
  let prev = null;
  let total = 0;
  for (const k of Object.keys(state.days).sort()) {
    if (k > today || !teethDone(state.days[k])) continue;
    total++;
    run = prev && diffDays(prev, k) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return { current, best, total };
}

// Dernière performance enregistrée pour un exercice (pour la progression en salle).
export function lastPerformance(state, name, upTo) {
  const keys = Object.keys(state.days)
    .filter((k) => k <= upTo)
    .sort()
    .reverse();
  for (const k of keys) {
    const workouts = state.days[k].workouts || [];
    for (let i = workouts.length - 1; i >= 0; i--) {
      const ex = (workouts[i].exercises || []).find((e) => e.name === name && e.sets && e.sets.length);
      if (ex) return { date: k, sets: ex.sets };
    }
  }
  return null;
}

// Aliments les plus souvent ajoutés ces 60 derniers jours.
export function frequentFoods(state, today, limit = 12) {
  const map = new Map();
  for (const k of keysBetween(addDays(today, -60), today)) {
    for (const m of state.days[k]?.meals || []) {
      const id = `${m.name}|${m.qty || ''}`;
      const e = map.get(id) || { name: m.name, qty: m.qty, n: 0 };
      e.n++;
      Object.assign(e, { kcal: m.kcal, prot: m.prot ?? null, carb: m.carb ?? null, fat: m.fat ?? null, last: k });
      map.set(id, e);
    }
  }
  return [...map.values()].sort((a, b) => b.n - a.n || (a.last < b.last ? 1 : -1)).slice(0, limit);
}

// Bilan d'une semaine (lundi → dimanche), limité à aujourd'hui.
export function weekSummary(state, start, today, targetFor) {
  const end = addDays(start, 6);
  if (start > today) return null;
  const keys = keysBetween(start, end < today ? end : today);
  const days = keys.map((k) => [k, state.days[k] || {}]);
  const pick = (f) => days.map(([, d]) => d[f]).filter((v) => v != null);
  const mealDays = days.filter(([, d]) => d.meals && d.meals.length);
  const kcals = mealDays.map(([, d]) => dayTotals(d).eaten);
  const prots = mealDays.map(([, d]) => dayTotals(d).prot);
  const workouts = days.flatMap(([, d]) => d.workouts || []);

  const habits = state.habits
    .filter((h) => !h.archived && h.startDate <= keys[keys.length - 1])
    .map((h) => {
      const tracked = keys.filter((k) => k >= h.startDate);
      const fails = tracked.filter((k) => h.log?.[k] === 'fail').length;
      return { habit: h, days: tracked.length, clean: tracked.length - fails, fails };
    });

  return {
    start,
    end,
    days: keys.length,
    weightAvg: avg(pick('weight')),
    kcalAvg: kcals.length ? Math.round(avg(kcals)) : null,
    protAvg: prots.length ? Math.round(avg(prots)) : null,
    teethDays: days.filter(([, d]) => teethDone(d)).length,
    mealDays: mealDays.length,
    underTarget: mealDays.filter(([k, d]) => dayTotals(d).eaten <= targetFor(k)).length,
    workouts: workouts.length,
    sportMin: Math.round(sum(workouts, 'minutes')),
    burned: Math.round(sum(workouts, 'kcal')),
    waterAvg: avg(pick('water')),
    sleepAvg: avg(pick('sleep')),
    stepsAvg: avg(pick('steps')),
    habits,
  };
}
