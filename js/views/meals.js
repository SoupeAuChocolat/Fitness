// Journal alimentaire : repas du jour, recherche d'aliments (courants + CIQUAL),
// code-barres (Open Food Facts) et aliments perso.
import * as store from '../store.js';
import { dailyTarget, dayTotals, frequentFoods } from '../calc.js';
import { addDays } from '../dates.js';
import { canScan, lookupBarcode, scanBarcode } from '../barcode.js';
import { CIQUAL_FOODS, COMMON_FOODS, portionValues, searchFoods } from '../foods.js';
import { bindActions, dateNav, esc, ICON, nf, openSheet, parseNum, progressBar, toast } from '../ui.js';

export const MEALS = [
  { id: 'breakfast', label: 'Petit-déjeuner', icon: '🥐' },
  { id: 'lunch', label: 'Déjeuner', icon: '🍽️' },
  { id: 'snack', label: 'Collations', icon: '🍎' },
  { id: 'dinner', label: 'Dîner', icon: '🌙' },
];

const macroLine = (v) => (v.prot == null ? '' : `P ${nf(v.prot)} g · G ${nf(v.carb ?? 0)} g · L ${nf(v.fat ?? 0)} g`);

function addItem(date, item) {
  store.update((s) => {
    const d = (s.days[date] ||= {});
    (d.meals ||= []).push({ id: store.uid(), ...item, kcal: Math.round(item.kcal) });
  });
}

// Garde un aliment (perso ou scanné) en tête de « Mes aliments ».
function saveCustomFood(food) {
  store.update((s) => {
    s.customFoods = s.customFoods.filter((f) => (food.barcode ? f.barcode !== food.barcode : f.n !== food.n));
    s.customFoods.unshift(food);
  }, { silent: true });
}

function openAddFood(date, mealId) {
  const state = store.get();
  const custom = state.customFoods.map((f) => ({ ...f, c: f.barcode ? 'Produits scannés' : 'Mes aliments' }));
  const quick = [...custom, ...COMMON_FOODS];
  const frequent = frequentFoods(state, date);
  let meal = mealId;
  let shown = [];

  openSheet({
    title: 'Ajouter un aliment',
    className: 'sheet-tall',
    html: `
      <div class="seg seg-4" data-meals>
        ${MEALS.map((m) => `<button class="${m.id === meal ? 'on' : ''}" data-meal="${m.id}">${m.icon}<small>${m.label}</small></button>`).join('')}
      </div>
      <div class="seg" data-tabs>
        <button class="on" data-tab="search">Rechercher</button>
        <button data-tab="barcode">Code-barres</button>
        <button data-tab="create">Créer</button>
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
      <div data-panel="barcode" hidden>
        ${canScan() ? `<button class="btn btn-primary btn-block" data-scan>📷 Scanner un code-barres</button>
          <p class="small muted center">ou</p>` : ''}
        <label class="field"><span>Saisir le numéro sous le code-barres</span>
          <input class="input" inputmode="numeric" data-code placeholder="3017620422003"></label>
        <button class="btn btn-block" data-lookup>Rechercher le produit</button>
        <p class="small muted">Les produits viennent d’Open Food Facts, une base collaborative : vérifie les valeurs avec l’étiquette. Il faut une connexion internet.</p>
        <div data-scan-result></div>
      </div>
      <div data-panel="create" hidden>
        <label class="field"><span>Nom</span><input class="input" data-cname placeholder="Ex. Salade de pâtes maison"></label>
        <div class="grid-2">
          <label class="field"><span>Calories (kcal)</span><input class="input" inputmode="numeric" data-ckcal placeholder="450"></label>
          <label class="field"><span>Portion (facultatif)</span><input class="input" data-cportion placeholder="1 assiette"></label>
        </div>
        <div class="grid-3">
          <label class="field"><span>Protéines (g)</span><input class="input" inputmode="decimal" data-cprot placeholder="—"></label>
          <label class="field"><span>Glucides (g)</span><input class="input" inputmode="decimal" data-ccarb placeholder="—"></label>
          <label class="field"><span>Lipides (g)</span><input class="input" inputmode="decimal" data-cfat placeholder="—"></label>
        </div>
        <label class="check-line"><input type="checkbox" data-csave checked> Enregistrer dans « Mes aliments »</label>
        <button class="btn btn-primary btn-block" data-create>Ajouter</button>
        <p class="small muted">Astuce : les valeurs sont indiquées sur l’emballage (pour 100 g ou par portion).</p>
      </div>
      <div data-panel="qty" hidden></div>`,
    onMount(body, close) {
      const $ = (sel) => body.querySelector(sel);
      const list = $('[data-list]');
      const panels = Object.fromEntries([...body.querySelectorAll('[data-panel]')].map((el) => [el.dataset.panel, el]));
      const tabs = $('[data-tabs]');
      let lastTab = 'search';
      const show = (name) => {
        Object.entries(panels).forEach(([k, el]) => (el.hidden = k !== name));
        tabs.hidden = name === 'qty';
        if (name !== 'qty') lastTab = name;
        tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
      };
      const mealLabel = () => MEALS.find((m) => m.id === meal).label.toLowerCase();

      const pickHtml = (f, i) => `
        <button class="pick" data-i="${i}">
          <span class="grow"><strong>${esc(f.n)}</strong><small>${esc(f.p || '')}${f.ciqual ? ' · table CIQUAL' : ''}</small></span>
          <b>${f.k == null ? '?' : nf(f.k)}</b>
        </button>`;

      const draw = (q = '') => {
        let html = '';
        if (!q.trim()) {
          shown = quick;
          let cat = null;
          quick.forEach((f, i) => {
            if (f.c !== cat) html += `<h3 class="sub">${esc((cat = f.c))}</h3>`;
            html += pickHtml(f, i);
          });
        } else {
          const first = searchFoods(quick, q, 40);
          const more = q.trim().length >= 2 ? searchFoods(CIQUAL_FOODS, q, 80) : [];
          shown = [...first, ...more];
          if (first.length) html += first.map(pickHtml).join('');
          if (more.length) {
            html += `<h3 class="sub">Table CIQUAL — ${more.length >= 80 ? '80 premiers résultats' : `${more.length} résultat${more.length > 1 ? 's' : ''}`}</h3>`;
            html += more.map((f, i) => pickHtml(f, first.length + i)).join('');
          }
        }
        list.innerHTML = html || '<p class="muted small">Aucun aliment trouvé. Essaie un autre mot, scanne le code-barres ou crée l’aliment.</p>';
      };
      draw();

      // Panneau quantité : grammes si possible, sinon portions ; calories et macros en direct.
      const openQty = (f) => {
        const byGram = !!f.g;
        const start = f.serving && f.barcode ? f.serving : f.g;
        panels.qty.innerHTML = `
          <button class="btn btn-link" data-back>${ICON.left} Retour</button>
          <h3>${esc(f.n)}</h3>
          <p class="small muted">${esc(f.p || '')} · ${nf(f.k)} kcal${f.ciqual ? ' · source : table CIQUAL (ANSES)' : f.barcode ? ' · source : Open Food Facts' : ''}</p>
          ${byGram ? `
            <label class="field"><span>Quantité (g)</span><input class="input input-big" inputmode="decimal" data-qty value="${nf(start)}"></label>
            <div class="chips">
              ${f.serving ? `<button class="chip" data-grams="${f.serving}">1 portion (${esc(f.servingLabel || `${nf(f.serving)} g`)})</button>` : ''}
              ${(f.ciqual || f.barcode ? [50, 100, 150, 200, 250] : [0.5, 1, 1.5, 2].map((m) => f.g * m))
                .map((g) => `<button class="chip" data-grams="${g}">${nf(g)} g</button>`).join('')}
            </div>` : `
            <div class="field"><span>Nombre de portions</span>
              <div class="stepper big">
                <button class="icon-btn" data-step="-0.5" aria-label="Moins">${ICON.minus}</button>
                <strong data-portions>1</strong>
                <button class="icon-btn" data-step="0.5" aria-label="Plus">${ICON.plus}</button>
              </div></div>`}
          <div class="callout center"><span class="callout-big" data-total></span><span class="small" data-macros></span></div>
          <button class="btn btn-primary btn-block" data-add>Ajouter au ${mealLabel()}</button>`;
        show('qty');
        let portions = 1;
        const qtyEl = panels.qty.querySelector('[data-qty]');
        const values = () => portionValues(f, byGram ? { grams: parseNum(qtyEl.value) || 0 } : { portions });
        const refresh = () => {
          const v = values();
          panels.qty.querySelector('[data-total]').textContent = `${nf(v.kcal)} kcal`;
          panels.qty.querySelector('[data-macros]').textContent = macroLine(v);
        };
        refresh();
        // affectation directe : remplace les gestionnaires de l'aliment précédent
        panels.qty.oninput = refresh;
        panels.qty.onclick = (ev) => {
          const t = ev.target.closest('button');
          if (!t) return;
          if (t.dataset.back != null) return show(lastTab);
          if (t.dataset.grams) {
            qtyEl.value = nf(Number(t.dataset.grams));
            refresh();
          }
          if (t.dataset.step) {
            portions = Math.max(0.5, portions + Number(t.dataset.step));
            panels.qty.querySelector('[data-portions]').textContent = nf(portions, 1);
            refresh();
          }
          if (t.dataset.add != null) {
            const v = values();
            if (v.kcal <= 0 && f.k > 0) return toast('Indique une quantité', { icon: '⚠️' });
            const qty = byGram ? `${nf(parseNum(qtyEl.value) || 0)} g` : portions === 1 ? f.p || '1 portion' : `${nf(portions, 1)} portions · ${f.p || ''}`;
            if (f.barcode) saveCustomFood(stripUi(f));
            addItem(date, { meal, name: f.n, qty, ...v });
            toast(`Ajouté : ${f.n}`, { icon: '✅' });
            close();
          }
        };
      };

      $('[data-meals]').addEventListener('click', (e) => {
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
      $('[data-q]').addEventListener('input', (e) => draw(e.target.value));
      list.addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]');
        if (b) openQty(shown[Number(b.dataset.i)]);
      });

      $('[data-freq]')?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-freq-i]');
        if (!b) return;
        const f = frequent[Number(b.dataset.freqI)];
        addItem(date, { meal, name: f.name, qty: f.qty, kcal: f.kcal, prot: f.prot, carb: f.carb, fat: f.fat });
        toast(`Ajouté : ${f.name}`, { icon: '✅' });
        close();
      });

      // Code-barres : produit déjà scanné (hors ligne) ou recherche sur Open Food Facts.
      const result = $('[data-scan-result]');
      const findProduct = async (code) => {
        code = String(code || '').replace(/\D/g, '');
        if (code.length < 8) return toast('Numéro de code-barres incomplet', { icon: '⚠️' });
        const known = store.get().customFoods.find((f) => f.barcode === code);
        if (known) return openQty({ ...known, c: 'Produits scannés' });
        result.innerHTML = '<p class="small muted center">Recherche du produit…</p>';
        try {
          const food = await lookupBarcode(code);
          if (!food) {
            result.innerHTML = '<p class="small">Produit inconnu d’Open Food Facts. Tu peux le créer avec les valeurs de l’étiquette (onglet « Créer »).</p>';
          } else if (food.k == null) {
            result.innerHTML = `<p class="small">« ${esc(food.n)} » est connu mais sans calories renseignées. Crée-le avec les valeurs de l’étiquette.</p>`;
            $('[data-cname]').value = food.n;
          } else {
            result.innerHTML = '';
            openQty(food);
          }
        } catch {
          result.innerHTML = '<p class="small">Impossible de joindre Open Food Facts. Vérifie ta connexion internet.</p>';
        }
      };
      $('[data-lookup]').addEventListener('click', () => findProduct($('[data-code]').value));
      $('[data-scan]')?.addEventListener('click', async () => {
        try {
          const code = await scanBarcode();
          if (code) {
            $('[data-code]').value = code;
            await findProduct(code);
          }
        } catch (e) {
          toast(e.message || 'Scan impossible', { icon: '⚠️', duration: 4000 });
        }
      });

      $('[data-create]').addEventListener('click', () => {
        const name = $('[data-cname]').value.trim();
        const kcal = parseNum($('[data-ckcal]').value);
        const portion = $('[data-cportion]').value.trim();
        if (!name) return toast('Donne un nom à l’aliment', { icon: '⚠️' });
        if (kcal == null || kcal < 0 || kcal > 5000) return toast('Indique les calories', { icon: '⚠️' });
        const macros = { prot: parseNum($('[data-cprot]').value), carb: parseNum($('[data-ccarb]').value), fat: parseNum($('[data-cfat]').value) };
        if ($('[data-csave]').checked) saveCustomFood({ n: name, p: portion, k: Math.round(kcal), ...macros });
        addItem(date, { meal, name, qty: portion || '1 portion', kcal, ...macros });
        toast(`Ajouté : ${name}`, { icon: '✅' });
        close();
      });
    },
  });
}

// Retire les champs internes (recherche, affichage) avant d'enregistrer un aliment.
function stripUi(food) {
  const { _norm, c, ...rest } = food;
  return rest;
}

export function render(root, ctx) {
  const { state, ui } = ctx;
  const key = ui.date;
  const day = state.days[key] || {};
  const goal = dailyTarget(state, key);
  const target = goal.target;
  const t = dayTotals(day);
  const yesterday = state.days[addDays(key, -1)] || {};
  const left = target - t.eaten;

  root.innerHTML = `
    ${dateNav(key)}
    <section class="card">
      <div class="goal-line"><span><strong>${nf(t.eaten)}</strong> / ${nf(target)} kcal</span>
        <span class="${left < 0 ? 'bad-text' : 'good-text'}">${left < 0 ? `${nf(-left)} en trop` : `${nf(left)} restantes`}</span></div>
      ${progressBar(t.eaten / target, left < 0 ? 'bar-over' : 'bar-accent')}
      ${goal.bonus ? `<p class="small muted">Objectif = ${nf(goal.base)} + ${nf(goal.bonus)} kcal gagnées avec tes pas 👣</p>` : ''}
      <div class="goal-line small"><span>🥩 Protéines <strong>${nf(t.prot)}</strong> / ${nf(goal.protein)} g</span>
        <span class="muted">Glucides ${nf(t.carb)} g · Lipides ${nf(t.fat)} g</span></div>
      ${progressBar(t.prot / goal.protein)}
      ${t.noMacros ? `<p class="small muted">${t.noMacros} aliment${t.noMacros > 1 ? 's' : ''} sans détail des macros.</p>` : ''}
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
              <span class="grow"><strong>${esc(x.name)}</strong><small>${esc(x.qty || '')}${x.prot != null ? ` · P ${nf(x.prot)} g` : ''}</small></span>
              <b>${nf(x.kcal)}</b>
              <button class="icon-btn" data-act="del" data-id="${x.id}" aria-label="Supprimer ${esc(x.name)}">${ICON.trash}</button>
            </div>`).join('')}
          <div class="btn-row">
            <button class="btn grow" data-act="add" data-meal="${m.id}">+ Ajouter</button>
            ${!items.length && yItems.length ? `<button class="btn btn-ghost" data-act="copy" data-meal="${m.id}" title="Copier les aliments d'hier">↺ Comme hier</button>` : ''}
          </div>
        </section>`;
    }).join('')}

    <p class="small muted center">Valeurs nutritionnelles : table CIQUAL de l’ANSES (aliments génériques) et Open Food Facts (produits scannés). Pour un produit emballé, l’étiquette fait foi.</p>`;

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
