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

// --- Version 2 : pas, macros, Connexion Santé, rappels, aliments, exercices -----------

test('calories des pas (ACSM) et objectif du jour', async () => {
  const { walkingKcal, dailyTarget, proteinTarget, STEP_BASELINE } = await import('../js/calc.js');
  // 10 000 pas × 0,7387 m = 7,39 km ; 0,5 × 95 kg × 7,39 km ≈ 351 kcal
  assert.equal(walkingKcal(10000, { heightCm: 178, sex: 'm' }, 95), 351);
  assert.equal(walkingKcal(0, { heightCm: 178, sex: 'm' }, 95), 0);

  const state = emptyState();
  state.profile = { ...profile, heightCm: 178, stepsMode: 'budget' };
  state.days['2026-10-28'] = { steps: 9000 };
  const t = dailyTarget(state, '2026-10-28');
  assert.equal(t.bonus, walkingKcal(9000 - STEP_BASELINE, state.profile, 90));
  assert.equal(t.target, t.base + t.bonus);
  // base calculée comme une journée sédentaire (facteur 1,2)
  assert.ok(Math.abs(t.tdee - t.bmr * 1.2) <= 1);

  state.profile.stepsMode = 'info';
  const info = dailyTarget(state, '2026-10-28');
  assert.equal(info.bonus, 0);
  assert.equal(info.target, calorieTarget(state.profile, 90, '2026-10-28').target);
  assert.equal(proteinTarget(profile), 130); // 80 kg × 1,6 = 128 → arrondi à 5 g
  assert.equal(proteinTarget({ ...profile, proteinGoal: 110 }), 110);
});

test('totaux du jour avec macros', async () => {
  const { dayTotals } = await import('../js/calc.js');
  const t = dayTotals({ meals: [{ kcal: 300, prot: 20, carb: 30, fat: 10 }, { kcal: 100 }] });
  assert.deepEqual([t.eaten, t.prot, t.carb, t.fat, t.noMacros], [400, 20, 30, 10, 1]);
});

test('brossage de dents : série et record', async () => {
  const { teethStats } = await import('../js/calc.js');
  const state = emptyState();
  const all = [true, true, true];
  state.days['2026-10-20'] = { teeth: all };
  state.days['2026-10-21'] = { teeth: all };
  state.days['2026-10-22'] = { teeth: all };
  state.days['2026-10-26'] = { teeth: all };
  state.days['2026-10-27'] = { teeth: all };
  state.days['2026-10-28'] = { teeth: [true, false, true] };
  assert.deepEqual(teethStats(state, '2026-10-28'), { current: 2, best: 3, total: 5 });
  state.days['2026-10-28'].teeth = all;
  assert.equal(teethStats(state, '2026-10-28').current, 3);
});

test('Connexion Santé : import sans écraser les saisies manuelles', async () => {
  const { applyHealthData } = await import('../js/health.js');
  const state = emptyState();
  state.days['2026-10-27'] = { steps: 5000, manual: { steps: true } };
  const changed = applyHealthData(state, {
    steps: [{ date: '2026-10-27', steps: 8000 }, { date: '2026-10-28', steps: 4321 }, { date: '2026-10-26', steps: 0 }],
    sleep: [{ date: '2026-10-28', minutes: 445 }],
  });
  assert.equal(changed, 2);
  assert.equal(state.days['2026-10-27'].steps, 5000);
  assert.equal(state.days['2026-10-28'].steps, 4321);
  assert.equal(state.days['2026-10-28'].sleep, 7.4);
  assert.deepEqual(state.days['2026-10-28'].sync, { steps: true, sleep: true });
  assert.equal(state.days['2026-10-26'], undefined);
});

test('rappels : notifications construites', async () => {
  const { buildNotifications } = await import('../js/reminders.js');
  const { DEFAULT_REMINDERS } = await import('../js/store.js');
  const list = buildNotifications(DEFAULT_REMINDERS);
  const ids = list.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
  // bilan 1 + eau 9h→19h toutes les 2 h (6) + sport lun→sam (6) + dents 3
  assert.equal(list.length, 1 + 6 + 6 + 3);
  const monday = list.find((n) => n.id === 301);
  assert.deepEqual(monday.schedule.on, { weekday: 2, hour: 18, minute: 0 }); // 2 = lundi pour Capacitor
  assert.ok(!list.some((n) => n.id === 300)); // pas de rappel le dimanche (repos)
  assert.deepEqual(list.find((n) => n.id === 402).schedule.on, { hour: 22, minute: 0 });
  const off = buildNotifications({ ...DEFAULT_REMINDERS, water: { ...DEFAULT_REMINDERS.water, on: false }, sport: { ...DEFAULT_REMINDERS.sport, on: false } });
  assert.equal(off.length, 4);
});

test('aliments : table CIQUAL, aliments courants et code-barres', async () => {
  const { COMMON_FOODS, CIQUAL_FOODS, searchFoods, portionValues } = await import('../js/foods.js');
  const { productToFood } = await import('../js/barcode.js');
  assert.ok(CIQUAL_FOODS.length > 3000);
  assert.ok(COMMON_FOODS.every((f) => f.k >= 0 && f.prot != null));
  const rice = COMMON_FOODS.find((f) => f.n === 'Riz blanc');
  assert.deepEqual(portionValues(rice, { grams: 100 }), { kcal: 145, prot: 2.9, carb: 31.8, fat: 0.4 });
  assert.equal(searchFoods(COMMON_FOODS, 'pates cuites')[0].n, 'Pâtes');
  assert.match(searchFoods(CIQUAL_FOODS, 'pomme crue')[0].n, /^Pomme/);
  const food = productToFood('123', {
    product_name_fr: 'Biscuits', brands: 'Marque, Autre', serving_quantity: '25',
    nutriments: { 'energy-kcal_100g': 480, proteins_100g: 6, carbohydrates_100g: 70, fat_100g: 20 },
  });
  assert.deepEqual([food.n, food.k, food.serving, food.prot], ['Biscuits (Marque)', 480, 25, 6]);
  assert.equal(productToFood('1', { product_name: 'X', nutriments: { energy_100g: 418.4 } }).k, 100);
});

test('chaque exercice a une photo ou une animation', async () => {
  const { HOME_EXERCISES, GYM_EXERCISES } = await import('../js/data/exercises.js');
  const { exerciseId, PHOTO_IDS } = await import('../js/exmedia.js');
  const { ANIMATIONS } = await import('../js/stick.js');
  for (const e of [...Object.values(HOME_EXERCISES), ...Object.values(GYM_EXERCISES)]) {
    const id = exerciseId(e.name);
    assert.ok(PHOTO_IDS.has(id) || ANIMATIONS[id], `pas de visuel pour ${e.name}`);
  }
  for (const id of PHOTO_IDS) {
    for (const i of [0, 1]) assert.ok(existsSync(new URL(`../img/ex/${id}-${i}.jpg`, import.meta.url)), `photo manquante ${id}-${i}`);
  }
});

test('tous les modules JS sont mis en cache hors ligne', async () => {
  const { readdirSync } = await import('node:fs');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const dirs = ['js', 'js/data', 'js/views'];
  for (const d of dirs) {
    for (const f of readdirSync(new URL(`../${d}`, import.meta.url)).filter((x) => x.endsWith('.js'))) {
      assert.ok(sw.includes(`'${d}/${f}'`), `${d}/${f} absent de sw.js`);
    }
  }
});

test('km estimés et séances de la semaine', async () => {
  const { stepsKm } = await import('../js/calc.js');
  const { weekTraining } = await import('../js/program.js');
  // 10 000 pas × 0,7387 m ≈ 7,4 km pour 178 cm
  assert.ok(Math.abs(stepsKm(10000, { heightCm: 178, sex: 'm' }) - 7.39) < 0.01);

  const state = emptyState();
  // semaine du lundi 26 oct 2026 : séances lun, mar, mer, sam (planifiées ou non)
  state.days['2026-10-26'] = { workouts: [{ title: 'x' }] };
  state.days['2026-10-27'] = { workouts: [{ title: 'x' }] };
  state.days['2026-10-28'] = { workouts: [{ title: 'x' }] };
  state.days['2026-10-29'] = { workouts: [] };
  assert.deepEqual(weekTraining(state, '2026-10-29'), { done: 3, goal: 5, remaining: 2 });
  state.days['2026-10-31'] = { workouts: [{ title: 'x' }] };
  assert.deepEqual(weekTraining(state, '2026-11-01'), { done: 4, goal: 5, remaining: 1 });
  // objectif réglé à 3 : déjà atteint
  state.profile = { weekGoal: 3 };
  assert.deepEqual(weekTraining(state, '2026-11-01'), { done: 4, goal: 3, remaining: 0 });
  // un vendredi marqué « repos » sort de l'objectif
  state.profile = { weekGoal: 5 };
  state.days['2026-10-30'] = { rest: true };
  assert.deepEqual(weekTraining(state, '2026-11-01'), { done: 4, goal: 4, remaining: 0 });
});

test('prévision de la date d’objectif à partir de la vraie tendance', async () => {
  const { goalForecast } = await import('../js/calc.js');
  // -0,1 kg par jour, pas de bruit : 21 jours de pesées depuis le 1er octobre
  const pts = Array.from({ length: 21 }, (_, i) => ({ x: addDays('2026-10-01', i), y: 90 - i * 0.1 }));
  const f = goalForecast(pts, 80, '2026-10-21');
  assert.ok(Math.abs(f.perWeek + 0.7) < 1e-9);
  // dernière valeur 88 kg (21 octobre) ; il reste 8 kg à 0,1 kg/jour = 80 jours
  assert.equal(f.central, addDays('2026-10-21', 80));
  // sans bruit, la marge est nulle : fourchette réduite à une date
  assert.equal(f.early, f.central);
  assert.equal(goalForecast(pts, 95, '2026-10-21').reached, true);
  assert.equal(goalForecast(pts.slice(0, 3), 80, '2026-10-21'), null);
});

test('plateau : stagnation sur 3 semaines et conseil', async () => {
  const { plateauInfo } = await import('../js/calc.js');
  const state = emptyState();
  state.profile = { ...profile, weekGoal: 5 };
  // une pesée par jour pendant 21 jours, poids stable à 85
  for (let i = 0; i < 21; i++) {
    const k = addDays('2026-10-01', i);
    state.days[k] = { weight: 85 + (i % 2) * 0.1, meals: [{ kcal: 500 }] };
  }
  const info = plateauInfo(state, '2026-10-21');
  assert.equal(info.plateau, true);
  assert.equal(info.advice.kind, 'sport'); // aucune séance notée : ajouter du sport
  // poids qui baisse : pas de plateau
  for (let i = 0; i < 21; i++) state.days[addDays('2026-10-01', i)].weight = 85 - i * 0.1;
  assert.equal(plateauInfo(state, '2026-10-21').plateau, false);
});

test('sommeil et craquages : taux après nuit courte ou non', async () => {
  const { sleepVsFails } = await import('../js/calc.js');
  const state = emptyState();
  state.profile = profile;
  state.habits = [{ id: 'h', preset: 'sugar', name: 'Sucre', icon: '🍬', startDate: '2026-09-01', log: {} }];
  for (let i = 0; i < 20; i++) {
    const k = addDays('2026-10-01', i);
    const short = i % 2 === 0;
    state.days[k] = { sleep: short ? 5.5 : 7.5 };
    // craquage uniquement après nuit courte
    if (short && i % 4 === 0) state.habits[0].log[k] = 'fail';
  }
  const r = sleepVsFails(state, '2026-10-20');
  assert.equal(r.short.n, 10);
  assert.equal(r.ok.n, 10);
  assert.equal(r.ok.rate, 0);
  assert.ok(r.short.rate > 0);
  // pas assez de données : rien n'est affiché
  assert.equal(sleepVsFails(emptyState(), '2026-10-20'), null);
});

test('journal des modifications, plafonné à 300 entrées', async () => {
  const store = await import('../js/store.js');
  store.replace({ profile: profile, days: {} });
  for (let i = 0; i < 305; i++) store.update((s) => store.logChange('2026-10-28', 'steps', i, i + 1), { silent: true });
  const h = store.get().history;
  assert.equal(h.length, 300);
  assert.equal(h[0].from, 5);
  assert.equal(h[299].to, 305);
});

test('recettes : calories et macros par part', async () => {
  const { recipeTotals, recipeFood } = await import('../js/nutrition.js');
  // riz blanc cuit (code 9104 : 145 kcal/100 g) × 200 g, poulet cuit (36018, 110 kcal/100 g cru)… on vérifie le calcul par part
  const r = { id: 'r', name: 'Riz', parts: 2, ingredients: [{ code: 9104, name: 'Riz', grams: 200 }] };
  const t = recipeTotals(r);
  assert.equal(t.total.kcal, 290);
  assert.equal(t.perPart.kcal, 145);
  assert.equal(t.weight, 200);
  const food = recipeFood(r);
  assert.equal(food.k, 145);
  assert.equal(food.c, 'Mes recettes');
  // une recette sans ingrédient ne plante pas
  assert.equal(recipeTotals({ parts: 1, ingredients: [] }).perPart.kcal, 0);
});

test('liste de courses, réserve sorties et alerte protéines', async () => {
  const { shoppingList, eatOutReserve, proteinAlert } = await import('../js/nutrition.js');
  const state = emptyState();
  state.profile = { ...profile, eatOutPercent: 10 };
  state.days['2026-10-26'] = { meals: [{ name: 'Pain', kcal: 100 }, { name: 'Œuf', kcal: 70, eatOut: true }] };
  state.days['2026-10-28'] = { meals: [{ name: 'Pain', kcal: 100 }, { name: 'Pâtes', kcal: 300, eatOut: true }] };
  state.days['2026-10-20'] = { meals: [{ name: 'Ancien', kcal: 1 }] }; // semaine précédente : exclu
  const list = shoppingList(state, '2026-10-28');
  assert.deepEqual(list.map((i) => [i.name, i.count]), [['Pain', 2], ['Œuf', 1], ['Pâtes', 1]]);
  const res = eatOutReserve(state, '2026-10-28', 2000);
  assert.deepEqual([res.total, res.used, res.left], [1400, 370, 1030]);
  assert.equal(eatOutReserve({ profile: { eatOutPercent: 0 }, days: {} }, '2026-10-28', 2000).total, 0);
  const foods = [{ n: 'Poulet', p: '100 g', k: 165, prot: 31 }, { n: 'Pain', p: '1 tranche', k: 90, prot: 3 }, { n: 'Skyr', p: '150 g', k: 95, prot: 16 }];
  assert.equal(proteinAlert(60, 130, foods).missing, 70);
  assert.equal(proteinAlert(120, 130, foods), null);
  assert.equal(proteinAlert(60, 130, foods).picks[0].name, 'Poulet');
  assert.equal(proteinAlert(100, 130, foods), null); // au-dessus de 70 % : pas d'alerte
});

test('progression des charges : +2,5 kg quand la cible est atteinte', async () => {
  const { nextLoad } = await import('../js/program.js');
  const item = { sets: 3, target: 12 };
  const hit = { sets: [{ reps: 12, kg: 60 }, { reps: 12, kg: 60 }, { reps: 13, kg: 60 }] };
  assert.deepEqual(nextLoad(hit, item), { kg: 62.5, progressed: true });
  const miss = { sets: [{ reps: 12, kg: 60 }, { reps: 10, kg: 60 }, { reps: 12, kg: 60 }] };
  assert.deepEqual(nextLoad(miss, item), { kg: 60, progressed: false });
  // une série de moins que prévu : on garde la charge
  assert.deepEqual(nextLoad({ sets: [{ reps: 12, kg: 60 }] }, item), { kg: 60, progressed: false });
  // pas de charge enregistrée (exercice au poids du corps)
  assert.deepEqual(nextLoad({ sets: [{ reps: 12, kg: null }] }, item), { kg: null, progressed: false });
  assert.deepEqual(nextLoad(null, item), { kg: null, progressed: false });
});

test('échauffement adapté et séance d’étirements', async () => {
  const { warmupFor } = await import('../js/data/exercises.js');
  const { buildStretchWorkout, findExercise } = await import('../js/program.js');
  assert.notDeepEqual(warmupFor('gym'), warmupFor('home'));
  assert.equal(warmupFor('inconnu'), warmupFor('home'));
  const w = buildStretchWorkout();
  assert.equal(w.kind, 'stretch');
  assert.ok(w.exercises.length >= 5);
  assert.ok(w.exercises.every((e) => e.mode === 'time' && e.sets[0].target === 30));
  assert.ok(findExercise(w.exercises[0].name));
});

test('défi hebdomadaire et bilan du dimanche', async () => {
  const { challengeFor, challengeProgress, weeklyReview, CHALLENGES } = await import('../js/challenges.js');
  const { SUPPORT, GENERIC_SUPPORT } = await import('../js/data/support.js');
  const state = emptyState();
  state.profile = { ...profile, waterGoal: 8, sleepGoal: 7.5, stepsGoal: 7000, weekGoal: 5 };
  state.habits = [{ id: 'h', preset: 'sugar', name: 'Sucre', startDate: '2026-10-01', log: { '2026-10-26': 'fail' } }];
  // un défi par semaine, toujours valable
  const c = challengeFor(state, '2026-10-28');
  assert.ok(CHALLENGES.includes(c));
  assert.equal(challengeFor(state, '2026-10-28').id, c.id);
  // sans habitude sucre, le défi « sans sucre » n'est pas proposé
  const noSugar = { ...state, habits: [] };
  for (const d of ['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']) {
    assert.notEqual(challengeFor(noSugar, d).id, 'sans-sucre');
  }
  // progression : 4 jours avec des pas à 8 000
  const pas = { ...emptyState(), profile: state.profile, habits: [], days: {} };
  for (const k of ['2026-10-26', '2026-10-27', '2026-10-28']) pas.days[k] = { steps: 9000 };
  const pr = CHALLENGES.find((x) => x.id === 'pas');
  assert.equal(pr.count(pas, ['2026-10-26', '2026-10-27', '2026-10-28']), 3);
  // bilan : une séance manquante et une rechute
  state.days['2026-10-27'] = { workouts: [{ title: 'x' }], sleep: 6 };
  const review = weeklyReview(state, '2026-10-28');
  assert.match(review.improve, /sommeil|séance|rechute/);
  assert.ok(review.win.length > 10 && review.objective.length > 5);
  // messages de soutien : un par déclencheur, avec repli
  assert.ok(SUPPORT['Stress'].msg && SUPPORT['Stress'].tip);
  assert.ok(GENERIC_SUPPORT.msg);
  assert.ok(challengeProgress(state, '2026-10-28').target > 0);
});

test('bilan : prochain dimanche à 19 h', async () => {
  const { nextSundayEvening } = await import('../js/challenges.js');
  const wed = new Date(2026, 9, 28, 10, 0); // mercredi 28 octobre 2026
  const sun = nextSundayEvening(wed).at;
  assert.equal(sun.getDay(), 0);
  assert.equal(sun.getDate(), 1);
  assert.equal(sun.getHours(), 19);
  const sunMorning = new Date(2026, 9, 25, 8, 0); // dimanche 25 octobre, 8 h
  assert.equal(nextSundayEvening(sunMorning).at.getDate(), 25);
  const sunLate = new Date(2026, 9, 25, 20, 0);
  assert.equal(nextSundayEvening(sunLate).at.getDate(), 1);
});
