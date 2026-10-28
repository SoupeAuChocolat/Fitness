// Séance en cours : séries, minuteurs de repos et d'effort, enregistrement.
import * as store from '../store.js';
import { currentWeight, kcalFromMet, lastPerformance } from '../calc.js';
import { formatRelative } from '../dates.js';
import { COOLDOWN, GYM_EXERCISES, HOME_EXERCISES, MET_GYM_SESSION, MET_HOME_SESSION, warmupFor } from '../data/exercises.js';
import { mediaHtml, startAnimations } from '../exmedia.js';
import { applyReminders } from '../reminders.js';
import { buildGymWorkout, buildHomeWorkout, findExercise, newExercise, planForDate } from '../program.js';
import { beep, bindActions, confirmSheet, esc, ICON, nf, openSheet, parseNum, toast, unlockAudio } from '../ui.js';

let elapsedTimer = null;
let timer = null; // minuteur affiché en bas d'écran
let wakeLock = null;

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export function startWorkout(ctx, template) {
  if (store.get().activeWorkout) {
    toast('Une séance est déjà en cours', { icon: '⏱️' });
    return ctx.go('workout');
  }
  unlockAudio();
  store.update((s) => {
    s.activeWorkout = { id: store.uid(), date: ctx.ui.date, startedAt: Date.now(), ...template };
  }, { silent: true });
  ctx.go('workout');
}

export function startPlanned(ctx, place) {
  const state = store.get();
  const plan = planForDate(ctx.ui.date, state.program);
  const session = plan.session || 'A';
  startWorkout(ctx, place === 'gym' ? buildGymWorkout(session, state, ctx.ui.date) : buildHomeWorkout(session, plan.level));
}

export const startFree = (ctx) => startWorkout(ctx, { kind: 'free', title: 'Séance libre', rest: 60, exercises: [] });

// --- Minuteur ------------------------------------------------------------------

function stopTimer() {
  if (!timer) return;
  clearInterval(timer.interval);
  timer.el.remove();
  timer = null;
}

function showTimer({ seconds, label, kind, onDone }) {
  stopTimer();
  const el = document.createElement('div');
  el.className = `timer-bar timer-${kind}`;
  el.innerHTML = `
    <div class="timer-label">${esc(label)}</div>
    <div class="timer-info"><strong class="timer-time">${mmss(seconds)}</strong></div>
    <div class="timer-actions">
      <button class="btn btn-sm" data-t="-15">−15 s</button>
      <button class="btn btn-sm" data-t="15">+15 s</button>
      <button class="btn btn-sm btn-primary" data-t="skip">${kind === 'rest' ? 'Passer' : 'Terminé'}</button>
    </div>`;
  document.body.appendChild(el);
  let endAt = Date.now() + seconds * 1000;
  let lastShown = seconds;
  const done = () => {
    stopTimer();
    beep(kind === 'rest' ? 1 : 2);
    onDone?.();
  };
  const tick = () => {
    const left = Math.ceil((endAt - Date.now()) / 1000);
    if (left <= 0) return done();
    if (left !== lastShown) {
      lastShown = left;
      el.querySelector('.timer-time').textContent = mmss(left);
    }
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    if (b.dataset.t === 'skip') {
      stopTimer();
      if (kind === 'work') onDone?.();
      return;
    }
    endAt += Number(b.dataset.t) * 1000;
    tick();
  });
  timer = { el, interval: setInterval(tick, 200) };
}

async function keepAwake() {
  try {
    if (!wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    }
  } catch {
    /* non supporté */
  }
}

export function cleanup() {
  clearInterval(elapsedTimer);
  elapsedTimer = null;
  stopTimer();
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

// --- Rendu -------------------------------------------------------------------

function setRow(ex, i, j, set, showKg) {
  const unit = ex.mode === 'time' ? 's' : 'reps';
  return `
    <div class="set ${set.done ? 'done' : ''}">
      <span class="set-n">${j + 1}</span>
      <input class="input input-sm" inputmode="numeric" data-change="setVal" data-i="${i}" data-j="${j}" value="${set.value ?? ''}" aria-label="Série ${j + 1}, ${unit}">
      <span class="unit">${unit}</span>
      ${showKg ? `<input class="input input-sm" inputmode="decimal" data-change="setKg" data-i="${i}" data-j="${j}" value="${set.kg != null ? nf(set.kg, 1) : ''}" placeholder="—" aria-label="Charge en kg"><span class="unit">kg</span>` : '<span class="grow"></span>'}
      ${ex.mode === 'time' && !set.done ? `<button class="icon-btn" data-act="timeSet" data-i="${i}" data-j="${j}" aria-label="Lancer le chrono">${ICON.play}</button>` : ''}
      <button class="set-check ${set.done ? 'on' : ''}" data-act="toggleSet" data-i="${i}" data-j="${j}" aria-label="Série faite" aria-pressed="${set.done}">${ICON.check}</button>
    </div>`;
}

function exerciseCard(ex, i, w, state) {
  const showKg = w.kind !== 'home' && ex.mode === 'reps';
  const last = showKg ? lastPerformance(state, ex.name, w.date) : null;
  const target = ex.sets[0]?.target;
  const doneCount = ex.sets.filter((s) => s.done).length;
  return `
    <section class="card ex-card ${doneCount === ex.sets.length && ex.sets.length ? 'complete' : ''}">
      <div class="card-head">
        <h3>${esc(ex.name)}</h3>${ex.progressed ? '<small class="prog-tag">⬆️ +2,5 kg : objectif atteint la dernière fois</small>' : ''}
        ${ex.mode === 'reps' ? `<button class="icon-btn" data-act="tempo" data-i="${i}" aria-label="Chronomètre de tempo">⏱</button>` : ''}
        <button class="icon-btn" data-act="info" data-i="${i}" aria-label="Comment faire">${ICON.info}</button>
      </div>
      ${mediaHtml(ex.name, 'sm')}
      <p class="small muted">${ex.sets.length} série${ex.sets.length > 1 ? 's' : ''}${target ? ` × ${target}${ex.mode === 'time' ? ' s' : ''}` : ''}${ex.perSide ? ' par côté' : ''}
        ${last ? `<br>Dernière fois : ${last.sets.map((s) => `${s.reps ?? '?'}${s.kg != null ? ` × ${nf(s.kg, 1)} kg` : ''}`).join(', ')}` : ''}</p>
      <div class="sets">${ex.sets.map((s, j) => setRow(ex, i, j, s, showKg)).join('')}</div>
      <div class="ex-actions">
        <button class="btn btn-link" data-act="addSet" data-i="${i}">+ Série</button>
        <button class="btn btn-link danger" data-act="removeEx" data-i="${i}">Retirer</button>
      </div>
    </section>`;
}

export function render(root, ctx) {
  const { state } = ctx;
  const w = state.activeWorkout;
  if (!w) {
    root.innerHTML = `
      <div class="empty">
        <div class="hero-emoji">💪</div>
        <p>Aucune séance en cours.</p>
        <a class="btn btn-primary" href="#/sport">Aller au programme</a>
      </div>`;
    return;
  }
  keepAwake();
  const totalSets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  root.innerHTML = `
    <section class="card workout-head">
      <div class="grow">
        <h2>${esc(w.title)}</h2>
        <small class="muted">${esc(formatRelative(w.date))} · ${doneSets} / ${totalSets} séries</small>
      </div>
      <div class="elapsed" id="elapsed">0:00</div>
    </section>

    ${w.kind !== 'free' ? `<details class="card ex-detail"><summary>🔥 Échauffement (5 min)</summary><ul>${warmupFor(w.kind).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}

    ${w.exercises.map((ex, i) => exerciseCard(ex, i, w, state)).join('')}

    <button class="btn btn-block" data-act="addEx">+ Ajouter un exercice</button>

    <section class="card">
      <div class="level-row">
        <button class="icon-btn" data-act="rest" data-d="-15" aria-label="Moins de repos">${ICON.minus}</button>
        <div class="grow center"><strong>Repos : ${w.rest} s</strong><small class="muted">entre deux séries</small></div>
        <button class="icon-btn" data-act="rest" data-d="15" aria-label="Plus de repos">${ICON.plus}</button>
      </div>
    </section>

    ${w.kind !== 'free' ? `<details class="card ex-detail"><summary>🧘 Retour au calme</summary><p>${esc(COOLDOWN)}</p></details>` : ''}

    <div class="btn-row">
      <button class="btn btn-danger-ghost" data-act="abandon">Abandonner</button>
      <button class="btn btn-primary grow" data-act="finish">Terminer la séance</button>
    </div>`;

  startAnimations(root);
  clearInterval(elapsedTimer);
  const tickElapsed = () => {
    const el = document.getElementById('elapsed');
    if (el) el.textContent = mmss(Math.floor((Date.now() - w.startedAt) / 1000));
  };
  tickElapsed();
  elapsedTimer = setInterval(tickElapsed, 1000);

  const mutate = (fn, opts) => store.update((s) => fn(s.activeWorkout), opts);
  const setAt = (el) => w.exercises[Number(el.dataset.i)].sets[Number(el.dataset.j)];

  const afterSetDone = (i, j) => {
    const remaining = w.exercises.some((e) => e.sets.some((s) => !s.done));
    if (!remaining) {
      toast('Toutes les séries sont faites ! Appuie sur « Terminer la séance ».', { icon: '🎉', duration: 4000 });
      return;
    }
    const ex = w.exercises[i];
    const nextInEx = ex.sets.findIndex((s, k) => k > j && !s.done);
    const nextEx = nextInEx >= 0 ? ex : w.exercises.find((e) => e.sets.some((s) => !s.done));
    showTimer({ seconds: w.rest, label: `Repos — ensuite : ${nextEx.name}`, kind: 'rest' });
  };

  bindActions(root, {
    // Champs texte : enregistrement silencieux (le champ affiche déjà la valeur),
    // pour que le toucher suivant sur ✓ ne soit pas perdu par un nouveau rendu.
    setVal(el) {
      const v = parseNum(el.value);
      mutate((aw) => (aw.exercises[el.dataset.i].sets[el.dataset.j].value = v == null ? null : Math.max(0, Math.round(v))), { silent: true });
    },
    setKg(el) {
      const v = parseNum(el.value);
      const i = Number(el.dataset.i);
      const j = Number(el.dataset.j);
      mutate((aw) => {
        const ex = aw.exercises[i];
        ex.sets[j].kg = v;
        // reporte la charge sur les séries suivantes encore vides
        for (let k = j + 1; k < ex.sets.length; k++) {
          if (ex.sets[k].kg != null || ex.sets[k].done) continue;
          ex.sets[k].kg = v;
          const input = root.querySelector(`[data-change="setKg"][data-i="${i}"][data-j="${k}"]`);
          if (input) input.value = v == null ? '' : nf(v, 1);
        }
      }, { silent: true });
    },
    toggleSet(el) {
      unlockAudio();
      const i = Number(el.dataset.i);
      const j = Number(el.dataset.j);
      const nowDone = !setAt(el).done;
      mutate((aw) => (aw.exercises[i].sets[j].done = nowDone));
      if (nowDone) afterSetDone(i, j);
      else stopTimer();
    },
    timeSet(el) {
      unlockAudio();
      const i = Number(el.dataset.i);
      const j = Number(el.dataset.j);
      const ex = w.exercises[i];
      showTimer({
        seconds: setAt(el).value || ex.sets[j].target || 30,
        label: `${ex.name} — série ${j + 1}`,
        kind: 'work',
        onDone: () => {
          mutate((aw) => (aw.exercises[i].sets[j].done = true));
          afterSetDone(i, j);
        },
      });
    },
    addSet(el) {
      mutate((aw) => {
        const ex = aw.exercises[el.dataset.i];
        const last = ex.sets[ex.sets.length - 1];
        ex.sets.push({ target: last?.target ?? 10, value: last?.value ?? 10, kg: last?.kg ?? null, done: false });
      });
    },
    async removeEx(el) {
      const ex = w.exercises[el.dataset.i];
      if (!(await confirmSheet({ title: `Retirer « ${ex.name} » ?`, message: 'Les séries de cet exercice ne seront pas enregistrées.', ok: 'Retirer', danger: true }))) return;
      mutate((aw) => aw.exercises.splice(Number(el.dataset.i), 1));
    },
    tempo(el) {
      openTempo(w.exercises[Number(el.dataset.i)]);
    },
    info(el) {
      const ex = w.exercises[el.dataset.i];
      const lib = findExercise(ex.name);
      openSheet({
        title: ex.name,
        html: `${mediaHtml(ex.name, 'lg')}${lib ? `<p>${esc(lib.desc)}</p>${lib.easier ? `<p class="small muted">Plus facile : ${esc(lib.easier)}</p>` : ''}` : '<p class="muted">Exercice personnalisé.</p>'}`,
        onMount: (body) => startAnimations(body),
      });
    },
    rest(el) {
      mutate((aw) => (aw.rest = Math.min(300, Math.max(15, aw.rest + Number(el.dataset.d)))));
    },
    addEx() {
      openAddExercise(w);
    },
    async abandon() {
      if (!(await confirmSheet({ title: 'Abandonner la séance ?', message: 'Rien ne sera enregistré.', ok: 'Abandonner', danger: true }))) return;
      cleanup();
      store.update((s) => (s.activeWorkout = null), { silent: true });
      ctx.go('sport');
    },
    finish() {
      openFinish(ctx, w);
    },
  });
}

function openAddExercise(w) {
  const all = [
    ...Object.values(HOME_EXERCISES).map((e) => ({ ...e, group: 'Maison' })),
    ...Object.values(GYM_EXERCISES).map((e) => ({ ...e, group: 'Salle' })),
  ];
  openSheet({
    title: 'Ajouter un exercice',
    html: `
      <input class="input" type="search" data-q placeholder="Rechercher…" autocomplete="off">
      <div class="pick-list" data-list></div>
      <h3 class="sub">Exercice personnalisé</h3>
      <div class="grid-2">
        <input class="input" data-name placeholder="Nom de l’exercice">
        <div class="seg"><button class="on" data-mode="reps">Reps</button><button data-mode="time">Secondes</button></div>
      </div>
      <button class="btn btn-block" data-custom>Ajouter</button>`,
    onMount(body, close) {
      const list = body.querySelector('[data-list]');
      const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      const draw = (q = '') => {
        const items = all.filter((e) => norm(e.name).includes(norm(q)));
        list.innerHTML = items.map((e) => `<button class="pick" data-name="${esc(e.name)}"><strong>${esc(e.name)}</strong><small>${e.group}</small></button>`).join('')
          || '<p class="muted small">Aucun résultat.</p>';
      };
      draw();
      const add = (ex) => {
        store.update((s) => s.activeWorkout.exercises.push(ex));
        close();
      };
      body.querySelector('[data-q]').addEventListener('input', (e) => draw(e.target.value));
      list.addEventListener('click', (e) => {
        const b = e.target.closest('[data-name]');
        if (!b) return;
        const lib = all.find((x) => x.name === b.dataset.name);
        add(newExercise(lib.name, lib.mode, !!lib.perSide));
      });
      let mode = 'reps';
      body.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
        mode = b.dataset.mode;
        body.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', x === b));
      }));
      body.querySelector('[data-custom]').addEventListener('click', () => {
        const name = body.querySelector('[data-name]').value.trim();
        if (!name) return toast('Donne un nom à l’exercice', { icon: '⚠️' });
        add(newExercise(name, mode));
      });
    },
  });
  if (!w.exercises.length) toast('Choisis tes exercices', { icon: '👇' });
}

function openFinish(ctx, w) {
  const state = store.get();
  const elapsed = Math.max(1, Math.round((Date.now() - w.startedAt) / 60000));
  const minutes = Math.min(elapsed, 120);
  const weight = currentWeight(state, w.date);
  const met = w.kind === 'stretch' ? 2.5 : w.kind === 'home' ? MET_HOME_SESSION : MET_GYM_SESSION;
  const doneSets = w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  let kcalEdited = false;

  openSheet({
    title: 'Bravo pour ta séance ! 🎉',
    html: `
      <p class="muted">${doneSets} série${doneSets > 1 ? 's' : ''} réalisée${doneSets > 1 ? 's' : ''}.</p>
      <div class="grid-2">
        <label class="field"><span>Durée (min)</span><input class="input" inputmode="numeric" data-min value="${minutes}"></label>
        <label class="field"><span>Calories (estimation)</span><input class="input" inputmode="numeric" data-kcal value="${kcalFromMet(met, weight, minutes)}"></label>
      </div>
      <label class="field"><span>Ressenti (facultatif)</span><input class="input" data-note placeholder="Facile, dur, fatigué…"></label>
      <button class="btn btn-primary btn-block" data-save>Enregistrer la séance</button>`,
    onMount(body, close) {
      const minEl = body.querySelector('[data-min]');
      const kcalEl = body.querySelector('[data-kcal]');
      minEl.addEventListener('input', () => {
        if (!kcalEdited) kcalEl.value = kcalFromMet(met, weight, parseNum(minEl.value) || 0);
      });
      kcalEl.addEventListener('input', () => (kcalEdited = true));
      body.querySelector('[data-save]').addEventListener('click', () => {
        const min = parseNum(minEl.value);
        if (!min || min <= 0) return toast('Indique la durée', { icon: '⚠️' });
        const record = {
          id: w.id,
          kind: w.kind,
          title: w.title,
          minutes: Math.round(min),
          kcal: Math.max(0, Math.round(parseNum(kcalEl.value) || 0)),
          note: body.querySelector('[data-note]').value.trim(),
          at: Date.now(),
          exercises: w.exercises
            .map((e) => ({
              name: e.name,
              mode: e.mode,
              sets: e.sets.filter((s) => s.done).map((s) => (e.mode === 'time' ? { sec: s.value } : { reps: s.value, kg: s.kg ?? null })),
            }))
            .filter((e) => e.sets.length),
        };
        cleanup();
        store.update((s) => {
          const d = (s.days[w.date] ||= {});
          (d.workouts ||= []).push(record);
          s.activeWorkout = null;
        }, { silent: true });
        close();
        applyReminders(store.get().reminders).catch(() => {});
        ctx.go('sport');
        toast('Séance enregistrée, bien joué !', { icon: '💪' });
      });
    },
  });
}

// --- Chronomètre de tempo : descente · pause · remontée, répétition par répétition ---------

const TEMPOS = [
  { id: '3-1-1', label: 'Lent : 3 s à la descente, 1 s de pause, 1 s à la remontée', ecc: 3, pause: 1, con: 1 },
  { id: '2-0-2', label: 'Contrôlé : 2 s à la descente, sans pause, 2 s à la remontée', ecc: 2, pause: 0, con: 2 },
  { id: '4-2-1', label: 'Très lent : 4 s, pause de 2 s, 1 s à la remontée', ecc: 4, pause: 2, con: 1 },
];

function openTempo(ex) {
  const reps = ex.sets[0]?.target || 10;
  let tempo = TEMPOS[0];
  let timer = null;
  let steps = [];
  let idx = 0;
  let phaseEnd = 0;
  let el = {};

  const stop = () => {
    clearInterval(timer);
    timer = null;
  };
  const plan = () => {
    const list = [];
    for (let rep = 1; rep <= reps; rep++) {
      list.push({ label: 'Descends', s: tempo.ecc, rep });
      if (tempo.pause) list.push({ label: 'Pause', s: tempo.pause, rep });
      list.push({ label: 'Remonte', s: tempo.con, rep });
    }
    return list;
  };
  const next = (now) => {
    if (idx >= steps.length) return false;
    const st = steps[idx++];
    phaseEnd = now + st.s * 1000;
    el.phase.textContent = `${st.label} · répétition ${st.rep} / ${reps}`;
    el.time.textContent = String(st.s);
    beep(1);
    return true;
  };
  const go = () => {
    stop();
    steps = plan();
    idx = 0;
    if (!next(Date.now())) return;
    timer = setInterval(() => {
      const now = Date.now();
      if (now >= phaseEnd && !next(now)) {
        stop();
        beep(2);
        el.phase.textContent = 'Série terminée 💪';
        el.time.textContent = '0';
        return;
      }
      el.time.textContent = String(Math.max(0, Math.ceil((phaseEnd - now) / 1000)));
    }, 200);
  };

  openSheet({
    title: `Tempo — ${ex.name}`,
    html: `
      <div class="chips" data-tempos>${TEMPOS.map((t) => `<button class="chip ${t.id === tempo.id ? 'on' : ''}" data-id="${t.id}">${t.id}</button>`).join('')}</div>
      <p class="small muted" data-desc>${esc(tempo.label)}</p>
      <div class="interval-big" data-time>—</div>
      <p class="center" data-phase>Prêt ?</p>
      <div class="btn-row"><button class="btn btn-primary grow" data-go>Démarrer (${reps} répétitions)</button></div>`,
    onMount(body, close) {
      el = { time: body.querySelector('[data-time]'), phase: body.querySelector('[data-phase]') };
      body.querySelector('[data-tempos]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-id]');
        if (!b) return;
        stop();
        tempo = TEMPOS.find((t) => t.id === b.dataset.id);
        body.querySelectorAll('[data-tempos] .chip').forEach((c) => c.classList.toggle('on', c === b));
        body.querySelector('[data-desc]').textContent = tempo.label;
        el.phase.textContent = 'Prêt ?';
        el.time.textContent = '—';
      });
      body.querySelector('[data-go]').addEventListener('click', () => {
        unlockAudio();
        go();
      });
    },
    onClose: stop,
  });
}
