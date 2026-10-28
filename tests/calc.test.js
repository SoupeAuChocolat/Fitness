import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { addDays, diffDays, keysBetween, weekStart } from '../js/dates.js';
import {
  bmr, calorieTarget, defaultWaterGoal, frequentFoods, habitStats, kcalFromMet, lastPerformance, movingAverage,
  weekSummary, weightTrend,
} from '../js/calc.js';
import { computeBadges, checkNewBadges } from '../js/badges.js';
import { buildGymWorkout, buildHomeWorkout, homeLevel, planForDate } from '../js/program.js';
import { emptyState } from '../js/store.js';

const profile = {
  sex: 'm', birthYear: 1991, heightCm: 180, startWeight: 90, goalWeight: 80,
  activity: 1.375, rate: 0.5, kcalOverride: null, waterGoal: 10, glassMl: 250, sleepGoal: 7.5, stepsGoal: 7000,
};

test('dates : ajout, écart et début de semaine', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(diffDays('2026-03-28', '2026-03-30'), 2); // passage à l'heure d'été
  assert.equal(diffDays('2026-10-30', '2026-10-25'), -5);
  assert.equal(weekStart('2026-10-28'), '2026-10-26'); // mercredi → lundi
  assert.equal(weekStart('2026-11-01'), '2026-10-26'); // dimanche → lundi précédent
  assert.deepEqual(keysBetween('2026-10-30', '2026-11-02'), ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
});

test('métabolisme de base (Mifflin-St Jeor)', () => {
  assert.equal(bmr({ sex: 'm', weight: 90, height: 180, age: 35 }), 1855);
  assert.equal(bmr({ sex: 'f', weight: 70, height: 165, age: 40 }), 10 * 70 + 6.25 * 165 - 200 - 161);
});

test('objectif calorique : déficit, plancher et maintien', () => {
  const t = calorieTarget(profile, 90, '2026-10-28');
  assert.equal(t.bmr, 1855);
  assert.equal(t.tdee, 2551);
  assert.equal(t.target, 2000); // 2550,6 − 550 arrondi à 10
  assert.equal(t.capped, false);

  const small = { ...profile, sex: 'f', heightCm: 155, birthYear: 1966, activity: 1.2, rate: 0.75, goalWeight: 52 };
  const s = calorieTarget(small, 60, '2026-10-28');
  assert.ok(s.capped);
  assert.ok(s.target >= 1200);
  assert.ok(s.tdee - s.target <= s.tdee * 0.25 + 10);

  const reached = calorieTarget(profile, 79, '2026-10-28');
  assert.ok(reached.maintenance);
  assert.equal(reached.target, Math.round(reached.tdee / 10) * 10);

  assert.equal(calorieTarget({ ...profile, kcalOverride: 1800 }, 90, '2026-10-28').target, 1800);
});

test('eau et MET', () => {
  assert.equal(defaultWaterGoal(90), 11);
  assert.equal(defaultWaterGoal(40), 6);
  assert.equal(kcalFromMet(4.3, 90, 30), 194);
});

test('habitudes : série, record, total et économies', () => {
  const h = {
    startDate: '2026-10-01', costPerDay: 2, unitsPerDay: 10,
    log: { '2026-10-05': 'fail', '2026-10-20': 'fail', '2026-10-27': 'ok' },
    urges: [{ trigger: 'Stress' }, { trigger: 'Stress' }], relapses: [{ trigger: 'Ennui' }],
  };
  const s = habitStats(h, '2026-10-28');
  // dernière rechute le 20 → série depuis le 21 : 21..27 = 7 jours complets
  assert.equal(s.current, 7);
  // segments : 1..4 (4 j), 6..19 (14 j), 21..27 (7 j)
  assert.equal(s.best, 14);
  // 27 jours écoulés (1er → 27) − 2 rechutes
  assert.equal(s.totalClean, 25);
  assert.equal(s.money, 50);
  assert.equal(s.units, 250);
  assert.equal(s.next, 14);
  assert.equal(s.urgesResisted, 2);
  assert.deepEqual(s.triggers[0], ['Stress', 2]);

  const todayOk = habitStats({ ...h, log: { ...h.log, '2026-10-28': 'ok' } }, '2026-10-28');
  assert.equal(todayOk.current, 8);

  const todayFail = habitStats({ ...h, log: { ...h.log, '2026-10-28': 'fail' } }, '2026-10-28');
  assert.equal(todayFail.current, 0);

  const fresh = habitStats({ startDate: '2026-10-28', log: {} }, '2026-10-28');
  assert.equal(fresh.current, 0);
  assert.equal(fresh.next, 1);
});

test('moyenne glissante et tendance de poids', () => {
  const pts = Array.from({ length: 21 }, (_, i) => ({ x: addDays('2026-10-01', i), y: 90 - i * 0.1 }));
  const ma = movingAverage(pts, 7);
  assert.equal(ma[0].y, 90);
  assert.ok(Math.abs(ma[6].y - 89.7) < 1e-9);
  const t = weightTrend(pts, 85, '2026-10-21');
  assert.ok(Math.abs(t.perWeek + 0.7) < 1e-9);
  assert.equal(t.goalDate, addDays('2026-10-21', 30));
  assert.equal(weightTrend(pts.slice(0, 3), 85, '2026-10-21'), null);
});

test('programme : alternance A/B et niveaux', () => {
  const program = { startDate: '2026-10-26', level: null, place: 'home' }; // lundi
  assert.equal(planForDate('2026-10-26', program).session, 'A');
  assert.equal(planForDate('2026-10-28', program).session, 'B');
  assert.equal(planForDate('2026-10-30', program).session, 'A');
  assert.equal(planForDate('2026-11-02', program).session, 'B'); // semaine 2 : B A B
  assert.equal(planForDate('2026-10-27', program).type, 'cardio');
  assert.equal(planForDate('2026-11-01', program).type, 'rest');
  assert.equal(homeLevel(program, '2026-10-26'), 1);
  assert.equal(homeLevel(program, '2026-11-09'), 2);
  assert.equal(homeLevel(program, '2027-06-01'), 4);
  assert.equal(homeLevel({ ...program, level: 3 }, '2026-10-26'), 3);

  const l1 = buildHomeWorkout('B', 1);
  assert.ok(!l1.exercises.some((e) => e.name === 'Burpee sans saut'));
  assert.ok(buildHomeWorkout('B', 3).exercises.some((e) => e.name === 'Burpee sans saut'));
  assert.equal(buildHomeWorkout('A', 4).exercises[1].name, 'Pompes sur les genoux');
});

test('salle : reprend la dernière charge utilisée', () => {
  const state = emptyState();
  state.profile = profile;
  state.days['2026-10-20'] = { workouts: [{ exercises: [{ name: 'Presse à cuisses', sets: [{ reps: 12, kg: 60 }] }] }] };
  assert.deepEqual(lastPerformance(state, 'Presse à cuisses', '2026-10-28'), { date: '2026-10-20', sets: [{ reps: 12, kg: 60 }] });
  const w = buildGymWorkout('A', state, '2026-10-28');
  assert.equal(w.exercises[0].sets[0].kg, 60);
  assert.equal(w.exercises[1].sets[0].kg, null);
});

test('aliments fréquents et bilan de semaine', () => {
  const state = emptyState();
  state.profile = profile;
  state.habits = [{ id: 'h', name: 'Tabac', icon: '🚭', startDate: '2026-10-01', log: { '2026-10-27': 'fail' } }];
  state.days['2026-10-26'] = { weight: 89, meals: [{ name: 'Pomme', qty: '1', kcal: 80 }, { name: 'Pâtes', qty: '200 g', kcal: 290 }], water: 8 };
  state.days['2026-10-27'] = { weight: 88.6, meals: [{ name: 'Pomme', qty: '1', kcal: 80 }], workouts: [{ minutes: 30, kcal: 200 }] };
  const freq = frequentFoods(state, '2026-10-28');
  assert.equal(freq[0].name, 'Pomme');
  assert.equal(freq[0].n, 2);

  const sum = weekSummary(state, '2026-10-26', '2026-10-28', () => 2000);
  assert.equal(sum.days, 3);
  assert.ok(Math.abs(sum.weightAvg - 88.8) < 1e-9);
  assert.equal(sum.kcalAvg, 225);
  assert.equal(sum.underTarget, 2);
  assert.equal(sum.workouts, 1);
  assert.equal(sum.sportMin, 30);
  assert.deepEqual([sum.habits[0].clean, sum.habits[0].fails], [2, 1]);
});

test('badges : obtention et mémorisation', () => {
  const state = emptyState();
  state.profile = profile;
  state.days['2026-10-28'] = { weight: 88.5 };
  const fresh = checkNewBadges(state, '2026-10-28');
  const ids = fresh.map((b) => b.id);
  assert.ok(ids.includes('weigh_1'));
  assert.ok(ids.includes('loss_1'));
  assert.ok(!ids.includes('loss_2'));
  assert.equal(checkNewBadges(state, '2026-10-28').length, 0);
  assert.ok(computeBadges(state, '2026-10-28').some((b) => b.id === 'loss_10'));
});

test('le service worker met en cache des fichiers qui existent', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const assets = [...sw.matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]).filter((a) => a !== './');
  assert.ok(assets.length > 20);
  for (const a of assets) assert.ok(existsSync(new URL(`../${a}`, import.meta.url)), `manquant : ${a}`);
});
