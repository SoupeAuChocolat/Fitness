// Bibliothèque d'exercices, séances et programme de la semaine.

// mode : 'reps' (répétitions) ou 'time' (secondes).
export const HOME_EXERCISES = {
  squat: {
    name: 'Squat',
    mode: 'reps',
    desc: "Pieds écartés largeur d'épaules. Descends les fesses en arrière comme pour t'asseoir, dos droit, genoux dans l'axe des pieds, puis remonte en poussant dans les talons.",
    easier: "S'asseoir sur une chaise puis se relever, sans les mains.",
  },
  pompes_inclinees: {
    name: 'Pompes inclinées',
    mode: 'reps',
    desc: "Mains sur le bord d'une table ou d'un plan de travail, corps bien droit. Descends la poitrine vers le support puis pousse.",
    easier: 'Mains contre un mur, debout.',
  },
  pompes_genoux: {
    name: 'Pompes sur les genoux',
    mode: 'reps',
    desc: 'Mains sous les épaules, genoux au sol, corps aligné des genoux à la tête. Descends la poitrine près du sol puis pousse.',
    easier: "Pompes inclinées, mains sur une table.",
  },
  pompes: {
    name: 'Pompes',
    mode: 'reps',
    desc: 'Mains sous les épaules, corps gainé de la tête aux pieds. Descends la poitrine près du sol puis pousse.',
    easier: 'Pompes sur les genoux.',
  },
  pont_fessier: {
    name: 'Pont fessier',
    mode: 'reps',
    desc: 'Allongé sur le dos, genoux pliés, pieds au sol. Monte le bassin en serrant les fessiers, tiens 1 seconde, redescends lentement.',
    easier: 'Réduis l’amplitude.',
  },
  fentes: {
    name: 'Fentes alternées',
    mode: 'reps',
    perSide: true,
    desc: 'Fais un grand pas en avant, descends le genou arrière vers le sol (sans le poser), puis reviens. Alterne les jambes.',
    easier: "Tiens-toi au dossier d'une chaise.",
  },
  planche: {
    name: 'Gainage (planche)',
    mode: 'time',
    desc: 'En appui sur les avant-bras et la pointe des pieds, corps bien droit, ventre rentré. Ne creuse pas le dos et respire.',
    easier: 'Sur les genoux au lieu des pieds.',
  },
  planche_laterale: {
    name: 'Gainage latéral',
    mode: 'time',
    perSide: true,
    desc: "Sur le côté, en appui sur un avant-bras, corps aligné, bassin levé. Fais chaque côté.",
    easier: 'Genoux pliés au sol.',
  },
  jumping_jacks: {
    name: 'Jumping jacks',
    mode: 'time',
    desc: 'Saute en écartant bras et jambes, puis reviens pieds joints, bras le long du corps. Rythme régulier.',
    easier: 'Sans sauter : un pas de côté à la fois en levant les bras.',
  },
  montees_genoux: {
    name: 'Montées de genoux',
    mode: 'time',
    desc: 'Sur place, monte les genoux à hauteur de hanches en alternant, bras actifs.',
    easier: 'En marchant sur place, genoux moins hauts.',
  },
  chaise: {
    name: 'La chaise',
    mode: 'time',
    desc: 'Dos plaqué contre un mur, descends jusqu’à avoir les cuisses parallèles au sol et tiens la position.',
    easier: 'Descends moins bas.',
  },
  superman: {
    name: 'Superman',
    mode: 'reps',
    desc: 'Allongé sur le ventre, bras tendus devant. Décolle bras et jambes 2 secondes, redescends doucement.',
    easier: 'Lève seulement les bras, puis seulement les jambes.',
  },
  mountain_climbers: {
    name: 'Mountain climbers',
    mode: 'time',
    desc: 'En position de pompe, ramène alternativement les genoux vers la poitrine, dos plat.',
    easier: "Mains sur une chaise ou un canapé, et lentement.",
  },
  dead_bug: {
    name: 'Dead bug',
    mode: 'reps',
    desc: 'Sur le dos, bras tendus vers le plafond, jambes pliées à 90°. Descends un bras et la jambe opposée sans décoller le bas du dos, reviens et alterne.',
    easier: 'Bouge seulement les jambes.',
  },
  dips_chaise: {
    name: 'Dips sur chaise',
    mode: 'reps',
    desc: "Mains sur le bord d'une chaise stable derrière toi, jambes pliées. Plie les coudes vers l'arrière puis pousse.",
    easier: 'Pieds plus proches de la chaise, amplitude réduite.',
  },
  burpee_doux: {
    name: 'Burpee sans saut',
    mode: 'reps',
    desc: 'Accroupis-toi, mains au sol, recule les pieds un par un en planche, reviens, puis redresse-toi.',
    easier: "Mains sur une chaise au lieu du sol.",
  },
};

export const GYM_EXERCISES = {
  presse: { name: 'Presse à cuisses', mode: 'reps', desc: 'Pieds largeur de hanches sur la plateforme. Descends jusqu’à 90° aux genoux puis pousse sans verrouiller les genoux.' },
  goblet_squat: { name: 'Goblet squat', mode: 'reps', desc: 'Un haltère tenu contre la poitrine. Squat dos droit, coudes entre les genoux en bas du mouvement.' },
  squat_barre: { name: 'Squat (barre)', mode: 'reps', desc: 'Barre sur les trapèzes, dos gainé. Descends en poussant les fesses en arrière, genoux dans l’axe des pieds.' },
  leg_extension: { name: 'Leg extension', mode: 'reps', desc: 'Assis sur la machine, tends les jambes en contractant les cuisses, redescends lentement.' },
  leg_curl: { name: 'Leg curl', mode: 'reps', desc: 'Sur la machine, plie les genoux pour ramener le boudin vers les fessiers, contrôle la descente.' },
  fentes_halteres: { name: 'Fentes avec haltères', mode: 'reps', perSide: true, desc: 'Un haltère dans chaque main, grand pas en avant, genou arrière vers le sol, puis reviens.' },
  sdt_roumain: { name: 'Soulevé de terre roumain', mode: 'reps', desc: 'Haltères devant les cuisses, jambes presque tendues. Penche le buste dos plat en reculant les fesses, remonte en serrant les fessiers.' },
  hip_thrust: { name: 'Hip thrust', mode: 'reps', desc: 'Haut du dos sur un banc, charge sur les hanches. Monte le bassin jusqu’à l’alignement, serre les fessiers.' },
  dev_couche: { name: 'Développé couché', mode: 'reps', desc: 'Allongé sur le banc, descends la barre (ou les haltères) vers le bas des pectoraux puis pousse.' },
  dev_couche_halteres: { name: 'Développé couché haltères', mode: 'reps', desc: 'Allongé, haltères au niveau de la poitrine, pousse vers le haut puis redescends lentement.' },
  dev_incline: { name: 'Développé incliné', mode: 'reps', desc: 'Banc incliné à 30°, pousse les haltères ou la barre au-dessus du haut de la poitrine.' },
  pec_deck: { name: 'Butterfly (pec deck)', mode: 'reps', desc: 'Assis sur la machine, ramène les bras devant toi en serrant les pectoraux.' },
  tirage_vertical: { name: 'Tirage vertical', mode: 'reps', desc: 'Assis à la poulie haute, tire la barre vers le haut de la poitrine en serrant les omoplates.' },
  rowing_assis: { name: 'Rowing assis (poulie basse)', mode: 'reps', desc: 'Dos droit, tire la poignée vers le nombril en serrant les omoplates, reviens bras tendus.' },
  rowing_haltere: { name: 'Rowing haltère', mode: 'reps', perSide: true, desc: 'Un genou et une main sur le banc, tire l’haltère vers la hanche, coude près du corps.' },
  tractions_assistees: { name: 'Tractions assistées', mode: 'reps', desc: 'Sur la machine d’assistance, tire jusqu’à passer le menton au-dessus de la barre.' },
  dev_epaules: { name: 'Développé épaules', mode: 'reps', desc: 'Assis, haltères ou machine à hauteur d’épaules, pousse au-dessus de la tête sans cambrer.' },
  elevations_laterales: { name: 'Élévations latérales', mode: 'reps', desc: 'Haltères le long du corps, monte les bras sur les côtés jusqu’à l’horizontale, coudes légèrement fléchis.' },
  curl_biceps: { name: 'Curl biceps', mode: 'reps', desc: 'Haltères en main, plie les coudes sans balancer le buste, redescends lentement.' },
  extension_triceps: { name: 'Extension triceps (poulie)', mode: 'reps', desc: 'Face à la poulie haute, coudes collés au corps, tends les bras vers le bas.' },
  dips_assistes: { name: 'Dips assistés', mode: 'reps', desc: 'Sur la machine d’assistance, descends en pliant les coudes puis pousse.' },
  mollets: { name: 'Mollets (machine)', mode: 'reps', desc: 'Monte sur la pointe des pieds le plus haut possible, redescends lentement.' },
  crunch_machine: { name: 'Crunch (machine ou sol)', mode: 'reps', desc: 'Enroule le buste en rapprochant les côtes du bassin, sans tirer sur la nuque.' },
  gainage_salle: { name: 'Gainage (planche)', mode: 'time', desc: 'Sur les avant-bras et la pointe des pieds, corps droit, ventre rentré.' },
};

// MET : dépense énergétique approximative (Compendium of Physical Activities).
export const CARDIO = [
  { id: 'marche', name: 'Marche', icon: '🚶', met: 3.0 },
  { id: 'marche_rapide', name: 'Marche rapide', icon: '🚶', met: 4.3 },
  { id: 'randonnee', name: 'Randonnée', icon: '🥾', met: 6.0 },
  { id: 'course_lente', name: 'Course lente (8 km/h)', icon: '🏃', met: 8.3 },
  { id: 'course', name: 'Course (10 km/h)', icon: '🏃', met: 9.8 },
  { id: 'velo', name: 'Vélo tranquille', icon: '🚲', met: 4.0 },
  { id: 'velo_modere', name: 'Vélo / vélo d’appartement modéré', icon: '🚴', met: 6.8 },
  { id: 'natation', name: 'Natation', icon: '🏊', met: 5.8 },
  { id: 'elliptique', name: 'Elliptique', icon: '⚙️', met: 5.0 },
  { id: 'rameur', name: 'Rameur', icon: '🚣', met: 7.0 },
  { id: 'corde', name: 'Corde à sauter', icon: '🪢', met: 10.0 },
  { id: 'hiit', name: 'HIIT / circuit training', icon: '🔥', met: 8.0 },
  { id: 'renfo_maison', name: 'Renforcement maison', icon: '🏠', met: 3.8 },
  { id: 'musculation', name: 'Musculation', icon: '🏋️', met: 4.0 },
  { id: 'yoga', name: 'Yoga / étirements', icon: '🧘', met: 2.5 },
  { id: 'danse', name: 'Danse / zumba', icon: '💃', met: 6.0 },
  { id: 'sport_co', name: 'Foot / sport collectif', icon: '⚽', met: 7.0 },
  { id: 'raquette', name: 'Tennis / badminton', icon: '🎾', met: 6.5 },
  { id: 'autre', name: 'Autre activité', icon: '✨', met: 4.0 },
];

export const MET_HOME_SESSION = 3.8;
export const MET_GYM_SESSION = 4.0;

// Programme maison progressif. levels[i] = [séries, répétitions ou secondes]
// pour les niveaux 1 à 4 ; null = exercice pas encore au programme.
// ex peut varier selon le niveau (tableau).
export const HOME_SESSIONS = {
  A: [
    { ex: 'squat', levels: [[2, 10], [3, 12], [3, 15], [4, 15]] },
    { ex: ['pompes_inclinees', 'pompes_inclinees', 'pompes_genoux', 'pompes_genoux'], levels: [[2, 8], [3, 8], [3, 8], [3, 12]] },
    { ex: 'pont_fessier', levels: [[2, 12], [3, 12], [3, 15], [4, 15]] },
    { ex: 'fentes', levels: [[2, 6], [3, 8], [3, 10], [3, 12]] },
    { ex: 'planche', levels: [[2, 20], [3, 25], [3, 30], [3, 40]] },
    { ex: 'jumping_jacks', levels: [[2, 30], [3, 30], [3, 40], [4, 40]] },
  ],
  B: [
    { ex: 'chaise', levels: [[2, 20], [3, 30], [3, 40], [3, 45]] },
    { ex: 'montees_genoux', levels: [[2, 30], [3, 30], [3, 40], [4, 40]] },
    { ex: 'superman', levels: [[2, 10], [3, 10], [3, 12], [3, 15]] },
    { ex: 'dips_chaise', levels: [null, [2, 8], [3, 8], [3, 10]] },
    { ex: 'mountain_climbers', levels: [[2, 20], [3, 20], [3, 30], [3, 40]] },
    { ex: 'dead_bug', levels: [[2, 10], [3, 10], [3, 12], [3, 16]] },
    { ex: 'planche_laterale', levels: [[2, 15], [2, 20], [3, 25], [3, 30]] },
    { ex: 'burpee_doux', levels: [null, null, [3, 6], [3, 10]] },
  ],
};
export const HOME_REST = [60, 45, 45, 30];

export const GYM_SESSIONS = {
  A: [
    { ex: 'presse', sets: 3, target: 12 },
    { ex: 'dev_couche_halteres', sets: 3, target: 10 },
    { ex: 'tirage_vertical', sets: 3, target: 12 },
    { ex: 'leg_curl', sets: 3, target: 12 },
    { ex: 'gainage_salle', sets: 3, target: 30 },
  ],
  B: [
    { ex: 'goblet_squat', sets: 3, target: 12 },
    { ex: 'rowing_assis', sets: 3, target: 12 },
    { ex: 'dev_epaules', sets: 3, target: 10 },
    { ex: 'sdt_roumain', sets: 3, target: 10 },
    { ex: 'crunch_machine', sets: 3, target: 15 },
  ],
};
export const GYM_REST = 90;

export const WARMUP = [
  '1 min de marche sur place',
  '10 rotations des bras dans chaque sens',
  '10 rotations du bassin',
  '10 squats lents sans amplitude maximale',
  '30 s de montées de genoux légères',
];

export const COOLDOWN = 'Termine par 5 minutes d’étirements doux : cuisses, mollets, fessiers, pectoraux, dos. Respire lentement.';

// Programme type de la semaine (0 = dimanche … 6 = samedi).
export const WEEK_PLAN = {
  1: { type: 'strength' },
  2: { type: 'cardio' },
  3: { type: 'strength' },
  4: { type: 'active_rest' },
  5: { type: 'strength' },
  6: { type: 'cardio' },
  0: { type: 'rest' },
};

export const CARDIO_MINUTES = [25, 30, 35, 40];

// Échauffement adapté au type de séance.
export const WARMUPS = {
  home: [
    '2 min de jumping jacks légers ou de montées de genoux',
    '10 squats lents',
    '10 pompes inclinées ou sur les genoux',
    '10 rotations des épaules dans chaque sens',
    '30 s de gainage léger',
  ],
  gym: [
    '5 min de vélo ou de tapis à allure facile',
    '10 montées sur banc ou fentes sans charge',
    '10 rotations d’épaules et 10 tractions ou tirages très légers',
    'Une série d’échauffement avec la moitié de la charge prévue, 8 répétitions',
  ],
  cardio: [
    '5 min de marche lente, puis accélère doucement',
    '1 min de montées de genoux légères',
    'Respire calmement avant de commencer',
  ],
  stretch: ['2 min de marche sur place pour réchauffer le corps'],
};

export const warmupFor = (kind) => WARMUPS[kind] || WARMUPS.home;

// Étirements guidés : 30 secondes chacun.
export const STRETCHES = [
  { name: 'Étirement des ischio-jambiers', mode: 'time', perSide: true, desc: 'Assis, une jambe tendue devant toi. Penche-toi doucement vers le pied sans arrondir le dos. Respire.' },
  { name: 'Étirement des quadriceps', mode: 'time', perSide: true, desc: 'Debout, attrape ton pied derrière toi et rapproche le talon des fesses. Genoux serrés, bassin rentré.' },
  { name: 'Étirement des fessiers', mode: 'time', perSide: true, desc: 'Allongé sur le dos, pose une cheville sur le genou opposé et rapproche la cuisse vers la poitrine.' },
  { name: 'Étirement des pectoraux', mode: 'time', perSide: false, desc: 'Avant-bras appuyés sur un cadre de porte à hauteur d’épaules. Avance doucement le buste.' },
  { name: 'Étirement du dos', mode: 'time', perSide: false, desc: 'À quatre pattes : arrondis le dos en expirant, puis creuse-le doucement en inspirant.' },
  { name: 'Étirement des mollets', mode: 'time', perSide: true, desc: 'Mains contre un mur, une jambe en arrière, talon au sol. Pousse doucement le bassin vers le mur.' },
  { name: 'Étirement des épaules', mode: 'time', perSide: true, desc: 'Bras tendu devant toi, ramène-le contre la poitrine avec l’autre main.' },
];
