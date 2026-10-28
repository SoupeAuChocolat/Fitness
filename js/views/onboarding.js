// Premier lancement : profil, objectifs et habitudes à suivre.
import * as store from '../store.js';
import { ACTIVITY_LEVELS, RATES, bmi, bmiLabel, calorieTarget, defaultWaterGoal } from '../calc.js';
import { todayKey } from '../dates.js';
import { HABIT_PRESETS } from '../data/habits.js';
import { bindActions, esc, nf, parseNum, toast } from '../ui.js';

const STEPS = 4;
let step = 0;
const draft = {
  name: '',
  sex: 'm',
  age: '',
  heightCm: '',
  weight: '',
  goalWeight: '',
  activity: 1.375,
  rate: 0.5,
  stepsMode: 'budget',
  habits: {
    sugar: { on: true },
    tobacco: { on: true, perDay: '10', packPrice: '12,5' },
    nofap: { on: true, name: HABIT_PRESETS.nofap.name },
    alcohol: { on: true, perWeek: '7', budget: '20' },
  },
};

function profileFromDraft() {
  return {
    name: draft.name.trim(),
    sex: draft.sex,
    birthYear: new Date().getFullYear() - parseNum(draft.age),
    heightCm: parseNum(draft.heightCm),
    startWeight: parseNum(draft.weight),
    goalWeight: parseNum(draft.goalWeight),
    activity: Number(draft.activity),
    rate: Number(draft.rate),
    stepsMode: draft.stepsMode,
    teethTracker: true,
    proteinGoal: null,
  };
}

function validateProfile() {
  const age = parseNum(draft.age);
  const h = parseNum(draft.heightCm);
  const w = parseNum(draft.weight);
  const g = parseNum(draft.goalWeight);
  if (!age || age < 14 || age > 100) return 'Indique un âge entre 14 et 100 ans.';
  if (!h || h < 120 || h > 230) return 'Indique une taille en cm (ex. 175).';
  if (!w || w < 35 || w > 300) return 'Indique ton poids actuel en kg (ex. 92,5).';
  if (!g || g < 35 || g > 300) return 'Indique ton poids objectif en kg.';
  if (g >= w) return 'Ton objectif doit être inférieur à ton poids actuel.';
  return null;
}

function stepHtml() {
  const today = todayKey();
  if (step === 0) {
    return `
      <div class="hero">
        <div class="hero-emoji">🌱</div>
        <h1>Bienvenue dans Ma Forme</h1>
        <p class="muted">Ton carnet de bord pour perdre du poids, bouger chaque jour et te libérer des habitudes qui te pèsent.</p>
      </div>
      <ul class="feature-list">
        <li>⚖️ Poids, tour de taille, eau, sommeil et pas</li>
        <li>🍽️ Repas et calories avec une liste d’aliments courants</li>
        <li>💪 Séances guidées maison ou salle + cardio</li>
        <li>🛡️ Compteurs pour arrêter sucre, tabac, alcool…</li>
        <li>🔒 Tes données restent sur ton téléphone</li>
      </ul>
      <label class="field">
        <span>Ton prénom (facultatif)</span>
        <input class="input" data-input="f" data-f="name" value="${esc(draft.name)}" autocomplete="given-name" placeholder="Prénom">
      </label>`;
  }
  if (step === 1) {
    return `
      <h2>Ton profil</h2>
      <p class="muted small">Ces informations servent uniquement à calculer tes besoins caloriques.</p>
      <div class="field">
        <span>Sexe</span>
        <div class="seg">
          <button class="${draft.sex === 'm' ? 'on' : ''}" data-act="sex" data-v="m">Homme</button>
          <button class="${draft.sex === 'f' ? 'on' : ''}" data-act="sex" data-v="f">Femme</button>
        </div>
      </div>
      <div class="grid-2">
        <label class="field"><span>Âge</span><input class="input" inputmode="numeric" data-input="f" data-f="age" value="${esc(draft.age)}" placeholder="35"></label>
        <label class="field"><span>Taille (cm)</span><input class="input" inputmode="numeric" data-input="f" data-f="heightCm" value="${esc(draft.heightCm)}" placeholder="175"></label>
        <label class="field"><span>Poids actuel (kg)</span><input class="input" inputmode="decimal" data-input="f" data-f="weight" value="${esc(draft.weight)}" placeholder="92,5"></label>
        <label class="field"><span>Poids objectif (kg)</span><input class="input" inputmode="decimal" data-input="f" data-f="goalWeight" value="${esc(draft.goalWeight)}" placeholder="80"></label>
      </div>
      <div id="bmi-hint" class="hint"></div>`;
  }
  if (step === 2) {
    const p = profileFromDraft();
    const budget = draft.stepsMode === 'budget';
    const t = calorieTarget(budget ? { ...p, activity: 1.2 } : p, p.startWeight, today);
    const weeks = Math.ceil((p.startWeight - p.goalWeight) / p.rate);
    return `
      <h2>Ton rythme</h2>
      <div class="field">
        <span>Les calories brûlées par tes pas</span>
        <div class="seg">
          <button class="${budget ? 'on' : ''}" data-act="stepsMode" data-v="budget">Ajoutées au budget</button>
          <button class="${budget ? '' : 'on'}" data-act="stepsMode" data-v="info">Affichées seulement</button>
        </div>
        <small class="muted">${budget
          ? 'Ton objectif de base correspond à une journée assise ; chaque pas au-delà de 4 000 te donne des calories en plus.'
          : 'Ton objectif dépend de ton niveau d’activité ; les pas sont affichés pour information.'}</small>
      </div>
      ${budget ? '' : `
      <div class="field">
        <span>Ton activité au quotidien (travail + sport prévu)</span>
        <div class="choice-list">
          ${ACTIVITY_LEVELS.map((a) => `
            <button class="choice ${Number(draft.activity) === a.v ? 'on' : ''}" data-act="activity" data-v="${a.v}">
              <strong>${a.label}</strong><small>${a.desc}</small>
            </button>`).join('')}
        </div>
      </div>`}
      <div class="field">
        <span>Vitesse de perte de poids</span>
        <div class="seg seg-3">
          ${RATES.map((r) => `<button class="${Number(draft.rate) === r.v ? 'on' : ''}" data-act="rate" data-v="${r.v}">${r.label}<small>${r.desc}</small></button>`).join('')}
        </div>
      </div>
      <div class="callout">
        <div class="callout-big">${nf(t.target)} kcal / jour${budget ? ' + tes pas' : ''}</div>
        <div class="small">Dépense estimée : ${nf(t.tdee)} kcal. Objectif atteint dans environ <strong>${weeks} semaines</strong>.</div>
        ${t.capped ? '<div class="small warn-text">Objectif ajusté pour rester dans un déficit raisonnable et sans danger.</div>' : ''}
      </div>`;
  }
  const h = draft.habits;
  return `
    <h2>Habitudes à arrêter</h2>
    <p class="muted small">Coche celles que tu veux suivre. Le compteur démarre aujourd’hui ; tu pourras changer la date, en ajouter ou en retirer plus tard.</p>
    <div class="habit-setup">
      ${habitToggle('sugar', '')}
      ${habitToggle('tobacco', `
        <div class="grid-2">
          <label class="field"><span>Cigarettes / jour</span><input class="input" inputmode="numeric" data-input="hf" data-h="tobacco" data-f="perDay" value="${esc(h.tobacco.perDay)}"></label>
          <label class="field"><span>Prix du paquet (€)</span><input class="input" inputmode="decimal" data-input="hf" data-h="tobacco" data-f="packPrice" value="${esc(h.tobacco.packPrice)}"></label>
        </div>`)}
      ${habitToggle('nofap', `
        <label class="field"><span>Nom affiché (tu peux mettre un nom discret)</span><input class="input" data-input="hf" data-h="nofap" data-f="name" value="${esc(h.nofap.name)}"></label>`)}
      ${habitToggle('alcohol', `
        <div class="grid-2">
          <label class="field"><span>Verres / semaine</span><input class="input" inputmode="numeric" data-input="hf" data-h="alcohol" data-f="perWeek" value="${esc(h.alcohol.perWeek)}"></label>
          <label class="field"><span>Budget / semaine (€)</span><input class="input" inputmode="decimal" data-input="hf" data-h="alcohol" data-f="budget" value="${esc(h.alcohol.budget)}"></label>
        </div>`)}
    </div>`;
}

function habitToggle(id, extra) {
  const p = HABIT_PRESETS[id];
  const on = draft.habits[id].on;
  return `
    <div class="habit-toggle ${on ? 'on' : ''}">
      <button class="habit-toggle-head" data-act="toggleHabit" data-h="${id}" aria-pressed="${on}">
        <span class="hc-icon">${p.icon}</span>
        <span class="grow"><strong>${esc(id === 'nofap' ? draft.habits.nofap.name || p.name : p.name)}</strong><small>${esc(p.goal)}</small></span>
        <span class="check">${on ? '✓' : ''}</span>
      </button>
      ${on && extra ? `<div class="habit-toggle-body">${extra}</div>` : ''}
    </div>`;
}

function finish() {
  const today = todayKey();
  const now = Date.now();
  const profile = profileFromDraft();
  profile.waterGoal = defaultWaterGoal(profile.startWeight);
  profile.glassMl = 250;
  profile.sleepGoal = 7.5;
  profile.stepsGoal = 7000;
  profile.kcalOverride = null;
  profile.startDate = today;

  const h = draft.habits;
  const habits = [];
  const mk = (preset, extra = {}) => ({
    id: store.uid(),
    preset,
    name: HABIT_PRESETS[preset].name,
    icon: HABIT_PRESETS[preset].icon,
    startDate: today,
    startedAt: now,
    costPerDay: 0,
    unitsPerDay: 0,
    unitLabel: HABIT_PRESETS[preset].unitLabel || '',
    log: {},
    urges: [],
    relapses: [],
    archived: false,
    ...extra,
  });
  if (h.sugar.on) habits.push(mk('sugar'));
  if (h.tobacco.on) {
    const perDay = parseNum(h.tobacco.perDay) || 0;
    habits.push(mk('tobacco', { unitsPerDay: perDay, costPerDay: (perDay / 20) * (parseNum(h.tobacco.packPrice) || 0) }));
  }
  if (h.nofap.on) habits.push(mk('nofap', { name: h.nofap.name.trim() || HABIT_PRESETS.nofap.name }));
  if (h.alcohol.on) {
    habits.push(mk('alcohol', { unitsPerDay: (parseNum(h.alcohol.perWeek) || 0) / 7, costPerDay: (parseNum(h.alcohol.budget) || 0) / 7 }));
  }

  store.update((s) => {
    s.profile = profile;
    s.habits = habits;
    s.program = { startDate: today, level: null, place: 'home' };
    s.days[today] = { ...(s.days[today] || {}), weight: profile.startWeight };
  });
  step = 0;
  location.hash = '#/today';
  toast(`C’est parti${profile.name ? `, ${profile.name}` : ''} !`, { icon: '🚀' });
}

export function render(root, ctx) {
  root.innerHTML = `
    <div class="onboarding">
      <div class="steps">${Array.from({ length: STEPS }, (_, i) => `<span class="${i <= step ? 'on' : ''}"></span>`).join('')}</div>
      <div class="card">${stepHtml()}</div>
      <p class="error" id="ob-error" role="alert"></p>
      <div class="btn-row">
        ${step > 0 ? '<button class="btn" data-act="back">Retour</button>' : ''}
        <button class="btn btn-primary grow" data-act="next">${step === STEPS - 1 ? 'Commencer' : 'Suivant'}</button>
      </div>
    </div>`;

  const updateBmi = () => {
    const el = root.querySelector('#bmi-hint');
    if (!el) return;
    const w = parseNum(draft.weight);
    const h = parseNum(draft.heightCm);
    el.textContent = w && h > 100 ? `IMC actuel : ${nf(bmi(w, h), 1)} (${bmiLabel(bmi(w, h))})` : '';
  };
  updateBmi();

  bindActions(root, {
    f(el) {
      draft[el.dataset.f] = el.value;
      updateBmi();
    },
    hf(el) {
      draft.habits[el.dataset.h][el.dataset.f] = el.value;
    },
    sex(el) {
      draft.sex = el.dataset.v;
      ctx.rerender();
    },
    activity(el) {
      draft.activity = Number(el.dataset.v);
      ctx.rerender();
    },
    stepsMode(el) {
      draft.stepsMode = el.dataset.v;
      ctx.rerender();
    },
    rate(el) {
      draft.rate = Number(el.dataset.v);
      ctx.rerender();
    },
    toggleHabit(el) {
      const h = draft.habits[el.dataset.h];
      h.on = !h.on;
      ctx.rerender();
    },
    back() {
      step = Math.max(0, step - 1);
      ctx.rerender();
    },
    next() {
      if (step === 1) {
        const err = validateProfile();
        if (err) {
          root.querySelector('#ob-error').textContent = err;
          return;
        }
      }
      if (step === STEPS - 1) return finish();
      step++;
      ctx.rerender();
      window.scrollTo(0, 0);
    },
  });
}
