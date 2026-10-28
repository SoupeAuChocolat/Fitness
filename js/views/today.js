// Tableau de bord du jour.
import * as store from '../store.js';
import { calorieTarget, currentWeight, dayTotals, habitStats, latestValue } from '../calc.js';
import { addDays, diffDays, todayKey } from '../dates.js';
import { QUOTES } from '../data/quotes.js';
import { openFailSheet, openSosPicker, toggleOk } from '../habit-actions.js';
import { planForDate } from '../program.js';
import { bindActions, dateNav, esc, fmtKg, ICON, nf, parseNum, plural, progressBar, toast } from '../ui.js';
import { openActivitySheet } from './sport.js';
import { startPlanned } from './workout.js';

function greeting(name) {
  const h = new Date().getHours();
  const hello = h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  return `${hello}${name ? ` ${esc(name)}` : ''} 👋`;
}

function ring(ratio, over) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, ratio));
  return `
    <svg class="ring ${over ? 'over' : ''}" viewBox="0 0 120 120" aria-hidden="true">
      <circle class="ring-bg" cx="60" cy="60" r="${r}"/>
      <circle class="ring-fg" cx="60" cy="60" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
    </svg>`;
}

export function render(root, ctx) {
  const { state, ui } = ctx;
  const key = ui.date;
  const isToday = key === todayKey();
  const day = state.days[key] || {};
  const p = state.profile;
  const weight = currentWeight(state, key);
  const target = calorieTarget(p, weight, key).target;
  const t = dayTotals(day);
  const left = target - t.eaten;
  const over = left < 0;
  const lastWaist = latestValue(state, 'waist', addDays(key, -1));
  const prevWeight = latestValue(state, 'weight', addDays(key, -1));
  const lost = p.startWeight - weight;
  const toGo = weight - p.goalWeight;
  const habits = state.habits.filter((h) => !h.archived && h.startDate <= key);
  const plan = planForDate(key, state.program);
  const quote = QUOTES[((diffDays('2024-01-01', key) % QUOTES.length) + QUOTES.length) % QUOTES.length];
  const water = day.water || 0;
  const drops = Math.max(p.waterGoal, water);

  root.innerHTML = `
    ${dateNav(key)}
    ${isToday ? `<div class="hello"><h1>${greeting(p.name)}</h1><p class="quote">« ${esc(quote)} »</p></div>` : ''}

    <a class="card card-link cal-card" href="#/meals">
      <div class="ring-wrap">
        ${ring(t.eaten / target, over)}
        <div class="ring-text"><strong>${nf(Math.abs(left))}</strong><small>${over ? 'kcal en trop' : 'kcal restantes'}</small></div>
      </div>
      <div class="cal-stats">
        <div><small>Objectif</small><strong>${nf(target)}</strong></div>
        <div><small>Mangé</small><strong>${nf(t.eaten)}</strong></div>
        <div><small>Brûlé (sport)</small><strong>${nf(t.burned)}</strong></div>
        <span class="link">${t.items ? 'Voir mes repas' : 'Ajouter un repas'} ›</span>
      </div>
    </a>

    <section class="card">
      <div class="card-head"><h2>⚖️ Mesures</h2><a class="link" href="#/progress">Courbes ›</a></div>
      <div class="grid-2">
        <label class="field"><span>Poids (kg)</span>
          <input class="input input-big" inputmode="decimal" enterkeyhint="done" data-change="weight"
            value="${day.weight != null ? nf(day.weight, 1) : ''}" placeholder="${prevWeight != null ? nf(prevWeight, 1) : nf(p.startWeight, 1)}"></label>
        <label class="field"><span>Tour de taille (cm)</span>
          <input class="input input-big" inputmode="decimal" enterkeyhint="done" data-change="waist"
            value="${day.waist != null ? nf(day.waist, 1) : ''}" placeholder="${lastWaist != null ? nf(lastWaist, 1) : '—'}"></label>
      </div>
      ${day.weight != null && prevWeight != null ? `<p class="small ${day.weight <= prevWeight ? 'good-text' : 'muted'}">${day.weight <= prevWeight ? '▼' : '▲'} ${nf(Math.abs(day.weight - prevWeight), 1)} kg depuis la dernière pesée</p>` : ''}
      <div class="goal-line small">
        <span>Départ ${fmtKg(p.startWeight)}</span>
        <span>${lost >= 0 ? `<strong>−${nf(lost, 1)} kg</strong>` : `+${nf(-lost, 1)} kg`}</span>
        <span>Objectif ${fmtKg(p.goalWeight)}</span>
      </div>
      ${progressBar(lost / (p.startWeight - p.goalWeight), 'bar-accent')}
      ${toGo > 0 ? `<p class="small muted center">Encore ${nf(toGo, 1)} kg</p>` : '<p class="small good-text center">🏆 Objectif atteint, bravo !</p>'}
    </section>

    <section class="card">
      <div class="card-head"><h2>💧 Eau</h2><span class="small muted">${water} / ${p.waterGoal} verres · ${nf((water * p.glassMl) / 1000, 2)} L</span></div>
      <div class="water-row">
        <button class="icon-btn round" data-act="water" data-d="-1" aria-label="Retirer un verre" ${water ? '' : 'disabled'}>${ICON.minus}</button>
        <div class="drops">${Array.from({ length: drops }, (_, i) => `<span class="drop ${i < water ? 'on' : ''}"></span>`).join('')}</div>
        <button class="icon-btn round primary" data-act="water" data-d="1" aria-label="Ajouter un verre">${ICON.plus}</button>
      </div>
    </section>

    <section class="card">
      <div class="grid-2">
        <div class="field">
          <span>😴 Sommeil</span>
          <div class="stepper">
            <button class="icon-btn" data-act="sleep" data-d="-0.5" aria-label="Moins">${ICON.minus}</button>
            <strong>${day.sleep != null ? `${nf(day.sleep, 1)} h` : '—'}</strong>
            <button class="icon-btn" data-act="sleep" data-d="0.5" aria-label="Plus">${ICON.plus}</button>
          </div>
          <small class="muted">Objectif ${nf(p.sleepGoal, 1)} h</small>
        </div>
        <label class="field">
          <span>👣 Pas</span>
          <input class="input" inputmode="numeric" enterkeyhint="done" data-change="steps" value="${day.steps ?? ''}" placeholder="0">
          ${progressBar((day.steps || 0) / p.stepsGoal)}
          <small class="muted">Objectif ${nf(p.stepsGoal)}</small>
        </label>
      </div>
    </section>

    ${habits.length ? `
    <section class="card">
      <div class="card-head"><h2>🛡️ Habitudes</h2><a class="link" href="#/habits">Détails ›</a></div>
      <div class="habit-checks">
        ${habits.map((h) => {
          const s = habitStats(h, key);
          const st = h.log?.[key];
          return `
            <div class="habit-check">
              <span class="hc-icon">${h.icon}</span>
              <span class="grow"><strong>${esc(h.name)}</strong><small>🔥 ${plural(s.current, 'jour')}</small></span>
              <div class="hc-btns">
                <button class="pill ${st === 'ok' ? 'pill-ok' : ''}" data-act="hok" data-id="${h.id}" aria-pressed="${st === 'ok'}">✓ Tenu</button>
                <button class="pill ${st === 'fail' ? 'pill-fail' : ''}" data-act="hfail" data-id="${h.id}" aria-pressed="${st === 'fail'}">✗ Craqué</button>
              </div>
            </div>`;
        }).join('')}
      </div>
      ${isToday ? '<button class="btn btn-sos btn-block" data-act="sos">🆘 J’ai une envie</button>' : ''}
    </section>` : ''}

    <section class="card">
      <div class="card-head"><h2>${plan.icon} Sport du jour</h2><a class="link" href="#/sport">Programme ›</a></div>
      <p><strong>${esc(plan.title)}</strong></p>
      <p class="small muted">${esc(plan.text)}</p>
      ${(day.workouts || []).map((w) => `<div class="done-item">✅ ${esc(w.title)} · ${w.minutes} min · ${nf(w.kcal)} kcal</div>`).join('')}
      <div class="btn-row">
        ${state.activeWorkout ? '<a class="btn btn-primary grow" href="#/workout">Reprendre la séance en cours</a>'
          : (day.workouts || []).length ? '<p class="good-text grow"><strong>C’est fait pour aujourd’hui, bravo ! 🎉</strong></p><button class="btn btn-ghost grow" data-act="activity">+ Autre activité</button>'
          : plan.type === 'strength' ? `
            <button class="btn ${state.program.place === 'home' ? 'btn-primary' : ''} grow" data-act="start" data-place="home">🏠 À la maison</button>
            <button class="btn ${state.program.place === 'gym' ? 'btn-primary' : ''} grow" data-act="start" data-place="gym">🏋️ En salle</button>`
          : `<button class="btn btn-primary grow" data-act="activity">+ Noter une activité</button>`}
      </div>
    </section>`;

  const setField = (field, value, { fromInput = false } = {}) => {
    store.update((s) => {
      const d = store.ensureDay(key);
      if (value == null) delete d[field];
      else d[field] = value;
    }, { silent: fromInput });
    // depuis un champ texte : rendu différé pour ne pas avaler le prochain toucher
    if (fromInput) setTimeout(ctx.rerender, 250);
  };

  bindActions(root, {
    ...ctx.dateHandlers,
    weight(el) {
      const v = parseNum(el.value);
      if (v != null && (v < 30 || v > 350)) return toast('Poids invalide', { icon: '⚠️' });
      setField('weight', v, { fromInput: true });
      if (v != null) toast('Poids enregistré', { icon: '⚖️' });
    },
    waist(el) {
      const v = parseNum(el.value);
      if (v != null && (v < 40 || v > 250)) return toast('Tour de taille invalide', { icon: '⚠️' });
      setField('waist', v, { fromInput: true });
    },
    steps(el) {
      const v = parseNum(el.value);
      setField('steps', v == null ? null : Math.max(0, Math.round(v)), { fromInput: true });
    },
    water(el) {
      setField('water', Math.max(0, water + Number(el.dataset.d)));
      if (water + 1 === p.waterGoal && Number(el.dataset.d) > 0) toast('Objectif d’eau atteint !', { icon: '💧' });
    },
    sleep(el) {
      const v = day.sleep == null ? p.sleepGoal : Math.min(14, Math.max(0, day.sleep + Number(el.dataset.d)));
      setField('sleep', v);
    },
    hok(el) {
      toggleOk(state.habits.find((h) => h.id === el.dataset.id), key);
    },
    hfail(el) {
      openFailSheet(state.habits.find((h) => h.id === el.dataset.id), key);
    },
    sos() {
      openSosPicker(habits);
    },
    start(el) {
      store.update((s) => (s.program.place = el.dataset.place), { silent: true });
      startPlanned(ctx, el.dataset.place);
    },
    activity() {
      openActivitySheet(ctx, key, plan.minutes);
    },
  });
}
