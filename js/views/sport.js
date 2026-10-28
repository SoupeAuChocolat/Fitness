// Onglet Sport : séance du jour, activités, programme, bibliothèque d'exercices.
import * as store from '../store.js';
import { currentWeight, kcalFromMet } from '../calc.js';
import { addDays, formatRelative, todayKey, weekStart, weekdayShort } from '../dates.js';
import { CARDIO, COOLDOWN, GYM_EXERCISES, HOME_EXERCISES, warmupFor } from '../data/exercises.js';
import { mediaHtml, startAnimations } from '../exmedia.js';
import { buildStretchWorkout, homeLevel, LEVEL_NAMES, planForDate, weekTraining } from '../program.js';
import { beep, bindActions, confirmSheet, dateNav, esc, ICON, nf, openSheet, parseNum, progressBar, toast, unlockAudio } from '../ui.js';
import { startFree, startPlanned, startWorkout } from './workout.js';

export function openActivitySheet(ctx, date, minutes = 30) {
  const state = store.get();
  const weight = currentWeight(state, date);
  let selected = CARDIO.find((c) => c.id === 'marche_rapide');
  let kcalEdited = false;

  openSheet({
    title: 'Noter une activité',
    html: `
      <div class="activity-grid">
        ${CARDIO.map((c) => `<button class="activity ${c.id === selected.id ? 'on' : ''}" data-id="${c.id}"><span>${c.icon}</span>${esc(c.name)}</button>`).join('')}
      </div>
      <div class="grid-2">
        <label class="field"><span>Durée (min)</span><input class="input" inputmode="numeric" data-min value="${minutes || 30}"></label>
        <label class="field"><span>Distance (km, facultatif)</span><input class="input" inputmode="decimal" data-km placeholder="—"></label>
      </div>
      <label class="field"><span>Calories brûlées (estimation)</span><input class="input" inputmode="numeric" data-kcal></label>
      <button class="btn btn-primary btn-block" data-save>Enregistrer</button>`,
    onMount(body, close) {
      const minEl = body.querySelector('[data-min]');
      const kcalEl = body.querySelector('[data-kcal]');
      const refresh = () => {
        if (!kcalEdited) kcalEl.value = kcalFromMet(selected.met, weight, parseNum(minEl.value) || 0);
      };
      refresh();
      body.querySelector('.activity-grid').addEventListener('click', (e) => {
        const b = e.target.closest('[data-id]');
        if (!b) return;
        selected = CARDIO.find((c) => c.id === b.dataset.id);
        body.querySelectorAll('.activity').forEach((x) => x.classList.toggle('on', x === b));
        refresh();
      });
      minEl.addEventListener('input', refresh);
      kcalEl.addEventListener('input', () => (kcalEdited = true));
      body.querySelector('[data-save]').addEventListener('click', () => {
        const min = parseNum(minEl.value);
        if (!min || min <= 0 || min > 600) return toast('Indique une durée en minutes', { icon: '⚠️' });
        const km = parseNum(body.querySelector('[data-km]').value);
        store.update((s) => {
          const d = (s.days[date] ||= {});
          (d.workouts ||= []).push({
            id: store.uid(),
            kind: 'cardio',
            activity: selected.id,
            title: selected.name,
            minutes: Math.round(min),
            distanceKm: km || null,
            kcal: Math.max(0, Math.round(parseNum(kcalEl.value) || 0)),
            at: Date.now(),
          });
        });
        close();
        toast('Activité enregistrée', { icon: selected.icon });
      });
    },
  });
}

function workoutLine(w, key, withDate) {
  const icon = w.kind === 'cardio' ? CARDIO.find((c) => c.id === w.activity)?.icon || '🏃' : w.kind === 'gym' ? '🏋️' : w.kind === 'home' ? '🏠' : '💪';
  const sets = (w.exercises || []).reduce((n, e) => n + e.sets.length, 0);
  return `
    <div class="list-item">
      <span class="li-icon">${icon}</span>
      <span class="grow">
        <strong>${esc(w.title)}</strong>
        <small>${withDate ? `${esc(formatRelative(key))} · ` : ''}${w.minutes} min · ${nf(w.kcal)} kcal${w.distanceKm ? ` · ${nf(w.distanceKm, 1)} km` : ''}${sets ? ` · ${sets} séries` : ''}</small>
      </span>
      ${withDate ? '' : `<button class="icon-btn" data-act="delWorkout" data-id="${w.id}" aria-label="Supprimer">${ICON.trash}</button>`}
    </div>`;
}

const exerciseList = (lib) => Object.values(lib).map((e) => `
  <details class="ex-detail">
    <summary>${esc(e.name)} <small class="muted">${e.mode === 'time' ? 'en secondes' : 'en répétitions'}${e.perSide ? ', par côté' : ''}</small></summary>
    ${mediaHtml(e.name, 'md')}
    <p>${esc(e.desc)}</p>
    ${e.easier ? `<p class="small muted">Plus facile : ${esc(e.easier)}</p>` : ''}
  </details>`).join('');

export function render(root, ctx) {
  const { state, ui } = ctx;
  const key = ui.date;
  const day = state.days[key] || {};
  const program = state.program;
  const plan = planForDate(key, program);
  const level = homeLevel(program, key);
  const monday = weekStart(key);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const training = weekTraining(state, key);

  const history = Object.keys(state.days)
    .sort()
    .reverse()
    .flatMap((k) => (state.days[k].workouts || []).slice().reverse().map((w) => [k, w]))
    .slice(0, 10);

  root.innerHTML = `
    ${dateNav(key)}

    <section class="card">
      <div class="card-head"><h2>${plan.icon} Séance du jour</h2></div>
      <p><strong>${esc(plan.title)}</strong></p>
      <p class="small muted">${esc(plan.text)}</p>
      ${state.activeWorkout ? '<a class="btn btn-primary btn-block" href="#/workout">Reprendre la séance en cours</a>' : plan.type === 'strength' ? `
        <div class="seg">
          <button class="${program.place === 'home' ? 'on' : ''}" data-act="place" data-v="home">🏠 Maison</button>
          <button class="${program.place === 'gym' ? 'on' : ''}" data-act="place" data-v="gym">🏋️ Salle</button>
        </div>
        <button class="btn btn-primary btn-block" data-act="start">Commencer la séance</button>` : `
        <button class="btn btn-primary btn-block" data-act="activity" data-min="${plan.minutes || 30}">+ Noter une activité</button>`}
    </section>

    <section class="card">
      <div class="card-head"><h2>📋 Activités du jour</h2></div>
      ${(day.workouts || []).length ? (day.workouts || []).map((w) => workoutLine(w, key, false)).join('') : '<p class="muted small">Rien de noté pour ce jour.</p>'}
      <div class="btn-row">
        <button class="btn grow" data-act="activity">+ Cardio / activité</button>
        <button class="btn grow" data-act="free" ${state.activeWorkout ? 'disabled' : ''}>+ Séance libre</button>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>🗓️ Ma semaine</h2><strong class="week-count">${training.done} / ${training.goal} séances</strong></div>
      ${progressBar(training.done / training.goal, 'bar-accent')}
      <div class="week">
        ${week.map((k) => {
          const pl = planForDate(k, program);
          const done = (state.days[k]?.workouts || []).length > 0;
          return `<button class="week-day ${k === key ? 'sel' : ''} ${done ? 'done' : ''} ${k > todayKey() ? 'future' : ''}" data-act="goDay" data-k="${k}">
            <small>${weekdayShort(k)}</small><span>${done ? '✅' : pl.icon}</span></button>`;
        }).join('')}
      </div>
      <p class="small muted">Lun / Mer / Ven : renforcement · Mar / Sam : cardio · Jeu : repos actif · Dim : repos</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>📈 Niveau du programme maison</h2></div>
      <div class="level-row">
        <button class="icon-btn" data-act="level" data-d="-1" ${level <= 1 ? 'disabled' : ''} aria-label="Niveau précédent">${ICON.minus}</button>
        <div class="grow center"><strong>Niveau ${level} — ${LEVEL_NAMES[level - 1]}</strong>
          <small class="muted">${program.level ? 'Choisi manuellement' : 'Augmente automatiquement toutes les 2 semaines'}</small></div>
        <button class="icon-btn" data-act="level" data-d="1" ${level >= 4 ? 'disabled' : ''} aria-label="Niveau suivant">${ICON.plus}</button>
      </div>
      ${program.level ? '<button class="btn btn-link btn-block" data-act="levelAuto">Revenir au niveau automatique</button>' : ''}
    </section>

    <section class="card">
      <div class="card-head"><h2>✨ Séances bonus</h2></div>
      <div class="btn-row">
        <button class="btn grow" data-act="stretch">🧘 Étirements guidés</button>
        <button class="btn grow" data-act="interval">🚶 Marche en intervalles</button>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>📖 Exercices</h2></div>
      <details class="ex-detail"><summary>Échauffement maison (5 min)</summary><ul>${warmupFor('home').map((w) => `<li>${esc(w)}</li>`).join('')}</ul></details>
      <details class="ex-detail"><summary>Échauffement salle (5 min)</summary><ul>${warmupFor('gym').map((w) => `<li>${esc(w)}</li>`).join('')}</ul></details>
      <details class="ex-detail"><summary>Retour au calme</summary><p>${esc(COOLDOWN)}</p></details>
      <details class="ex-group"><summary>🏠 Maison, sans matériel <small class="muted">(${Object.keys(HOME_EXERCISES).length})</small></summary>${exerciseList(HOME_EXERCISES)}</details>
      <details class="ex-group"><summary>🏋️ Salle de sport <small class="muted">(${Object.keys(GYM_EXERCISES).length})</small></summary>${exerciseList(GYM_EXERCISES)}</details>
    </section>

    ${history.length ? `
    <section class="card">
      <div class="card-head"><h2>🕒 Dernières séances</h2></div>
      ${history.map(([k, w]) => workoutLine(w, k, true)).join('')}
    </section>` : ''}`;

  // les animations ne démarrent qu'à l'ouverture de la fiche d'exercice
  root.querySelectorAll('.ex-detail').forEach((d) => d.addEventListener('toggle', () => d.open && startAnimations(d)));

  bindActions(root, {
    ...ctx.dateHandlers,
    place(el) {
      store.update((s) => (s.program.place = el.dataset.v));
    },
    start() {
      startPlanned(ctx, program.place);
    },
    free() {
      startFree(ctx);
    },
    stretch() {
      startWorkout(ctx, buildStretchWorkout());
    },
    interval() {
      openIntervalWalk(ctx, key);
    },
    activity(el) {
      openActivitySheet(ctx, key, Number(el.dataset.min) || 30);
    },
    goDay(el) {
      if (el.dataset.k <= todayKey()) ctx.setDate(el.dataset.k);
    },
    level(el) {
      store.update((s) => (s.program.level = Math.min(4, Math.max(1, level + Number(el.dataset.d)))));
    },
    levelAuto() {
      store.update((s) => (s.program.level = null));
    },
    async delWorkout(el) {
      const ok = await confirmSheet({ title: 'Supprimer cette activité ?', message: 'Elle sera retirée de ta journée.', ok: 'Supprimer', danger: true });
      if (!ok) return;
      store.update((s) => {
        s.days[key].workouts = s.days[key].workouts.filter((w) => w.id !== el.dataset.id);
      });
    },
  });
}

// --- Marche en intervalles : 6 cycles de 2 min rapide + 1 min lent --------------------

const WALK_FAST = 120;
const WALK_SLOW = 60;
const WALK_ROUNDS = 6;

function openIntervalWalk(ctx, date) {
  const weight = currentWeight(store.get(), date);
  let timer = null;
  let round = 1;
  let phase = 'fast';
  let phaseEnd = 0;
  let startedAt = 0;
  let el = {};

  const stop = () => {
    clearInterval(timer);
    timer = null;
  };
  const log = (minutes) => {
    if (minutes < 1) return;
    store.update((s) => {
      const d = (s.days[date] ||= {});
      (d.workouts ||= []).push({
        id: store.uid(), kind: 'cardio', activity: 'marche_rapide', title: 'Marche en intervalles',
        minutes: Math.round(minutes), distanceKm: null, kcal: kcalFromMet(4.3, weight, minutes), at: Date.now(),
      });
    });
    toast(`Marche enregistrée : ${Math.round(minutes)} min`, { icon: '🚶' });
  };
  const elapsedMin = () => (Date.now() - startedAt) / 60000;
  const finish = () => {
    stop();
    beep(2);
    el.phase.textContent = 'Bravo, tous les cycles sont faits ! 🎉';
    el.time.textContent = '0';
    log((WALK_FAST + WALK_SLOW) * WALK_ROUNDS / 60);
  };
  const show = (now) => {
    el.time.textContent = String(Math.max(0, Math.ceil((phaseEnd - now) / 1000)));
    el.phase.textContent = phase === 'fast' ? `🏃 Rapide · cycle ${round} / ${WALK_ROUNDS}` : `🚶 Lent · cycle ${round} / ${WALK_ROUNDS}`;
  };
  const tick = () => {
    const now = Date.now();
    if (now < phaseEnd) return show(now);
    if (phase === 'fast') {
      phase = 'slow';
      phaseEnd = now + WALK_SLOW * 1000;
      beep(1);
    } else if (round < WALK_ROUNDS) {
      round++;
      phase = 'fast';
      phaseEnd = now + WALK_FAST * 1000;
      beep(2);
    } else {
      return finish();
    }
    show(now);
  };

  openSheet({
    title: 'Marche en intervalles',
    html: `
      <p class="small muted">${WALK_ROUNDS} cycles de 2 min rapide puis 1 min lent, soit 18 min. Un signal sonore annonce chaque changement.</p>
      <div class="interval-big" data-time>—</div>
      <p class="center" data-phase>Prêt ?</p>
      <div class="btn-row">
        <button class="btn btn-primary grow" data-go>Démarrer</button>
        <button class="btn" data-stop>Arrêter</button>
      </div>`,
    onMount(body, close) {
      el = { time: body.querySelector('[data-time]'), phase: body.querySelector('[data-phase]') };
      body.querySelector('[data-go]').addEventListener('click', () => {
        unlockAudio();
        stop();
        round = 1;
        phase = 'fast';
        startedAt = Date.now();
        phaseEnd = startedAt + WALK_FAST * 1000;
        beep(1);
        show(startedAt);
        timer = setInterval(tick, 250);
      });
      body.querySelector('[data-stop]').addEventListener('click', () => {
        const minutes = timer ? elapsedMin() : 0;
        stop();
        if (minutes >= 5) log(minutes);
        close();
      });
    },
    onClose: stop,
  });
}
