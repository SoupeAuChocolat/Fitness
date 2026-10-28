// Widget Android : envoie les chiffres du jour au widget de l'écran d'accueil.
import { dailyTarget, dayTotals, stepsKm } from './calc.js';
import { todayKey } from './dates.js';
import { MaFormeWidget } from './native.js';
import { weekTraining } from './program.js';
import * as store from './store.js';
import { getTheme } from './theme.js';
import { nf } from './ui.js';

// Verres ajoutés depuis le widget : repris dans le journal du jour.
export async function consumeWidgetWater() {
  if (!MaFormeWidget) return 0;
  const { count } = await MaFormeWidget.consumeWater().catch(() => ({ count: 0 }));
  if (!count) return 0;
  const key = todayKey();
  store.update((s) => {
    const d = (s.days[key] ||= {});
    const before = d.water || 0;
    d.water = before + count;
    store.logChange(key, 'water', before, d.water);
  });
  return count;
}

export function pushWidget(state = store.get()) {
  if (!MaFormeWidget || !state.profile) return;
  const key = todayKey();
  const day = state.days[key] || {};
  const goal = dailyTarget(state, key);
  const t = dayTotals(day);
  const left = goal.target - t.eaten;
  const week = weekTraining(state, key);
  const steps = day.steps || 0;
  MaFormeWidget.update({
    kcalLeft: nf(Math.abs(left)),
    kcalLabel: left < 0 ? 'kcal en trop' : 'kcal restantes',
    eaten: `Mangé ${nf(t.eaten)} / ${nf(goal.target)} kcal`,
    steps: `${nf(steps)} pas · ${nf(stepsKm(steps, state.profile), 1)} km`,
    sport: `Séances ${week.done} / ${week.goal} cette semaine`,
    waterCount: String(day.water || 0),
    waterGoal: String(state.profile.waterGoal),
    theme: getTheme(),
  }).catch(() => {});
}
