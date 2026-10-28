// Détail d'une habitude : calendrier, paliers, déclencheurs, journal, conseils.
import * as store from '../store.js';
import { cleanSinceMs, habitStats } from '../calc.js';
import { addDays, formatDayMonth, formatFull, formatMonth, parseKey, todayKey, toKey, weekStart } from '../dates.js';
import { GENERIC_TIPS, HABIT_PRESETS, MILESTONES, TOBACCO_TIMELINE } from '../data/habits.js';
import { openSosSheet, setStatus } from '../habit-actions.js';
import { bindActions, confirmSheet, esc, fmtEuro, ICON, nf, plural } from '../ui.js';
import { openHabitEditor } from './habits.js';

let month = null; // premier jour du mois affiché (AAAA-MM-01)
let monthHabit = null;

function calendar(h, today) {
  const first = month;
  const d = parseKey(first);
  const last = toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const start = weekStart(first);
  const cells = [];
  for (let k = start; k <= last || cells.length % 7; k = addDays(k, 1)) {
    const inMonth = k >= first && k <= last;
    const st = h.log?.[k];
    const tracked = k >= h.startDate && k <= today;
    const cls = !inMonth ? 'out' : !tracked ? 'off' : st === 'fail' ? 'fail' : st === 'ok' ? 'ok' : 'clean';
    cells.push(inMonth
      ? `<button class="cal-day ${cls} ${k === today ? 'today' : ''}" data-act="cycle" data-k="${k}" ${tracked ? '' : 'disabled'} aria-label="${formatFull(k)}">${Number(k.slice(8))}</button>`
      : '<span class="cal-day out"></span>');
  }
  return `
    <div class="cal-head">
      <button class="icon-btn" data-act="month" data-d="-1" aria-label="Mois précédent">${ICON.left}</button>
      <strong>${formatMonth(first)}</strong>
      <button class="icon-btn" data-act="month" data-d="1" aria-label="Mois suivant" ${last >= today ? 'disabled' : ''}>${ICON.right}</button>
    </div>
    <div class="cal-grid">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<span class="cal-dow">${x}</span>`).join('')}${cells.join('')}</div>
    <div class="cal-legend small">
      <span><i class="cl ok"></i>Tenu (noté)</span><span><i class="cl clean"></i>Non noté</span><span><i class="cl fail"></i>Craqué</span>
    </div>
    <p class="small muted">Touche un jour pour changer son statut.</p>`;
}

function timeline(h, s) {
  const hours = (Date.now() - cleanSinceMs(h, s)) / 3600000;
  return `
    <section class="card">
      <div class="card-head"><h2>🫁 Ton corps récupère</h2></div>
      <ol class="timeline">
        ${TOBACCO_TIMELINE.map((step) => {
          const done = hours >= step.hours;
          const pct = Math.min(1, hours / step.hours);
          return `<li class="${done ? 'done' : ''}">
            <strong>${step.label}</strong> ${done ? '✅' : `<small class="muted">${nf(pct * 100)} %</small>`}
            <p class="small">${esc(step.text)}</p></li>`;
        }).join('')}
      </ol>
      <p class="small muted">Repères moyens issus de Tabac Info Service et de l’OMS : ils varient d’une personne à l’autre.</p>
    </section>`;
}

export function render(root, ctx) {
  const { state, args } = ctx;
  const h = state.habits.find((x) => x.id === args[0]);
  if (!h) {
    root.innerHTML = '<div class="empty"><p>Habitude introuvable.</p><a class="btn" href="#/habits">Retour</a></div>';
    return;
  }
  const today = todayKey();
  if (!month || monthHabit !== h.id) {
    month = `${today.slice(0, 7)}-01`;
    monthHabit = h.id;
  }
  const s = habitStats(h, today);
  const preset = HABIT_PRESETS[h.preset];
  const journal = [
    ...(h.relapses || []).map((r) => ({ ...r, type: 'fail' })),
    ...(h.urges || []).map((u) => ({ ...u, type: 'urge' })),
  ]
    .sort((a, b) => (a.date === b.date ? (b.at || 0) - (a.at || 0) : a.date < b.date ? 1 : -1))
    .slice(0, 25);
  const maxTrigger = s.triggers[0]?.[1] || 1;

  root.innerHTML = `
    <a class="btn btn-link back" href="#/habits">${ICON.left} Habitudes</a>
    <section class="card habit-hero center">
      <div class="hc-icon huge">${h.icon}</div>
      <h1>${esc(h.name)}</h1>
      <div class="streak-big">${s.current}</div>
      <div>jour${s.current > 1 ? 's' : ''} d’affilée</div>
      <small class="muted">${s.cleanStart > today ? 'Nouveau départ demain matin 🌅' : `Série en cours depuis le ${formatFull(s.cleanStart)}`}</small>
      <button class="btn btn-sos btn-block" data-act="sos">🆘 J’ai une envie</button>
    </section>

    <div class="tiles">
      <div class="tile"><small>Record</small><strong>${plural(s.best, 'jour')}</strong></div>
      <div class="tile"><small>Jours tenus au total</small><strong>${nf(s.totalClean)}</strong></div>
      <div class="tile"><small>Envies résistées</small><strong>${nf(s.urgesResisted)}</strong></div>
      ${s.money > 0 ? `<div class="tile"><small>Économisé</small><strong>${fmtEuro(s.money)}</strong></div>`
        : `<div class="tile"><small>Rechutes</small><strong>${nf(s.relapses)}</strong></div>`}
      ${s.units > 0 && h.unitLabel ? `<div class="tile tile-wide"><small>${esc(h.unitLabel)} évité${s.units > 1 ? 's' : ''}</small><strong>${nf(s.units)}</strong></div>` : ''}
    </div>

    <section class="card">${calendar(h, today)}</section>

    <section class="card">
      <div class="card-head"><h2>🏅 Paliers</h2></div>
      <div class="milestones">
        ${MILESTONES.map((m) => `<span class="milestone ${s.best >= m ? 'on' : ''}">${m} j</span>`).join('')}
      </div>
      <p class="small muted">Prochain palier : ${plural(s.next, 'jour')} — encore ${plural(s.toNext, 'jour')}.</p>
    </section>

    ${h.preset === 'tobacco' ? timeline(h, s) : ''}

    ${s.triggers.length ? `
    <section class="card">
      <div class="card-head"><h2>🎯 Tes déclencheurs</h2></div>
      ${s.triggers.slice(0, 5).map(([t, n]) => `
        <div class="trigger-row"><span>${esc(t)}</span><div class="bar"><span style="width:${(n / maxTrigger) * 100}%"></span></div><b>${n}</b></div>`).join('')}
      <p class="small muted">Connaître ses déclencheurs aide à prévoir une parade.</p>
    </section>` : ''}

    ${journal.length ? `
    <section class="card">
      <div class="card-head"><h2>📓 Journal</h2></div>
      ${journal.map((e) => `
        <div class="list-item">
          <span class="li-icon">${e.type === 'fail' ? '✗' : '🧠'}</span>
          <span class="grow"><strong>${e.type === 'fail' ? 'Rechute' : 'Envie résistée'}</strong>
            <small>${formatDayMonth(e.date)}${e.at ? ` à ${new Date(e.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}${e.trigger ? ` · ${esc(e.trigger)}` : ''}</small>
            ${e.note ? `<small class="note">« ${esc(e.note)} »</small>` : ''}</span>
        </div>`).join('')}
    </section>` : ''}

    <section class="card">
      <div class="card-head"><h2>💡 Conseils</h2></div>
      <ul class="tips">${(preset?.tips || GENERIC_TIPS).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      ${preset?.help ? `<p class="help small">📞 ${esc(preset.help)}</p>` : ''}
    </section>

    <div class="btn-row">
      <button class="btn grow" data-act="edit">${ICON.edit} Modifier</button>
      <button class="btn grow" data-act="archive">Archiver</button>
      <button class="btn btn-danger-ghost" data-act="delete" aria-label="Supprimer">${ICON.trash}</button>
    </div>`;

  bindActions(root, {
    sos: () => openSosSheet(h),
    cycle(el) {
      const k = el.dataset.k;
      const cur = h.log?.[k];
      setStatus(h.id, k, cur == null ? 'ok' : cur === 'ok' ? 'fail' : null);
    },
    month(el) {
      const d = parseKey(month);
      month = toKey(new Date(d.getFullYear(), d.getMonth() + Number(el.dataset.d), 1));
      ctx.rerender();
    },
    edit: () => openHabitEditor(h),
    async archive() {
      if (!(await confirmSheet({ title: 'Archiver cette habitude ?', message: 'Elle disparaît de l’écran principal mais tes données sont gardées. Tu pourras la réactiver.', ok: 'Archiver' }))) return;
      store.update((st) => (st.habits.find((x) => x.id === h.id).archived = true), { silent: true });
      ctx.go('habits');
    },
    async delete() {
      if (!(await confirmSheet({ title: 'Supprimer définitivement ?', message: `Tout l’historique de « ${h.name} » sera effacé.`, ok: 'Supprimer', danger: true }))) return;
      store.update((st) => (st.habits = st.habits.filter((x) => x.id !== h.id)), { silent: true });
      ctx.go('habits');
    },
  });
}
