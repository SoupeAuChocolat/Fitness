// Réglages : profil, objectifs, Connexion Santé, rappels, sauvegarde des données.
import * as store from '../store.js';
import { ACTIVITY_LEVELS, ageOf, dailyTarget, proteinTarget, RATES, STEP_BASELINE } from '../calc.js';
import { todayKey } from '../dates.js';
import { connectHealth, disconnectHealth, healthAvailable, healthStatus, syncHealth } from '../health.js';
import { Filesystem, HealthConnect, isNative, Share } from '../native.js';
import {
  applyReminders, enableReminders, exactAlarmsAllowed, notificationPermission, openExactAlarmSettings, remindersAvailable,
} from '../reminders.js';
import { getTheme, setTheme, THEMES } from '../theme.js';
import { bindActions, confirmSheet, esc, nf, parseNum, toast } from '../ui.js';

const options = (list, current) =>
  list.map((o) => `<option value="${o.v}" ${Number(current) === o.v ? 'selected' : ''}>${esc(o.label)} — ${esc(o.desc)}</option>`).join('');

const TEETH_LABELS = ['Matin', 'Midi', 'Soir'];

function healthSection(state) {
  if (!healthAvailable()) return '';
  const last = state.health.lastSync ? new Date(state.health.lastSync).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : null;
  return `
    <section class="card">
      <div class="card-head"><h2>❤️ Connexion Santé</h2></div>
      <div id="hc-status" class="small muted">Vérification…</div>
      ${last ? `<p class="small muted">Dernière synchronisation : ${last}</p>` : ''}
      <div class="btn-row" id="hc-actions"></div>
      <details class="ex-detail small">
        <summary>Mes pas n’apparaissent pas ?</summary>
        <p>Ma Forme lit les pas que Connexion Santé a reçus. Ouvre Connexion Santé → <em>Données et accès</em> → <em>Activité</em> → <em>Pas</em> pour vérifier qu’il y a des données.</p>
        <p>S’il n’y en a pas, une app doit compter tes pas et les partager avec Connexion Santé : sur beaucoup de téléphones Android 14+, le téléphone le fait tout seul ; sinon installe <strong>Google Fit</strong> (gratuit) et active le partage vers Connexion Santé dans ses réglages.</p>
        <p>Une valeur que tu modifies à la main dans l’app n’est plus remplacée par la synchronisation pour ce jour-là.</p>
      </details>
    </section>`;
}

function remindersSection(r) {
  if (!remindersAvailable()) return '';
  const time = (key, value, label) => `<label class="field"><span>${label}</span><input class="input" type="time" data-r="${key}" value="${value}"></label>`;
  const toggle = (key, label) => `<label class="check-line"><input type="checkbox" data-r="${key}.on" ${r[key].on ? 'checked' : ''}> ${label}</label>`;
  return `
    <section class="card">
      <div class="card-head"><h2>🔔 Rappels</h2></div>
      <label class="check-line"><input type="checkbox" data-r="enabled" ${r.enabled ? 'checked' : ''}> <strong>Activer les rappels</strong></label>
      <div class="reminder-block">${toggle('checkin', '🌙 Bilan du soir (habitudes, repas)')}
        <div class="grid-2">${time('checkin.time', r.checkin.time, 'Heure')}</div></div>
      <div class="reminder-block">${toggle('water', '💧 Boire de l’eau')}
        <div class="grid-3">${time('water.from', r.water.from, 'De')}${time('water.to', r.water.to, 'À')}
          <label class="field"><span>Toutes les</span><select class="input" data-r="water.every">${[1, 2, 3].map((h) => `<option value="${h}" ${Number(r.water.every) === h ? 'selected' : ''}>${h} h</option>`).join('')}</select></label></div></div>
      <div class="reminder-block">${toggle('sport', '💪 Séance du jour (lun → sam)')}
        <div class="grid-2">${time('sport.time', r.sport.time, 'Heure')}</div></div>
      <div class="reminder-block">${toggle('teeth', '🪥 Brossage de dents')}
        <div class="grid-3">${r.teeth.times.map((t, i) => time(`teeth.times.${i}`, t, TEETH_LABELS[i])).join('')}</div></div>
      <p class="small muted" id="exact-status"></p>
      <p class="error" id="reminders-error" role="alert"></p>
      <button class="btn btn-primary btn-block" data-act="saveReminders">Enregistrer les rappels</button>
    </section>`;
}

export function render(root, ctx) {
  const { state } = ctx;
  const p = state.profile;
  const today = todayKey();
  const t = dailyTarget(state, today);
  const budget = p.stepsMode !== 'info';

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
      <label class="field"><span>Calories brûlées par les pas</span>
        <select class="input" data-f="stepsMode">
          <option value="budget" ${budget ? 'selected' : ''}>Ajoutées à mon objectif (au-delà de ${nf(STEP_BASELINE)} pas)</option>
          <option value="info" ${budget ? '' : 'selected'}>Affichées seulement</option>
        </select></label>
      <label class="field"><span>Activité au quotidien ${budget ? '(non utilisée : ce sont tes pas qui comptent)' : ''}</span>
        <select class="input" data-f="activity" ${budget ? 'disabled' : ''}>${options(ACTIVITY_LEVELS, p.activity)}</select></label>
      <label class="field"><span>Rythme de perte</span><select class="input" data-f="rate">${options(RATES, p.rate)}</select></label>
    </section>

    <section class="card">
      <div class="card-head"><h2>🎯 Objectifs du quotidien</h2></div>
      <div class="callout small">
        Métabolisme de base : <strong>${nf(t.bmr)} kcal</strong> · Dépense ${budget ? 'd’une journée assise' : 'estimée'} : <strong>${nf(t.tdee)} kcal</strong><br>
        Objectif de base : <strong>${nf(t.base)} kcal / jour</strong>${t.maintenance ? ' (maintien : objectif de poids atteint)' : ''}
        ${budget ? `<br>Aujourd’hui : + ${nf(t.bonus)} kcal grâce à tes pas = <strong>${nf(t.target)} kcal</strong>` : ''}
        ${t.capped ? '<br><span class="warn-text">Ajusté pour rester dans une zone sans danger.</span>' : ''}
        <br><span class="muted">Pas : ≈ 0,5 kcal par kg et par km (équation de marche de l’ACSM), longueur de pas estimée d’après ta taille.</span>
      </div>
      <div class="grid-2">
        <label class="field"><span>Calories de base (vide = auto)</span><input class="input" inputmode="numeric" data-f="kcalOverride" value="${p.kcalOverride || ''}" placeholder="${nf(t.auto)}"></label>
        <label class="field"><span>Protéines g / jour (vide = auto)</span><input class="input" inputmode="numeric" data-f="proteinGoal" value="${p.proteinGoal || ''}" placeholder="${nf(proteinTarget({ ...p, proteinGoal: null }))}"></label>
        <label class="field"><span>Réserve « sorties » par semaine</span><select class="input" data-f="eatOutPercent">${[0, 10, 15, 20].map((n) => `<option value="${n}" ${(p.eatOutPercent ?? 10) === n ? 'selected' : ''}>${n === 0 ? 'Aucune' : `${n} % du budget`}</option>`).join('')}</select></label>
        <label class="field"><span>Séances de sport par semaine</span><select class="input" data-f="weekGoal">${[3, 4, 5].map((n) => `<option value="${n}" ${(p.weekGoal ?? 5) === n ? 'selected' : ''}>${n} séances</option>`).join('')}</select></label>
        <label class="field"><span>Eau (verres / jour)</span><input class="input" inputmode="numeric" data-f="waterGoal" value="${p.waterGoal}"></label>
        <label class="field"><span>Taille d’un verre (ml)</span><input class="input" inputmode="numeric" data-f="glassMl" value="${p.glassMl}"></label>
        <label class="field"><span>Pas / jour</span><input class="input" inputmode="numeric" data-f="stepsGoal" value="${p.stepsGoal}"></label>
        <label class="field"><span>Sommeil (heures)</span><input class="input" inputmode="decimal" data-f="sleepGoal" value="${nf(p.sleepGoal, 1)}"></label>
      </div>
      <p class="small muted">Protéines auto : 1,6 g par kg de ton poids objectif, pour garder tes muscles pendant la perte de poids.</p>
      <label class="check-line"><input type="checkbox" data-f="teethTracker" ${p.teethTracker ? 'checked' : ''}> 🪥 Suivre le brossage de dents (3 fois par jour)</label>
      <p class="error" id="settings-error" role="alert"></p>
      <button class="btn btn-primary btn-block" data-act="save">Enregistrer</button>
    </section>

    <section class="card">
      <div class="card-head"><h2>🎨 Thème</h2></div>
      <div class="theme-picker">${THEMES.map((th) => `<button class="theme-opt ${getTheme() === th.id ? 'on' : ''}" data-act="theme" data-id="${th.id}"><span class="theme-swatch sw-${th.id}"></span>${esc(th.label)}</button>`).join('')}</div>
    </section>

    ${healthSection(state)}
    ${remindersSection(state.reminders)}

    <section class="card">
      <div class="card-head"><h2>💾 Mes données</h2></div>
      <p class="small muted">Tes données restent sur ce téléphone${isNative ? ' (et dans la sauvegarde Android automatique si elle est activée)' : ', dans le navigateur'}. Fais une sauvegarde de temps en temps pour ne rien perdre.</p>
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
      <p>Données : table CIQUAL (ANSES), Open Food Facts, photos d’exercices de Free Exercise DB (domaine public). Les données de Connexion Santé sont lues uniquement pour afficher tes pas et ton sommeil, et ne quittent pas le téléphone.</p>
      <p class="muted">Tabac Info Service : 39 89 · Alcool Info Service : 0 980 980 930</p>
    </section>`;

  const val = (f) => root.querySelector(`[data-f="${f}"]`).value;

  // États asynchrones : Connexion Santé et alarmes exactes.
  if (healthAvailable()) {
    healthStatus().then((st) => {
      const box = root.querySelector('#hc-status');
      const actions = root.querySelector('#hc-actions');
      if (!box) return;
      if (st.status !== 'available') {
        box.textContent = st.status === 'update_required'
          ? 'Connexion Santé doit être mis à jour depuis le Play Store.'
          : 'Connexion Santé n’est pas disponible sur ce téléphone.';
        actions.innerHTML = '<button class="btn grow" data-act="hcSettings">Ouvrir le Play Store</button>';
        return;
      }
      const granted = [st.steps && 'pas', st.sleep && 'sommeil'].filter(Boolean);
      box.innerHTML = state.health.enabled && granted.length
        ? `<span class="good-text">✓ Connecté</span> — accès : ${granted.join(' et ')}`
        : 'Non connecté : tes pas et ton sommeil ne sont pas importés.';
      actions.innerHTML = state.health.enabled && granted.length
        ? `<button class="btn grow" data-act="hcSync">🔄 Synchroniser</button>
           <button class="btn grow" data-act="hcSettings">Ouvrir Connexion Santé</button>
           <button class="btn btn-link btn-block" data-act="hcDisconnect">Ne plus importer</button>`
        : '<button class="btn btn-primary grow" data-act="hcConnect">🔗 Connecter</button><button class="btn grow" data-act="hcSettings">Ouvrir Connexion Santé</button>';
    });
  }
  if (remindersAvailable()) {
    Promise.all([notificationPermission(), exactAlarmsAllowed()]).then(([perm, exact]) => {
      const el = root.querySelector('#exact-status');
      if (!el) return;
      if (perm !== 'granted' && state.reminders.enabled) {
        el.innerHTML = '<span class="warn-text">Les notifications sont bloquées pour Ma Forme dans les réglages Android.</span>';
      } else if (!exact) {
        el.innerHTML = 'Les rappels peuvent arriver avec quelques minutes de décalage. <button class="btn btn-link" data-act="exact">Autoriser l’heure exacte</button>';
      }
    });
  }

  bindActions(root, {
    theme(btn) {
      setTheme(btn.dataset.id);
      ctx.rerender();
    },
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
      const protein = num('proteinGoal');
      if (protein != null && (protein < 30 || protein > 300)) errors.push('protéines (entre 30 et 300 g)');
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
          stepsMode: val('stepsMode'),
          activity: Number(val('activity')),
          rate: Number(val('rate')),
          kcalOverride: kcal ? Math.round(kcal) : null,
          proteinGoal: protein ? Math.round(protein) : null,
          weekGoal: Number(val('weekGoal')),
          eatOutPercent: Number(val('eatOutPercent')),
          waterGoal: Math.round(num('waterGoal')),
          glassMl: Math.round(num('glassMl')),
          stepsGoal: Math.round(num('stepsGoal')),
          sleepGoal: num('sleepGoal'),
          teethTracker: root.querySelector('[data-f="teethTracker"]').checked,
        });
      });
      toast('Réglages enregistrés', { icon: '✅' });
    },
    async hcConnect() {
      try {
        const granted = await connectHealth();
        toast(granted.steps || granted.sleep ? 'Connexion Santé connectée' : 'Accès refusé', { icon: '🔗' });
      } catch (e) {
        toast(e.message, { icon: '⚠️', duration: 5000 });
      }
      ctx.rerender();
    },
    async hcSync() {
      try {
        const res = await syncHealth({ force: true });
        toast(res?.changed ? `${res.changed} valeur${res.changed > 1 ? 's' : ''} mise${res.changed > 1 ? 's' : ''} à jour` : 'Déjà à jour', { icon: '🔄' });
      } catch (e) {
        toast(`Synchronisation impossible : ${e.message}`, { icon: '⚠️', duration: 5000 });
      }
      ctx.rerender();
    },
    hcSettings() {
      HealthConnect.openSettings().catch((e) => toast(e.message, { icon: '⚠️' }));
    },
    hcDisconnect() {
      disconnectHealth();
      toast('Import arrêté. Tu peux aussi retirer l’accès dans Connexion Santé.', { icon: 'ℹ️', duration: 4000 });
    },
    async saveReminders() {
      const r = structuredClone(state.reminders);
      for (const input of root.querySelectorAll('[data-r]')) {
        const path = input.dataset.r.split('.');
        const value = input.type === 'checkbox' ? input.checked : input.tagName === 'SELECT' ? Number(input.value) : input.value;
        let target = r;
        path.slice(0, -1).forEach((k) => (target = target[k]));
        target[path[path.length - 1]] = value;
      }
      const times = [r.checkin.time, r.water.from, r.water.to, r.sport.time, ...r.teeth.times];
      if (times.some((x) => !/^\d{2}:\d{2}$/.test(x))) {
        root.querySelector('#reminders-error').textContent = 'Indique toutes les heures.';
        return;
      }
      if (r.water.to < r.water.from) {
        root.querySelector('#reminders-error').textContent = 'L’heure de fin des rappels d’eau doit être après l’heure de début.';
        return;
      }
      const wasEnabled = state.reminders.enabled;
      store.update((s) => (s.reminders = { ...r, enabled: wasEnabled }), { silent: true });
      if (r.enabled && !(wasEnabled && (await notificationPermission()) === 'granted')) {
        const ok = await enableReminders();
        if (!ok) toast('Notifications refusées : autorise-les dans les réglages Android', { icon: '⚠️', duration: 5000 });
      } else {
        store.update((s) => (s.reminders.enabled = r.enabled), { silent: true });
        const n = await applyReminders(store.get().reminders);
        toast(r.enabled ? `${n} rappels programmés` : 'Rappels désactivés', { icon: '🔔' });
      }
      ctx.rerender();
    },
    exact() {
      openExactAlarmSettings();
    },
    async export() {
      const name = `ma-forme-sauvegarde-${today}.json`;
      const json = JSON.stringify(store.get(), null, 1);
      if (isNative && Filesystem && Share) {
        // Android : fichier temporaire puis menu de partage (Drive, mail, Fichiers…).
        try {
          const { uri } = await Filesystem.writeFile({ path: name, data: json, directory: 'CACHE', encoding: 'utf8' });
          await Share.share({ title: 'Sauvegarde Ma Forme', files: [uri] });
        } catch (e) {
          if (!/cancel/i.test(e.message || '')) toast(`Sauvegarde impossible : ${e.message}`, { icon: '⚠️' });
        }
        return;
      }
      const blob = new Blob([json], { type: 'application/json' });
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
        applyReminders(store.get().reminders).catch(() => {});
        toast('Sauvegarde restaurée', { icon: '✅' });
      } catch {
        toast('Fichier de sauvegarde invalide', { icon: '⚠️' });
      }
    },
    async reset() {
      if (!(await confirmSheet({ title: 'Tout effacer ?', message: 'Toutes tes données (poids, repas, séances, habitudes) seront supprimées de cet appareil. Pense à faire une sauvegarde avant.', ok: 'Tout effacer', danger: true }))) return;
      store.reset();
      applyReminders(store.get().reminders).catch(() => {});
      ctx.go('onboarding');
    },
  });
  root.querySelector('[data-f="stepsMode"]').addEventListener('change', (e) => {
    root.querySelector('[data-f="activity"]').disabled = e.target.value === 'budget';
  });
}
