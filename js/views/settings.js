// Réglages : profil, objectifs, sauvegarde des données.
import * as store from '../store.js';
import { ACTIVITY_LEVELS, ageOf, calorieTarget, currentWeight, RATES } from '../calc.js';
import { todayKey } from '../dates.js';
import { bindActions, confirmSheet, esc, nf, parseNum, toast } from '../ui.js';

const options = (list, current) =>
  list.map((o) => `<option value="${o.v}" ${Number(current) === o.v ? 'selected' : ''}>${esc(o.label)} — ${esc(o.desc)}</option>`).join('');

export function render(root, ctx) {
  const { state } = ctx;
  const p = state.profile;
  const today = todayKey();
  const t = calorieTarget(p, currentWeight(state, today), today);

  root.innerHTML = `
    <section class="card">
      <div class="card-head"><h2>👤 Profil</h2></div>
      <div class="grid-2">
        <label class="field"><span>Prénom</span><input class="input" data-f="name" value="${esc(p.name)}"></label>
        <label class="field"><span>Sexe</span>
          <select class="input" data-f="sex"><option value="m" ${p.sex === 'm' ? 'selected' : ''}>Homme</option><option value="f" ${p.sex === 'f' ? 'selected' : ''}>Femme</option></select></label>
        <label class="field"><span>Âge</span><input class="input" inputmode="numeric" data-f="age" value="${ageOf(p, today)}"></label>
        <label class="field"><span>Taille (cm)</span><input class="input" inputmode="numeric" data-f="heightCm" value="${p.heightCm}"></label>
        <label class="field"><span>Poids de départ (kg)</span><input class="input" inputmode="decimal" data-f="startWeight" value="${nf(p.startWeight, 1)}"></label>
        <label class="field"><span>Poids objectif (kg)</span><input class="input" inputmode="decimal" data-f="goalWeight" value="${nf(p.goalWeight, 1)}"></label>
      </div>
      <label class="field"><span>Activité au quotidien</span><select class="input" data-f="activity">${options(ACTIVITY_LEVELS, p.activity)}</select></label>
      <label class="field"><span>Rythme de perte</span><select class="input" data-f="rate">${options(RATES, p.rate)}</select></label>
    </section>

    <section class="card">
      <div class="card-head"><h2>🎯 Objectifs du quotidien</h2></div>
      <div class="callout small">
        Métabolisme de base : <strong>${nf(t.bmr)} kcal</strong> · Dépense estimée : <strong>${nf(t.tdee)} kcal</strong><br>
        Objectif calculé : <strong>${nf(t.auto)} kcal / jour</strong>${t.maintenance ? ' (maintien : objectif de poids atteint)' : ''}
        ${t.capped ? '<br><span class="warn-text">Ajusté pour rester dans une zone sans danger.</span>' : ''}
      </div>
      <div class="grid-2">
        <label class="field"><span>Calories / jour (vide = auto)</span><input class="input" inputmode="numeric" data-f="kcalOverride" value="${p.kcalOverride || ''}" placeholder="${nf(t.auto)}"></label>
        <label class="field"><span>Eau (verres / jour)</span><input class="input" inputmode="numeric" data-f="waterGoal" value="${p.waterGoal}"></label>
        <label class="field"><span>Taille d’un verre (ml)</span><input class="input" inputmode="numeric" data-f="glassMl" value="${p.glassMl}"></label>
        <label class="field"><span>Pas / jour</span><input class="input" inputmode="numeric" data-f="stepsGoal" value="${p.stepsGoal}"></label>
        <label class="field"><span>Sommeil (heures)</span><input class="input" inputmode="decimal" data-f="sleepGoal" value="${nf(p.sleepGoal, 1)}"></label>
      </div>
      <p class="error" id="settings-error" role="alert"></p>
      <button class="btn btn-primary btn-block" data-act="save">Enregistrer</button>
    </section>

    <section class="card">
      <div class="card-head"><h2>💾 Mes données</h2></div>
      <p class="small muted">Tes données sont enregistrées uniquement sur cet appareil, dans le navigateur. Fais une sauvegarde de temps en temps pour ne rien perdre (changement de téléphone, nettoyage du navigateur).</p>
      <div class="btn-row">
        <button class="btn grow" data-act="export">⬇️ Sauvegarder</button>
        <label class="btn grow">⬆️ Restaurer<input type="file" accept="application/json,.json" data-change="import" hidden></label>
      </div>
      <button class="btn btn-danger-ghost btn-block" data-act="reset">Tout effacer</button>
    </section>

    <section class="card small">
      <div class="card-head"><h2>ℹ️ À propos</h2></div>
      <p>Ma Forme est une aide au suivi personnel. Les calories et dépenses affichées sont des estimations.</p>
      <p>Elle ne remplace pas l’avis d’un professionnel de santé : en cas de problème de santé, de perte de poids importante ou pour arrêter le tabac ou l’alcool, n’hésite pas à en parler à ton médecin.</p>
      <p class="muted">Tabac Info Service : 39 89 · Alcool Info Service : 0 980 980 930</p>
    </section>`;

  const val = (f) => root.querySelector(`[data-f="${f}"]`).value;

  bindActions(root, {
    save() {
      const num = (f) => parseNum(val(f));
      const age = num('age');
      const errors = [];
      if (!age || age < 14 || age > 100) errors.push('âge');
      if (!num('heightCm') || num('heightCm') < 120 || num('heightCm') > 230) errors.push('taille');
      if (!num('startWeight') || num('startWeight') < 35) errors.push('poids de départ');
      if (!num('goalWeight') || num('goalWeight') < 35) errors.push('poids objectif');
      if (!num('waterGoal') || num('waterGoal') < 1) errors.push('eau');
      if (!num('glassMl') || num('glassMl') < 50) errors.push('taille du verre');
      if (!num('stepsGoal') || num('stepsGoal') < 500) errors.push('pas');
      if (!num('sleepGoal') || num('sleepGoal') < 4) errors.push('sommeil');
      const kcal = num('kcalOverride');
      if (kcal != null && (kcal < 1000 || kcal > 5000)) errors.push('calories (entre 1000 et 5000)');
      if (errors.length) {
        root.querySelector('#settings-error').textContent = `Vérifie : ${errors.join(', ')}.`;
        return;
      }
      store.update((s) => {
        Object.assign(s.profile, {
          name: val('name').trim(),
          sex: val('sex'),
          birthYear: new Date().getFullYear() - age,
          heightCm: num('heightCm'),
          startWeight: num('startWeight'),
          goalWeight: num('goalWeight'),
          activity: Number(val('activity')),
          rate: Number(val('rate')),
          kcalOverride: kcal ? Math.round(kcal) : null,
          waterGoal: Math.round(num('waterGoal')),
          glassMl: Math.round(num('glassMl')),
          stepsGoal: Math.round(num('stepsGoal')),
          sleepGoal: num('sleepGoal'),
        });
      });
      toast('Réglages enregistrés', { icon: '✅' });
    },
    async export() {
      const name = `ma-forme-sauvegarde-${today}.json`;
      const blob = new Blob([JSON.stringify(store.get(), null, 1)], { type: 'application/json' });
      // App installée sur téléphone : le partage (Fichiers, Drive, mail…) est plus fiable qu'un téléchargement.
      const file = new File([blob], name, { type: 'application/json' });
      if (matchMedia('(display-mode: standalone)').matches && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Sauvegarde Ma Forme' });
          return;
        } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    async import(el) {
      const file = el.files[0];
      el.value = '';
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!store.isValidBackup(data)) throw new Error('format');
        if (!(await confirmSheet({ title: 'Restaurer cette sauvegarde ?', message: 'Les données actuelles de l’app seront remplacées.', ok: 'Restaurer' }))) return;
        store.replace(data);
        toast('Sauvegarde restaurée', { icon: '✅' });
      } catch {
        toast('Fichier de sauvegarde invalide', { icon: '⚠️' });
      }
    },
    async reset() {
      if (!(await confirmSheet({ title: 'Tout effacer ?', message: 'Toutes tes données (poids, repas, séances, habitudes) seront supprimées de cet appareil. Pense à faire une sauvegarde avant.', ok: 'Tout effacer', danger: true }))) return;
      store.reset();
      ctx.go('onboarding');
    },
  });
}
