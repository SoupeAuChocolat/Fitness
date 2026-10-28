// Onglet Habitudes : compteurs, check-in du jour, ajout / modification.
import * as store from '../store.js';
import { habitStats } from '../calc.js';
import { formatDayMonth, todayKey } from '../dates.js';
import { HABIT_ICONS, HABIT_PRESETS } from '../data/habits.js';
import { openFailSheet, openSosSheet, toggleOk } from '../habit-actions.js';
import { bindActions, esc, fmtEuro, ICON, nf, openSheet, parseNum, plural, progressBar, toast } from '../ui.js';

export function savingsLine(h, s) {
  const parts = [];
  if (s.money > 0) parts.push(`💶 ${fmtEuro(s.money)} économisés`);
  if (s.units > 0 && h.unitLabel) parts.push(`${nf(s.units)} ${esc(h.unitLabel)} évité${s.units > 1 ? 's' : ''}`);
  return parts.length ? `<p class="small savings">${parts.join(' · ')}</p>` : '';
}

function habitCard(h, today) {
  const s = habitStats(h, today);
  const st = s.todayStatus;
  return `
    <article class="card habit-card">
      <a class="hc-top" href="#/habit/${h.id}">
        <span class="hc-icon big">${h.icon}</span>
        <span class="grow"><strong class="hc-name">${esc(h.name)}</strong><small class="muted">Depuis le ${formatDayMonth(h.startDate)}</small></span>
        <span class="chev">${ICON.right}</span>
      </a>
      <div class="hc-streak">
        <span class="streak-num">${s.current}</span>
        <span>jour${s.current > 1 ? 's' : ''} d’affilée<br><small class="muted">Record : ${plural(s.best, 'jour')}</small></span>
      </div>
      ${progressBar(s.progress, 'bar-accent')}
      <p class="small muted">Prochain palier : ${plural(s.next, 'jour')} — encore ${plural(s.toNext, 'jour')}</p>
      ${savingsLine(h, s)}
      <div class="hc-actions">
        <button class="pill grow ${st === 'ok' ? 'pill-ok' : ''}" data-act="hok" data-id="${h.id}" aria-pressed="${st === 'ok'}">✓ Tenu</button>
        <button class="pill ${st === 'fail' ? 'pill-fail' : ''}" data-act="hfail" data-id="${h.id}" aria-pressed="${st === 'fail'}">✗ Craqué</button>
        <button class="pill pill-sos" data-act="sos" data-id="${h.id}">🆘 Envie</button>
      </div>
    </article>`;
}

export function openHabitEditor(habit = null) {
  const state = store.get();
  const today = todayKey();
  const usedPresets = new Set(state.habits.map((h) => h.preset).filter(Boolean));
  const free = Object.entries(HABIT_PRESETS).filter(([id]) => !usedPresets.has(id));
  const d = habit
    ? { ...habit }
    : { preset: null, name: '', icon: HABIT_ICONS[0], startDate: today, costPerDay: 0, unitsPerDay: 0, unitLabel: '' };

  openSheet({
    title: habit ? 'Modifier l’habitude' : 'Nouvelle habitude',
    html: `
      ${!habit && free.length ? `
        <div class="field"><span>Suggestions</span>
          <div class="chips">${free.map(([id, p]) => `<button class="chip" data-preset="${id}">${p.icon} ${esc(p.name)}</button>`).join('')}</div>
        </div>` : ''}
      <label class="field"><span>Nom</span><input class="input" data-name value="${esc(d.name)}" placeholder="Ex. Sodas, réseaux sociaux…"></label>
      <div class="field"><span>Icône</span>
        <div class="icon-pick">${HABIT_ICONS.map((i) => `<button class="${i === d.icon ? 'on' : ''}" data-icon="${i}">${i}</button>`).join('')}</div>
      </div>
      <label class="field"><span>Arrêté depuis le</span><input class="input" type="date" data-start value="${d.startDate}" max="${today}"></label>
      <div class="grid-2">
        <label class="field"><span>Économie par jour (€)</span><input class="input" inputmode="decimal" data-cost value="${d.costPerDay ? nf(d.costPerDay, 2) : ''}" placeholder="0"></label>
        <label class="field"><span>Quantité évitée / jour</span><input class="input" inputmode="decimal" data-units value="${d.unitsPerDay ? nf(d.unitsPerDay, 1) : ''}" placeholder="0"></label>
      </div>
      <label class="field"><span>Unité (ex. cigarettes, verres, canettes)</span><input class="input" data-unit value="${esc(d.unitLabel || '')}"></label>
      <button class="btn btn-primary btn-block" data-save>${habit ? 'Enregistrer' : 'Ajouter'}</button>`,
    onMount(body, close) {
      const $ = (sel) => body.querySelector(sel);
      body.addEventListener('click', (e) => {
        const ic = e.target.closest('[data-icon]');
        if (ic) {
          d.icon = ic.dataset.icon;
          body.querySelectorAll('[data-icon]').forEach((b) => b.classList.toggle('on', b === ic));
        }
        const pr = e.target.closest('[data-preset]');
        if (pr) {
          const p = HABIT_PRESETS[pr.dataset.preset];
          d.preset = pr.dataset.preset;
          d.icon = p.icon;
          $('[data-name]').value = p.name;
          $('[data-unit]').value = p.unitLabel || '';
          body.querySelectorAll('[data-icon]').forEach((b) => b.classList.toggle('on', b.dataset.icon === p.icon));
          body.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('on', b === pr));
        }
      });
      $('[data-save]').addEventListener('click', () => {
        const name = $('[data-name]').value.trim();
        const start = $('[data-start]').value || today;
        if (!name) return toast('Donne un nom à l’habitude', { icon: '⚠️' });
        if (start > today) return toast('La date ne peut pas être dans le futur', { icon: '⚠️' });
        const fields = {
          name,
          icon: d.icon,
          startDate: start,
          costPerDay: Math.max(0, parseNum($('[data-cost]').value) || 0),
          unitsPerDay: Math.max(0, parseNum($('[data-units]').value) || 0),
          unitLabel: $('[data-unit]').value.trim(),
        };
        store.update((s) => {
          if (habit) {
            const h = s.habits.find((x) => x.id === habit.id);
            if (h.startDate !== fields.startDate) h.startedAt = null;
            Object.assign(h, fields);
          } else {
            s.habits.push({
              id: store.uid(), preset: d.preset, ...fields,
              startedAt: start === today ? Date.now() : null,
              log: {}, urges: [], relapses: [], archived: false,
            });
          }
        });
        close();
        toast(habit ? 'Habitude modifiée' : 'Habitude ajoutée, courage !', { icon: d.icon });
      });
    },
  });
}

export function render(root, ctx) {
  const { state } = ctx;
  const today = todayKey();
  const active = state.habits.filter((h) => !h.archived);
  const archived = state.habits.filter((h) => h.archived);

  root.innerHTML = `
    <p class="intro small muted">Chaque soir, note si tu as tenu ✓. Un jour non noté compte comme tenu ; seul « Craqué » remet le compteur à zéro. En cas d’envie, appuie sur 🆘.</p>
    ${active.length ? active.map((h) => habitCard(h, today)).join('') : '<div class="empty"><div class="hero-emoji">🛡️</div><p>Aucune habitude suivie pour l’instant.</p></div>'}
    <button class="btn btn-block" data-act="add">+ Ajouter une habitude</button>
    ${archived.length ? `
      <details class="card ex-detail">
        <summary>Habitudes archivées (${archived.length})</summary>
        ${archived.map((h) => `
          <div class="list-item"><span class="li-icon">${h.icon}</span><span class="grow">${esc(h.name)}</span>
            <button class="btn btn-sm" data-act="restore" data-id="${h.id}">Réactiver</button></div>`).join('')}
      </details>` : ''}`;

  const find = (el) => state.habits.find((h) => h.id === el.dataset.id);
  bindActions(root, {
    hok: (el) => toggleOk(find(el), today),
    hfail: (el) => openFailSheet(find(el), today),
    sos: (el) => openSosSheet(find(el)),
    add: () => openHabitEditor(),
    restore(el) {
      store.update((s) => (s.habits.find((h) => h.id === el.dataset.id).archived = false));
    },
  });
}
