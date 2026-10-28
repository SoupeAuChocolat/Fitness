// Onglet Progrès : courbes, bilan de la semaine, badges.
import { computeBadges } from '../badges.js';
import {
  bmi, bmiLabel, calorieTarget, currentWeight, dayTotals, movingAverage, series, weekSummary, weightTrend,
} from '../calc.js';
import { renderBarChart, renderLineChart } from '../charts.js';
import { addDays, diffDays, formatDayMonth, formatFull, formatShort, todayKey, weekdayShort, weekStart } from '../dates.js';
import { bindActions, esc, fmtKg, ICON, nf } from '../ui.js';

let range = 90;
let weekOffset = 0;
let allBadges = false;

function delta(cur, prev, { digits = 0, unit = '', lowerIsBetter = false } = {}) {
  if (cur == null || prev == null) return '';
  const d = cur - prev;
  if (Math.abs(d) < 10 ** -digits / 2) return '<span class="muted">=</span>';
  const good = lowerIsBetter ? d < 0 : d > 0;
  return `<span class="${good ? 'good-text' : 'bad-text'}">${d > 0 ? '▲' : '▼'} ${nf(Math.abs(d), digits)}${unit}</span>`;
}

function summaryRows(sum, prev) {
  const rows = [
    ['⚖️ Poids moyen', sum.weightAvg != null ? fmtKg(sum.weightAvg) : '—', delta(sum.weightAvg, prev?.weightAvg, { digits: 1, unit: ' kg', lowerIsBetter: true })],
    ['🍽️ Calories / jour', sum.kcalAvg != null ? `${nf(sum.kcalAvg)} kcal` : '—', sum.mealDays ? `<small class="muted">${sum.underTarget}/${sum.mealDays} j sous l’objectif</small>` : ''],
    ['💪 Sport', `${sum.workouts} séance${sum.workouts > 1 ? 's' : ''} · ${sum.sportMin} min`, delta(sum.sportMin, prev?.sportMin, { unit: ' min' })],
    ['🔥 Brûlé au sport', `${nf(sum.burned)} kcal`, ''],
    ['💧 Eau', sum.waterAvg != null ? `${nf(sum.waterAvg, 1)} verres / j` : '—', delta(sum.waterAvg, prev?.waterAvg, { digits: 1 })],
    ['😴 Sommeil', sum.sleepAvg != null ? `${nf(sum.sleepAvg, 1)} h / nuit` : '—', delta(sum.sleepAvg, prev?.sleepAvg, { digits: 1, unit: ' h' })],
    ['👣 Pas', sum.stepsAvg != null ? `${nf(sum.stepsAvg)} / j` : '—', delta(sum.stepsAvg, prev?.stepsAvg)],
    ...sum.habits.map((x) => [`${x.habit.icon} ${esc(x.habit.name)}`, `${x.clean}/${x.days} j tenus`, x.fails ? `<small class="bad-text">${x.fails} rechute${x.fails > 1 ? 's' : ''}</small>` : '<small class="good-text">parfait</small>']),
  ];
  return rows.map(([a, b, c]) => `<div class="sum-row"><span>${a}</span><strong>${b}</strong><span class="sum-delta">${c}</span></div>`).join('');
}

function verdict(sum) {
  const wins = [];
  if (sum.workouts >= 3) wins.push('3 séances de sport ou plus');
  if (sum.mealDays && sum.underTarget / sum.mealDays >= 0.7) wins.push('des calories bien maîtrisées');
  if (sum.habits.length && sum.habits.every((h) => h.fails === 0)) wins.push('aucune rechute');
  if (!wins.length) return 'Chaque semaine est une nouvelle chance : vise une petite victoire de plus que la précédente.';
  return `Bravo pour ${wins.join(', ')} ! 👏`;
}

export function render(root, ctx) {
  const { state } = ctx;
  const p = state.profile;
  const today = todayKey();
  const targetFor = (k) => calorieTarget(p, currentWeight(state, k), k).target;

  const weights = series(state, 'weight').filter((x) => x.x <= today);
  const avgAll = movingAverage(weights, 7);
  const keep = (x) => !range || diffDays(x.x, today) < range;
  const wPoints = weights.filter(keep);
  const wTrend = avgAll.filter(keep);
  const trend = weightTrend(weights, p.goalWeight, today);
  const current = currentWeight(state, today);
  const lost = p.startWeight - current;
  const waist = series(state, 'waist').filter((x) => x.x <= today);

  const days14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const kcalBars = days14.map((k) => {
    const eaten = dayTotals(state.days[k]).eaten;
    const target = targetFor(k);
    return {
      label: weekdayShort(k).slice(0, 2),
      value: eaten,
      over: eaten > target,
      tip: `<strong>${formatDayMonth(k)}</strong><br>${eaten ? `${nf(eaten)} kcal (objectif ${nf(target)})` : 'Rien de noté'}`,
    };
  });
  const loggedDays = days14.filter((k) => dayTotals(state.days[k]).eaten > 0);
  const kcalAvg = loggedDays.length ? loggedDays.reduce((s, k) => s + dayTotals(state.days[k]).eaten, 0) / loggedDays.length : null;

  const thisMonday = weekStart(today);
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(thisMonday, (i - 7) * 7));
  const sportBars = weeks.map((w) => {
    const min = Array.from({ length: 7 }, (_, i) => dayTotals(state.days[addDays(w, i)]).sportMin).reduce((a, b) => a + b, 0);
    return { label: formatShort(w), value: min, tip: `<strong>Semaine du ${formatDayMonth(w)}</strong><br>${nf(min)} min de sport` };
  });

  const wStart = addDays(thisMonday, -7 * weekOffset);
  const sum = weekSummary(state, wStart, today, targetFor);
  const prev = weekSummary(state, addDays(wStart, -7), today, targetFor);

  const badges = computeBadges(state, today).map((b) => ({ ...b, ok: b.ok || !!state.badges[b.id] }));
  const groups = [...new Set(badges.map((b) => b.group))];
  const earned = badges.filter((b) => b.ok).length;

  root.innerHTML = `
    <section class="card">
      <div class="card-head"><h2>⚖️ Poids</h2>
        <div class="seg seg-sm">${[[30, '30 j'], [90, '90 j'], [0, 'Tout']].map(([v, l]) => `<button class="${range === v ? 'on' : ''}" data-act="range" data-v="${v}">${l}</button>`).join('')}</div>
      </div>
      <div class="tiles tiles-3">
        <div class="tile"><small>Actuel</small><strong>${fmtKg(current)}</strong></div>
        <div class="tile"><small>${lost >= 0 ? 'Perdu' : 'Pris'}</small><strong class="${lost > 0 ? 'good-text' : ''}">${nf(Math.abs(lost), 1)} kg</strong></div>
        <div class="tile"><small>Reste</small><strong>${nf(Math.max(0, current - p.goalWeight), 1)} kg</strong></div>
      </div>
      <div id="chart-weight"></div>
      ${trend ? `<p class="small">Tendance sur 4 semaines : <strong>${trend.perWeek <= 0 ? '−' : '+'}${nf(Math.abs(trend.perWeek), 2)} kg / semaine</strong>${trend.goalDate ? `<br>À ce rythme, objectif atteint vers le <strong>${formatFull(trend.goalDate)}</strong> 🎯` : ''}</p>`
        : '<p class="small muted">Pèse-toi régulièrement (idéalement le matin à jeun) pour voir ta tendance.</p>'}
      <p class="small muted">IMC : ${nf(bmi(current, p.heightCm), 1)} — ${bmiLabel(bmi(current, p.heightCm))}</p>
    </section>

    ${waist.length ? `
    <section class="card">
      <div class="card-head"><h2>📏 Tour de taille</h2></div>
      <div class="tiles tiles-3">
        <div class="tile"><small>Départ (cm)</small><strong>${nf(waist[0].y, 1)}</strong></div>
        <div class="tile"><small>Actuel (cm)</small><strong>${nf(waist[waist.length - 1].y, 1)}</strong></div>
        <div class="tile"><small>Écart (cm)</small><strong>${delta(waist[waist.length - 1].y, waist[0].y, { digits: 1, lowerIsBetter: true }) || '—'}</strong></div>
      </div>
      <div id="chart-waist"></div>
    </section>` : ''}

    <section class="card">
      <div class="card-head"><h2>🍽️ Calories — 14 jours</h2></div>
      <div id="chart-kcal"></div>
      <p class="small muted">${kcalAvg ? `Moyenne des jours notés : <strong>${nf(kcalAvg)} kcal</strong>` : 'Note tes repas pour voir ce graphique.'}</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>💪 Sport — minutes par semaine</h2></div>
      <div id="chart-sport"></div>
    </section>

    <section class="card">
      <div class="card-head">
        <button class="icon-btn" data-act="week" data-d="1" aria-label="Semaine précédente">${ICON.left}</button>
        <h2 class="center grow">📊 ${weekOffset === 0 ? 'Cette semaine' : weekOffset === 1 ? 'Semaine dernière' : `Semaine du ${formatDayMonth(wStart)}`}</h2>
        <button class="icon-btn" data-act="week" data-d="-1" aria-label="Semaine suivante" ${weekOffset === 0 ? 'disabled' : ''}>${ICON.right}</button>
      </div>
      ${sum ? `
        <p class="small muted center">Du ${formatDayMonth(sum.start)} au ${formatDayMonth(sum.end)} · comparé à la semaine précédente</p>
        ${summaryRows(sum, prev)}
        <p class="verdict">${verdict(sum)}</p>` : '<p class="muted">Pas de données.</p>'}
    </section>

    <section class="card">
      <div class="card-head"><h2>🏅 Badges</h2><span class="small muted">${earned} / ${badges.length}</span></div>
      ${groups.map((g) => {
        const inGroup = badges.filter((b) => b.group === g);
        // par défaut : badges obtenus + le prochain à débloquer
        const shown = allBadges ? inGroup : [...inGroup.filter((b) => b.ok), ...inGroup.filter((b) => !b.ok).slice(0, 1)];
        return `
        <h3 class="sub">${esc(g)}</h3>
        <div class="badges">
          ${shown.map((b) => `
            <div class="badge ${b.ok ? 'on' : ''}" title="${esc(b.desc)}">
              <span class="badge-icon">${b.icon}</span>
              <strong>${esc(b.title)}</strong>
              <small>${esc(b.desc)}</small>
              ${!b.ok ? `<div class="bar bar-thin"><span style="width:${b.progress * 100}%"></span></div>` : ''}
            </div>`).join('')}
        </div>`;
      }).join('')}
      <button class="btn btn-link btn-block" data-act="allBadges">${allBadges ? 'Afficher seulement les badges obtenus et les prochains' : 'Voir tous les badges'}</button>
    </section>`;

  renderLineChart(root.querySelector('#chart-weight'), {
    points: wPoints, trend: wTrend, goal: p.goalWeight, unit: 'kg', pointLabel: 'Pesée', trendLabel: 'Moyenne 7 jours',
  });
  if (waist.length) {
    renderLineChart(root.querySelector('#chart-waist'), { points: waist, unit: 'cm', pointLabel: 'Tour de taille', height: 170 });
  }
  renderBarChart(root.querySelector('#chart-kcal'), {
    bars: kcalBars, target: targetFor(today), unit: 'kcal', valueLabel: 'Sous l’objectif', overLabel: 'Au-dessus de l’objectif',
  });
  renderBarChart(root.querySelector('#chart-sport'), { bars: sportBars, unit: 'min', height: 170 });

  bindActions(root, {
    range(el) {
      range = Number(el.dataset.v);
      ctx.rerender();
    },
    week(el) {
      weekOffset = Math.max(0, weekOffset + Number(el.dataset.d));
      ctx.rerender();
    },
    allBadges() {
      allBadges = !allBadges;
      ctx.rerender();
    },
  });
}
