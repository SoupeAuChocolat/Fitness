// Calculs d'alimentation (sans affichage) : recettes, liste de courses,
// réserve « sorties », alerte protéines.
import { CIQUAL } from './data/ciqual.js';
import { keysBetween, weekStart } from './dates.js';
import { normalize } from './foods.js';

const ROWS = new Map(CIQUAL.map((r) => [r[0], r]));
const r1 = (v) => Math.round(v * 10) / 10;

// Valeurs d'une recette : totaux et valeurs par part. Ingrédients : { code CIQUAL, name, grams }.
export function recipeTotals(recipe) {
  const t = { kcal: 0, prot: 0, carb: 0, fat: 0 };
  let weight = 0;
  for (const ing of recipe.ingredients || []) {
    const row = ROWS.get(ing.code);
    weight += ing.grams || 0;
    if (!row) continue;
    const m = (ing.grams || 0) / 100;
    t.kcal += row[3] * m;
    t.prot += (row[4] || 0) * m;
    t.carb += (row[5] || 0) * m;
    t.fat += (row[6] || 0) * m;
  }
  const parts = Math.max(1, Math.round(recipe.parts) || 1);
  return {
    total: { kcal: Math.round(t.kcal), prot: r1(t.prot), carb: r1(t.carb), fat: r1(t.fat) },
    perPart: { kcal: Math.round(t.kcal / parts), prot: r1(t.prot / parts), carb: r1(t.carb / parts), fat: r1(t.fat / parts) },
    parts,
    weight,
  };
}

// Une recette se comporte comme un aliment dont la portion est une part.
export function recipeFood(recipe) {
  const { perPart, parts } = recipeTotals(recipe);
  return { n: recipe.name, p: `1 part (sur ${parts})`, k: perPart.kcal, prot: perPart.prot, carb: perPart.carb, fat: perPart.fat, c: 'Mes recettes', recipeId: recipe.id };
}

// Aliments mangés depuis lundi, regroupés : à racheter. Triés par fréquence.
export function shoppingList(state, today) {
  const map = new Map();
  for (const k of keysBetween(weekStart(today), today)) {
    for (const m of state.days[k]?.meals || []) {
      const id = normalize(m.name);
      const e = map.get(id) || { name: m.name, count: 0 };
      e.count++;
      map.set(id, e);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));
}

// Réserve « sorties » : une part du budget de la semaine, entamée par les repas marqués.
export function eatOutReserve(state, today, dailyKcal) {
  const percent = state.profile?.eatOutPercent ?? 10;
  const total = Math.round((dailyKcal * 7 * percent) / 100);
  let used = 0;
  for (const k of keysBetween(weekStart(today), today)) {
    for (const m of state.days[k]?.meals || []) if (m.eatOut) used += m.kcal;
  }
  used = Math.round(used);
  return { percent, total, used, left: total - used };
}

// Alerte protéines : seulement si la journée est en retard (moins de 70 % de l'objectif).
export function proteinAlert(dayProt, goal, foods) {
  if (dayProt >= goal * 0.7) return null;
  const missing = Math.round(goal - dayProt);
  const picks = foods
    .filter((f) => f.prot >= 8 && f.k > 0 && f.k <= 350)
    .sort((a, b) => b.prot - a.prot)
    .slice(0, 3)
    .map((f) => ({ name: f.n, portion: f.p, prot: f.prot }));
  return { missing, picks };
}
