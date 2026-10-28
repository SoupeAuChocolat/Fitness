// Actions communes sur les habitudes : check-in, rechute, bouton SOS.
import * as store from './store.js';
import { habitStats } from './calc.js';
import { todayKey } from './dates.js';
import { GENERIC_TIPS, HABIT_PRESETS, TRIGGERS } from './data/habits.js';
import { esc, openSheet, plural, toast } from './ui.js';

const findHabit = (s, id) => s.habits.find((h) => h.id === id);

export function setStatus(habitId, date, status) {
  store.update((s) => {
    const h = findHabit(s, habitId);
    if (!h) return;
    h.log ||= {};
    if (status) h.log[date] = status;
    else delete h.log[date];
    if (status !== 'fail') h.relapses = (h.relapses || []).filter((r) => r.date !== date);
  });
}

export function toggleOk(habit, date) {
  const wasOk = habit.log?.[date] === 'ok';
  setStatus(habit.id, date, wasOk ? null : 'ok');
  if (!wasOk) {
    const n = habitStats(findHabit(store.get(), habit.id), todayKey()).current;
    toast(n > 1 ? `Bravo, ${n} jours d’affilée !` : 'Bravo, une journée de gagnée !', { icon: '💪' });
  }
}

const triggerChips = () =>
  `<div class="chips" data-triggers>${TRIGGERS.map((t) => `<button type="button" class="chip" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>`;

function bindTriggerChips(body) {
  let selected = null;
  body.querySelector('[data-triggers]').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-t]');
    if (!chip) return;
    const on = !chip.classList.contains('on');
    body.querySelectorAll('[data-t]').forEach((c) => c.classList.remove('on'));
    chip.classList.toggle('on', on);
    selected = on ? chip.dataset.t : null;
  });
  return () => selected;
}

export function openFailSheet(habit, date) {
  if (habit.log?.[date] === 'fail') {
    setStatus(habit.id, date, null);
    return;
  }
  const stats = habitStats(habit, todayKey());
  openSheet({
    title: 'Ce n’est pas grave',
    html: `
      <p>Une rechute n’efface pas tes progrès${stats.totalClean ? ` : tu as déjà tenu <strong>${plural(stats.totalClean, 'jour')}</strong> au total` : ''}. On repart dès maintenant&nbsp;💪</p>
      <div class="field"><span>Qu’est-ce qui a déclenché l’envie ? (facultatif)</span>${triggerChips()}</div>
      <label class="field"><span>Note pour toi (facultatif)</span>
        <textarea class="input" rows="2" data-note placeholder="Ce que je ferai différemment la prochaine fois…"></textarea></label>
      <div class="btn-row">
        <button class="btn" data-close>Annuler</button>
        <button class="btn btn-danger grow" data-save>Noter la rechute</button>
      </div>`,
    onMount(body, close) {
      const getTrigger = bindTriggerChips(body);
      body.querySelector('[data-save]').addEventListener('click', () => {
        const note = body.querySelector('[data-note]').value.trim();
        store.update((s) => {
          const h = findHabit(s, habit.id);
          h.log ||= {};
          h.log[date] = 'fail';
          h.relapses ||= [];
          h.relapses.push({ date, at: date === todayKey() ? Date.now() : null, trigger: getTrigger(), note });
        });
        close();
        toast('Noté. Chaque jour est un nouveau départ.', { icon: '🌅' });
      });
    },
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Exercice de respiration (inspire 4 s, expire 6 s, pendant 1 minute) + conseils.
export function openSosSheet(habit) {
  const preset = HABIT_PRESETS[habit.preset];
  const tips = shuffle([...(preset?.tips || GENERIC_TIPS)]).slice(0, 3);
  let timers = [];
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  openSheet({
    title: `Envie de craquer ? ${habit.icon}`,
    onClose: clearTimers,
    html: `
      <p class="muted small">Une envie est comme une vague : elle monte, atteint un pic, puis redescend. Tiens bon quelques minutes.</p>
      <div class="breath">
        <div class="breath-circle" data-circle><span data-label>Respire</span></div>
        <button class="btn btn-primary" data-breath>Respirer 1 minute</button>
      </div>
      <ul class="tips">${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      ${preset?.help ? `<p class="help small">📞 ${esc(preset.help)}</p>` : ''}
      <div class="field"><span>Ce qui a déclenché l’envie (facultatif)</span>${triggerChips()}</div>
      <button class="btn btn-good btn-block" data-resisted>L’envie est passée, j’ai résisté 💪</button>
      <button class="btn btn-link muted btn-block" data-relapse>J’ai craqué</button>`,
    onMount(body, close) {
      const getTrigger = bindTriggerChips(body);
      const circle = body.querySelector('[data-circle]');
      const label = body.querySelector('[data-label]');
      const btn = body.querySelector('[data-breath]');

      btn.addEventListener('click', () => {
        clearTimers();
        btn.disabled = true;
        const cycles = 6;
        let t = 0;
        for (let c = 0; c < cycles; c++) {
          timers.push(setTimeout(() => {
            circle.className = 'breath-circle inhale';
            label.textContent = 'Inspire…';
          }, t));
          t += 4000;
          timers.push(setTimeout(() => {
            circle.className = 'breath-circle exhale';
            label.textContent = 'Expire…';
          }, t));
          t += 6000;
        }
        timers.push(setTimeout(() => {
          circle.className = 'breath-circle';
          label.textContent = 'Bien joué';
          btn.disabled = false;
          btn.textContent = 'Recommencer';
        }, t));
      });

      body.querySelector('[data-resisted]').addEventListener('click', () => {
        store.update((s) => {
          const h = findHabit(s, habit.id);
          h.urges ||= [];
          h.urges.push({ date: todayKey(), at: Date.now(), trigger: getTrigger() });
        });
        const n = findHabit(store.get(), habit.id).urges.length;
        close();
        toast(`Bravo ! ${plural(n, 'envie résistée', 'envies résistées')}.`, { icon: '🧠' });
      });

      body.querySelector('[data-relapse]').addEventListener('click', () => {
        close();
        setTimeout(() => openFailSheet(findHabit(store.get(), habit.id), todayKey()), 250);
      });
    },
  });
}

// Choix de l'habitude quand plusieurs sont suivies.
export function openSosPicker(habits) {
  if (habits.length === 1) return openSosSheet(habits[0]);
  openSheet({
    title: 'Quelle envie ?',
    html: `<div class="choice-list">${habits.map((h) => `
      <button class="choice" data-id="${h.id}"><strong>${h.icon} ${esc(h.name)}</strong></button>`).join('')}</div>`,
    onMount(body, close) {
      body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-id]');
        if (!b) return;
        close();
        setTimeout(() => openSosSheet(habits.find((h) => h.id === b.dataset.id)), 250);
      });
    },
  });
}
