// Journal alimentaire : repas du jour, recherche d'aliments, aliments perso.
import * as store from '../store.js';
import { calorieTarget, currentWeight, dayTotals, frequentFoods } from '../calc.js';
import { addDays } from '../dates.js';
import { FOODS } from '../data/foods.js';
import { bindActions, dateNav, esc, ICON, nf, openSheet, parseNum, progressBar, toast } from '../ui.js';

export const MEALS = [
  { id: 'breakfast', label: 'Petit-déjeuner', icon: '🥐' },
  { id: 'lunch', label: 'Déjeuner', icon: '🍽️' },
  { id: 'snack', label: 'Collations', icon: '🍎' },
  { id: 'dinner', label: 'Dîner', icon: '🌙' },
];

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function addItem(date, item) {
  store.update((s) => {
    const d = (s.days[date] ||= {});
    (d.meals ||= []).push({ id: store.uid(), ...item, kcal: Math.round(item.kcal) });
  });
}

function openAddFood(date, mealId) {
  const state = store.get();
  const custom = state.customFoods.map((f) => ({ ...f, c: 'Mes aliments' }));
  const all = [...custom, ...FOODS];
  const frequent = frequentFoods(state, date);
  let meal = mealId;

  openSheet({
    title: 'Ajouter un aliment',
    className: 'sheet-tall',
    html: `
      <div class="seg seg-4" data-meals>
        ${MEALS.map((m) => `<button class="${m.id === meal ? 'on' : ''}" data-meal="${m.id}">${m.icon}<small>${m.label}</small></button>`).join('')}
      </div>
      <div class="seg" data-tabs>
        <button class="on" data-tab="search">Rechercher</button>
        <button data-tab="create">Créer un aliment</button>
      </div>
      <div data-panel="search">
        <input class="input" type="search" data-q placeholder="Pâtes, pomme, kebab…" autocomplete="off">
        ${frequent.length ? `
          <div class="field" data-freq>
            <span>Fréquents — 1 clic pour ajouter</span>
            <div class="chips">${frequent.map((f, i) => `<button class="chip" data-freq-i="${i}">${esc(f.name)} · ${nf(f.kcal)}</button>`).join('')}</div>
          </div>` : ''}
        <div class="pick-list" data-list></div>
      </div>
      <div data-panel="create" hidden>
        <label class="field"><span>Nom</span><input class="input" data-cname placeholder="Ex. Salade de pâtes maison"></label>
        <div class="grid-2">
          <label class="field"><span>Calories (kcal)</span><input class="input" inputmode="numeric" data-ckcal placeholder="450"></label>
          <label class="field"><span>Portion (facultatif)</span><input class="input" data-cportion placeholder="1 assiette"></label>
        </div>
        <label class="check-line"><input type="checkbox" data-csave checked> Enregistrer dans « Mes aliments »</label>
        <button class="btn btn-primary btn-block" data-create>Ajouter</button>
        <p class="small muted">Astuce : les calories sont indiquées sur l’emballage (pour 100 g ou par portion).</p>
      </div>
      <div data-panel="qty" hidden></div>`,
    onMount(body, close) {
      const list = body.querySelector('[data-list]');
      const panels = {
        search: body.querySelector('[data-panel="search"]'),
        create: body.querySelector('[data-panel="create"]'),
        qty: body.querySelector('[data-panel="qty"]'),
      };
      const tabs = body.querySelector('[data-tabs]');
      const show = (name) => {
        Object.entries(panels).forEach(([k, el]) => (el.hidden = k !== name));
        tabs.hidden = name === 'qty';
        tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
      };
      const mealLabel = () => MEALS.find((m) => m.id === meal).label.toLowerCase();

      const draw = (q = '') => {
        const nq = norm(q.trim());
        const items = nq ? all.filter((f) => norm(f.n).includes(nq)) : all;
        let html = '';
        let cat = null;
        items.slice(0, nq ? 60 : 400).forEach((f) => {
          if (!nq && f.c !== cat) {
            cat = f.c;
            html += `<h3 class="sub">${esc(cat)}</h3>`;
          }
          html += `<button class="pick" data-i="${all.indexOf(f)}"><span class="grow"><strong>${esc(f.n)}</strong><small>${esc(f.p || '')}</small></span><b>${nf(f.k)}</b></button>`;
        });
        list.innerHTML = html || '<p class="muted small">Aucun aliment trouvé. Crée-le dans l’onglet « Créer un aliment ».</p>';
      };
      draw();

      body.querySelector('[data-meals]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-meal]');
        if (!b) return;
        meal = b.dataset.meal;
        body.querySelectorAll('[data-meal]').forEach((x) => x.classList.toggle('on', x === b));
        const addBtn = panels.qty.querySelector('[data-add]');
        if (addBtn) addBtn.textContent = `Ajouter au ${mealLabel()}`;
      });
      tabs.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tab]');
        if (b) show(b.dataset.tab);
      });
      body.querySelector('[data-q]').addEventListener('input', (e) => draw(e.target.value));

      body.querySelector('[data-freq]')?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-freq-i]');
        if (!b) return;
        const f = frequent[Number(b.dataset.freqI)];
        addItem(date, { meal, name: f.name, qty: f.qty, kcal: f.kcal });
        toast(`Ajouté : ${f.name}`, { icon: '✅' });
        close();
      });

      list.addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]');
        if (!b) return;
        const f = all[Number(b.dataset.i)];
        const byGram = !!f.g;
        panels.qty.innerHTML = `
          <button class="btn btn-link" data-back>${ICON.left} Retour</button>
          <h3>${esc(f.n)}</h3>
          <p class="small muted">${esc(f.p || '')} · ${nf(f.k)} kcal</p>
          ${byGram ? `
            <label class="field"><span>Quantité (g)</span><input class="input input-big" inputmode="decimal" data-qty value="${f.g}"></label>
            <div class="chips">${[0.5, 1, 1.5, 2].map((m) => `<button class="chip" data-mult="${m}">${nf(f.g * m)} g</button>`).join('')}</div>` : `
            <div class="field"><span>Nombre de portions</span>
              <div class="stepper big">
                <button class="icon-btn" data-step="-0.5" aria-label="Moins">${ICON.minus}</button>
                <strong data-portions>1</strong>
                <button class="icon-btn" data-step="0.5" aria-label="Plus">${ICON.plus}</button>
              </div></div>`}
          <div class="callout center"><span class="callout-big" data-total>${nf(f.k)} kcal</span></div>
          <button class="btn btn-primary btn-block" data-add>Ajouter au ${mealLabel()}</button>`;
        show('qty');
        let portions = 1;
        const qtyEl = panels.qty.querySelector('[data-qty]');
        const compute = () => (byGram ? (f.k * (parseNum(qtyEl.value) || 0)) / f.g : f.k * portions);
        const refresh = () => (panels.qty.querySelector('[data-total]').textContent = `${nf(compute())} kcal`);
        // affectation directe : remplace les gestionnaires de l'aliment précédent
        panels.qty.oninput = refresh;
        panels.qty.onclick = (ev) => {
          const t = ev.target.closest('button');
          if (!t) return;
          if (t.dataset.back != null) return show('search');
          if (t.dataset.mult) {
            qtyEl.value = nf(f.g * Number(t.dataset.mult));
            refresh();
          }
          if (t.dataset.step) {
            portions = Math.max(0.5, portions + Number(t.dataset.step));
            panels.qty.querySelector('[data-portions]').textContent = nf(portions, 1);
            refresh();
          }
          if (t.dataset.add != null) {
            const qty = byGram ? `${nf(parseNum(qtyEl.value) || 0)} g` : portions === 1 ? f.p || '1 portion' : `${nf(portions, 1)} portions · ${f.p || ''}`;
            if (compute() <= 0 && f.k > 0) return toast('Indique une quantité', { icon: '⚠️' });
            addItem(date, { meal, name: f.n, qty, kcal: compute() });
            toast(`Ajouté : ${f.n}`, { icon: '✅' });
            close();
          }
        };
      });

      body.querySelector('[data-create]').addEventListener('click', () => {
        const name = body.querySelector('[data-cname]').value.trim();
        const kcal = parseNum(body.querySelector('[data-ckcal]').value);
        const portion = body.querySelector('[data-cportion]').value.trim();
        if (!name) return toast('Donne un nom à l’aliment', { icon: '⚠️' });
        if (kcal == null || kcal < 0 || kcal > 5000) return toast('Indique les calories', { icon: '⚠️' });
        if (body.querySelector('[data-csave]').checked) {
          store.update((s) => {
            s.customFoods = s.customFoods.filter((f) => f.n !== name);
            s.customFoods.unshift({ n: name, p: portion, k: Math.round(kcal) });
          }, { silent: true });
        }
        addItem(date, { meal, name, qty: portion || '1 portion', kcal });
        toast(`Ajouté : ${name}`, { icon: '✅' });
        close();
      });
    },
  });
}

export function render(root, ctx) {
  const { state, ui } = ctx;
  const key = ui.date;
  const day = state.days[key] || {};
  const p = state.profile;
  const target = calorieTarget(p, currentWeight(state, key), key).target;
  const t = dayTotals(day);
  const yesterday = state.days[addDays(key, -1)] || {};
  const left = target - t.eaten;

  root.innerHTML = `
    ${dateNav(key)}
    <section class="card">
      <div class="goal-line"><span><strong>${nf(t.eaten)}</strong> / ${nf(target)} kcal</span>
        <span class="${left < 0 ? 'bad-text' : 'good-text'}">${left < 0 ? `${nf(-left)} en trop` : `${nf(left)} restantes`}</span></div>
      ${progressBar(t.eaten / target, left < 0 ? 'bar-over' : 'bar-accent')}
      ${t.burned ? `<p class="small muted">+ ${nf(t.burned)} kcal brûlées au sport aujourd’hui 💪</p>` : ''}
    </section>

    ${MEALS.map((m) => {
      const items = (day.meals || []).filter((x) => x.meal === m.id);
      const sub = items.reduce((s, x) => s + x.kcal, 0);
      const yItems = (yesterday.meals || []).filter((x) => x.meal === m.id);
      return `
        <section class="card">
          <div class="card-head"><h2>${m.icon} ${m.label}</h2><span class="small muted">${nf(sub)} kcal</span></div>
          ${items.map((x) => `
            <div class="list-item">
              <span class="grow"><strong>${esc(x.name)}</strong><small>${esc(x.qty || '')}</small></span>
              <b>${nf(x.kcal)}</b>
              <button class="icon-btn" data-act="del" data-id="${x.id}" aria-label="Supprimer ${esc(x.name)}">${ICON.trash}</button>
            </div>`).join('')}
          <div class="btn-row">
            <button class="btn grow" data-act="add" data-meal="${m.id}">+ Ajouter</button>
            ${!items.length && yItems.length ? `<button class="btn btn-ghost" data-act="copy" data-meal="${m.id}" title="Copier les aliments d'hier">↺ Comme hier</button>` : ''}
          </div>
        </section>`;
    }).join('')}

    <p class="small muted center">Valeurs caloriques indicatives. Pour un produit emballé, l’étiquette fait foi.</p>`;

  bindActions(root, {
    ...ctx.dateHandlers,
    add(el) {
      openAddFood(key, el.dataset.meal);
    },
    del(el) {
      const item = day.meals.find((x) => x.id === el.dataset.id);
      store.update((s) => {
        s.days[key].meals = s.days[key].meals.filter((x) => x.id !== el.dataset.id);
      });
      toast(`Supprimé : ${item.name}`, { icon: '🗑️' });
    },
    copy(el) {
      const items = (yesterday.meals || []).filter((x) => x.meal === el.dataset.meal);
      store.update((s) => {
        const d = (s.days[key] ||= {});
        d.meals ||= [];
        items.forEach((x) => d.meals.push({ ...x, id: store.uid() }));
      });
      toast(`${items.length} aliment${items.length > 1 ? 's' : ''} copié${items.length > 1 ? 's' : ''}`, { icon: '↺' });
    },
  });
}
