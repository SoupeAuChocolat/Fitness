// Base d'aliments : aliments courants en portions + table CIQUAL complète (pour 100 g).
import { CIQUAL, CIQUAL_GROUPS } from './data/ciqual.js';
import { FOODS } from './data/foods.js';

const byCode = new Map(CIQUAL.map((row) => [row[0], row]));
const r1 = (n) => Math.round(n * 10) / 10;

// Calcule kcal et macros d'un aliment courant à partir de ses ingrédients CIQUAL.
export function resolveFood(food) {
  if (!food.src) return food;
  let k = 0;
  let prot = 0;
  let carb = 0;
  let fat = 0;
  for (const [code, grams] of food.src) {
    const row = byCode.get(code);
    if (!row) throw new Error(`Code CIQUAL inconnu : ${code} (${food.n})`);
    const m = grams / 100;
    k += row[3] * m;
    prot += (row[4] ?? 0) * m;
    carb += (row[5] ?? 0) * m;
    fat += (row[6] ?? 0) * m;
  }
  return { ...food, k: Math.round(k), prot: r1(prot), carb: r1(carb), fat: r1(fat) };
}

export const COMMON_FOODS = FOODS.map(resolveFood);

export const CIQUAL_FOODS = CIQUAL.map(([code, n, grp, k, prot, carb, fat]) => ({
  n, p: '100 g', g: 100, k, prot, carb, fat, c: CIQUAL_GROUPS[grp], ciqual: code,
}));

export const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').toLowerCase();

// Recherche multi-mots (« pates cuites » trouve « Pâtes sèches standard, cuites »).
// Les aliments dont le nom commence par le premier mot passent devant.
export function searchFoods(list, query, limit = 80) {
  const words = normalize(query).split(/[\s,]+/).filter(Boolean);
  if (!words.length) return list.slice(0, limit);
  const hits = [];
  for (const f of list) {
    // pour les aliments en portions, la portion compte aussi (« pâtes cuites » → Pâtes, 200 g cuites)
    const name = f._norm || (f._norm = normalize(f.ciqual ? f.n : `${f.n} ${f.p || ''}`));
    if (words.every((w) => name.includes(w))) hits.push([name.startsWith(words[0]) ? 0 : 1, name.length, f]);
  }
  return hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, limit).map((h) => h[2]);
}

// Valeurs d'une quantité : grammes si l'aliment le permet, sinon nombre de portions.
export function portionValues(food, { grams, portions = 1 }) {
  const m = grams != null && food.g ? grams / food.g : portions;
  const scale = (v) => (v == null ? null : r1(v * m));
  return { kcal: Math.round(food.k * m), prot: scale(food.prot), carb: scale(food.carb), fat: scale(food.fat) };
}
