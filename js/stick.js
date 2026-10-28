// Petites animations de bonhomme (SVG) pour les exercices sans photo.
// Chaque pose donne les articulations dans un repère 120 × 100 (sol à y = 90).
// Vue de profil : le membre « l » est celui du fond (dessiné plus clair).

const pose = (head, neck, hip, lE, lH, rE, rH, lK, lF, rK, rF) => ({ head, neck, hip, lE, lH, rE, rH, lK, lF, rK, rF });
// Bras et jambes confondus (vue de profil symétrique).
const side = (head, neck, hip, elbow, hand, knee, foot) => pose(head, neck, hip, elbow, hand, elbow, hand, knee, foot, knee, foot);

const STAND = side([60, 14], [60, 24], [60, 52], [61, 38], [62, 52], [60, 71], [60, 90]);

// frames : [pose, durée du mouvement vers cette pose (ms), maintien (ms)]
export const ANIMATIONS = {
  jumping_jacks: {
    label: 'Jumping jacks',
    frames: [
      [pose([60, 14], [60, 24], [60, 52], [55, 37], [53, 51], [65, 37], [67, 51], [57, 71], [56, 90], [63, 71], [64, 90]), 320, 60],
      [pose([60, 11], [60, 21], [60, 49], [48, 12], [40, 2], [72, 12], [80, 2], [51, 68], [44, 89], [69, 68], [76, 89]), 320, 60],
    ],
  },
  montees_genoux: {
    label: 'Montées de genoux',
    frames: [
      [pose([62, 14], [61, 24], [60, 52], [54, 38], [51, 49], [67, 36], [73, 28], [74, 53], [72, 71], [60, 71], [60, 90]), 280, 40],
      [pose([62, 14], [61, 24], [60, 52], [67, 36], [73, 28], [54, 38], [51, 49], [60, 71], [60, 90], [74, 53], [72, 71]), 280, 40],
    ],
  },
  chaise: {
    label: 'La chaise',
    extra: '<line class="stick-prop" x1="40" y1="6" x2="40" y2="90"/>',
    frames: [
      [side([47, 14], [46, 24], [46, 52], [49, 38], [51, 51], [47, 71], [49, 90]), 900, 500],
      [side([47, 30], [46, 40], [46, 64], [56, 52], [67, 60], [70, 64], [70, 90]), 900, 2200],
    ],
  },
  pompes_genoux: {
    label: 'Pompes sur les genoux',
    frames: [
      [side([91, 56], [81, 62], [58, 76], [82, 76], [83, 90], [40, 90], [24, 80]), 600, 200],
      [side([91, 76], [81, 80], [58, 85], [72, 79], [83, 90], [40, 90], [24, 80]), 600, 200],
    ],
  },
  burpee_doux: {
    label: 'Burpee sans saut',
    frames: [
      [STAND, 550, 300],
      [side([75, 45], [67, 52], [52, 67], [70, 70], [74, 90], [67, 73], [56, 90]), 550, 250],
      [side([82, 58], [72, 63], [46, 71], [72, 77], [74, 90], [31, 79], [17, 89]), 650, 450],
      [side([75, 45], [67, 52], [52, 67], [70, 70], [74, 90], [67, 73], [56, 90]), 650, 250],
    ],
  },
};

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function mountStickFigure(el, id) {
  const anim = ANIMATIONS[id];
  if (!anim) return;
  el.innerHTML = `
    <svg viewBox="10 0 100 94" class="stick" role="img" aria-label="Animation : ${anim.label}">
      <line class="stick-prop" x1="4" y1="91" x2="116" y2="91"/>
      ${anim.extra || ''}
      <g class="stick-back"><polyline data-p="lArm"/><polyline data-p="lLeg"/></g>
      <g class="stick-front"><line data-p="torso"/><polyline data-p="rLeg"/><polyline data-p="rArm"/><circle data-p="head" r="7"/></g>
    </svg>`;
  const $ = (k) => el.querySelector(`[data-p="${k}"]`);
  const parts = { lArm: $('lArm'), lLeg: $('lLeg'), torso: $('torso'), rLeg: $('rLeg'), rArm: $('rArm'), head: $('head') };
  const pts = (...list) => list.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  const draw = (p) => {
    parts.lArm.setAttribute('points', pts(p.neck, p.lE, p.lH));
    parts.rArm.setAttribute('points', pts(p.neck, p.rE, p.rH));
    parts.lLeg.setAttribute('points', pts(p.hip, p.lK, p.lF));
    parts.rLeg.setAttribute('points', pts(p.hip, p.rK, p.rF));
    parts.torso.setAttribute('x1', p.neck[0]);
    parts.torso.setAttribute('y1', p.neck[1]);
    parts.torso.setAttribute('x2', p.hip[0]);
    parts.torso.setAttribute('y2', p.hip[1]);
    parts.head.setAttribute('cx', p.head[0]);
    parts.head.setAttribute('cy', p.head[1]);
  };

  const frames = anim.frames;
  const cycle = frames.reduce((s, [, move, hold]) => s + move + hold, 0);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  const tick = (now) => {
    if (!el.isConnected) return; // élément retiré de la page : on s'arrête
    let t = (now - t0) % cycle;
    for (let i = 0; i < frames.length; i++) {
      const [target, move, hold] = frames[i];
      const from = frames[(i - 1 + frames.length) % frames.length][0];
      if (t < move) {
        const k = ease(t / move);
        draw(Object.fromEntries(Object.keys(target).map((j) => [j, mix(from[j], target[j], k)])));
        break;
      }
      t -= move;
      if (t < hold) {
        draw(target);
        break;
      }
      t -= hold;
    }
    if (!reduced) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
