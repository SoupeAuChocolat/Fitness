// Habitudes prédéfinies, conseils et déclencheurs.

export const HABIT_PRESETS = {
  sugar: {
    name: 'Sucre',
    icon: '🍬',
    goal: 'Zéro sucre ajouté : sodas, bonbons, gâteaux, sucre dans le café…',
    tips: [
      "Une envie de sucre dure rarement plus de 10 minutes : bois un grand verre d'eau et occupe-toi les mains.",
      'Mange un fruit entier : il calme l’envie avec des fibres en plus.',
      'Ajoute des protéines au petit-déjeuner (œufs, skyr, fromage blanc) : moins de fringales dans la journée.',
      "Ne garde pas de sucreries à la maison : ce qui n'est pas là ne se mange pas.",
      'Lis les étiquettes : sirop de glucose, dextrose, saccharose… c’est aussi du sucre.',
      'Le goût s’habitue en 2 à 3 semaines : les aliments te paraîtront vite assez sucrés.',
      'Une tisane à la cannelle ou à la vanille donne une sensation de douceur sans sucre.',
    ],
  },
  tobacco: {
    name: 'Tabac',
    icon: '🚭',
    unitLabel: 'cigarettes',
    goal: 'Ne plus fumer une seule cigarette.',
    help: 'Tabac Info Service : 39 89 — des tabacologues peuvent t’accompagner gratuitement. Les substituts nicotiniques sont remboursés sur prescription.',
    tips: [
      "Une envie de fumer passe en 3 à 5 minutes : respire profondément, l'envie va redescendre.",
      "Bois un grand verre d'eau lentement.",
      'Mâche un chewing-gum sans sucre ou croque une carotte.',
      'Change de pièce ou sors marcher 5 minutes.',
      'Évite le café et l’alcool les premières semaines s’ils sont associés à la cigarette.',
      "Pense à l'argent économisé : regarde le compteur dans l'app !",
      'Les substituts nicotiniques (patchs, gommes) doublent les chances de réussite : parles-en à un médecin ou un pharmacien.',
    ],
  },
  nofap: {
    name: 'Masturbation / porno',
    icon: '🛡️',
    goal: 'Reprendre le contrôle de cette habitude.',
    tips: [
      'Laisse ton téléphone hors de la chambre la nuit.',
      'Quand l’envie arrive, change d’environnement : sors de la pièce, va marcher.',
      'Fais 20 pompes ou 30 squats : l’énergie part dans le sport.',
      'Une douche fraîche aide à couper l’envie.',
      'Installe un bloqueur de contenus sur ton téléphone et ton ordinateur.',
      'Repère tes moments à risque (ennui, fatigue, soirée seul) et prévois une activité à ce moment-là.',
      'Appelle ou écris à quelqu’un : la solitude est un déclencheur fréquent.',
    ],
  },
  alcohol: {
    name: 'Alcool',
    icon: '🍷',
    unitLabel: 'verres',
    goal: 'Ne plus boire d’alcool.',
    help: 'Alcool Info Service : 0 980 980 930 (appel anonyme et non surtaxé).',
    tips: [
      'Prépare une alternative : bière sans alcool, eau pétillante citron, kombucha.',
      'Prépare une phrase simple pour refuser : « Je fais une pause, merci ».',
      'Évite les situations où tu bois par habitude les premières semaines.',
      "Mange avant de sortir et bois de l'eau.",
      "L'alcool apporte beaucoup de calories vides : c'est un gros levier pour perdre du poids.",
      'Note ce qui déclenche l’envie (stress, fin de journée, amis) pour anticiper.',
    ],
  },
};

export const GENERIC_TIPS = [
  'Respire lentement pendant 2 minutes : l’envie redescend souvent d’elle-même.',
  "Bois un grand verre d'eau.",
  'Change de pièce ou sors marcher 5 minutes.',
  'Rappelle-toi pourquoi tu as commencé.',
  'Écris ce que tu ressens à la place d’agir.',
];

export const TRIGGERS = [
  'Stress', 'Ennui', 'Fatigue', 'Solitude', 'Soirée / amis', 'Après un repas',
  'Écrans / réseaux', 'Tristesse', 'Colère', 'Habitude / automatisme', 'Autre',
];

export const MILESTONES = [1, 3, 7, 14, 21, 30, 60, 90, 180, 365];

// Bénéfices de l'arrêt du tabac, repères couramment diffusés
// (Tabac Info Service, OMS). Valeurs moyennes, variables selon les personnes.
export const TOBACCO_TIMELINE = [
  { hours: 0.34, label: '20 minutes', text: 'La tension artérielle et le pouls reviennent à la normale.' },
  { hours: 8, label: '8 heures', text: 'Le monoxyde de carbone dans le sang diminue de moitié, les cellules sont mieux oxygénées.' },
  { hours: 24, label: '24 heures', text: 'Le corps ne contient plus de nicotine, les poumons commencent à éliminer les résidus de fumée.' },
  { hours: 48, label: '48 heures', text: 'Le goût et l’odorat s’améliorent.' },
  { hours: 72, label: '72 heures', text: 'Respirer devient plus facile, on se sent plus énergique.' },
  { hours: 24 * 14, label: '2 semaines', text: 'La circulation s’améliore, la toux et la fatigue diminuent.' },
  { hours: 24 * 90, label: '3 mois', text: 'Le souffle revient, marcher et faire du sport devient plus facile.' },
  { hours: 24 * 270, label: '9 mois', text: 'Les cils des bronches ont repoussé, moins d’infections et d’essoufflement.' },
  { hours: 24 * 365, label: '1 an', text: 'Le risque d’infarctus est divisé par deux.' },
  { hours: 24 * 365 * 5, label: '5 ans', text: 'Le risque de cancer du poumon a presque diminué de moitié.' },
  { hours: 24 * 365 * 15, label: '10 à 15 ans', text: 'L’espérance de vie redevient proche de celle d’une personne n’ayant jamais fumé.' },
];

export const HABIT_ICONS = ['🍬', '🚭', '🛡️', '🍷', '🥤', '🍟', '☕', '📱', '🎮', '🛒', '🎰', '🌙', '💸', '🍔', '🍫', '⛔'];
