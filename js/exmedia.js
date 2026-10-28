// Visuel d'un exercice : 2 photos qui alternent (Free Exercise DB, domaine public)
// ou bonhomme animé quand il n'existe pas de photo.
import { GYM_EXERCISES, HOME_EXERCISES } from './data/exercises.js';
import { ANIMATIONS, mountStickFigure } from './stick.js';

// Exercices ayant leurs photos dans img/ex/<id>-0.jpg et -1.jpg
export const PHOTO_IDS = new Set([
  'squat', 'pompes_inclinees', 'pompes', 'pont_fessier', 'fentes', 'planche', 'planche_laterale', 'superman',
  'mountain_climbers', 'dead_bug', 'dips_chaise', 'presse', 'goblet_squat', 'squat_barre', 'leg_extension', 'leg_curl',
  'fentes_halteres', 'sdt_roumain', 'hip_thrust', 'dev_couche', 'dev_couche_halteres', 'dev_incline', 'pec_deck',
  'tirage_vertical', 'rowing_assis', 'rowing_haltere', 'tractions_assistees', 'dev_epaules', 'elevations_laterales',
  'curl_biceps', 'extension_triceps', 'dips_assistes', 'mollets', 'crunch_machine',
]);
const ALIAS = { gainage_salle: 'planche' };

const idByName = new Map(
  [...Object.entries(HOME_EXERCISES), ...Object.entries(GYM_EXERCISES)].map(([id, e]) => [e.name, ALIAS[id] || id]),
);

export const exerciseId = (name) => idByName.get(name) || null;

export function mediaHtml(name, size = 'md') {
  const id = exerciseId(name);
  if (!id) return '';
  if (PHOTO_IDS.has(id)) {
    return `<div class="ex-media ex-${size}" aria-hidden="true">
      <img src="img/ex/${id}-0.jpg" alt="" loading="lazy"><img class="ex-alt" src="img/ex/${id}-1.jpg" alt="" loading="lazy"></div>`;
  }
  if (ANIMATIONS[id]) return `<div class="ex-media ex-${size} ex-anim" data-anim="${id}"></div>`;
  return '';
}

// Lance les animations dessinées présentes dans root (une seule fois par élément).
export function startAnimations(root) {
  root.querySelectorAll('[data-anim]:not([data-mounted])').forEach((el) => {
    el.dataset.mounted = '1';
    mountStickFigure(el, el.dataset.anim);
  });
}
