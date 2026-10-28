# Ma Forme 🌱

Application web simple, en français, pour **perdre du poids** et **reprendre de bonnes habitudes**, au quotidien, sur ton téléphone.

- ⚖️ **Mesures** : poids, tour de taille, eau, sommeil, pas
- 🍽️ **Repas** : plus de 130 aliments courants avec leurs calories, aliments perso, « fréquents » en 1 clic, « comme hier »
- 🎯 **Objectif calorique** calculé selon ton profil (formule de Mifflin-St Jeor), ajusté quand ton poids baisse
- 💪 **Sport** : programme débutant progressif (maison sans matériel ou salle), séance guidée avec minuteurs de repos et chrono, cardio avec estimation des calories, charges notées en salle
- 🛡️ **Habitudes à arrêter** (sucre, tabac, masturbation / porno, alcool, ou les tiennes) : check-in quotidien « Tenu / Craqué », série en cours, record, calendrier, paliers, argent économisé, bouton 🆘 avec respiration guidée et conseils, suivi des déclencheurs, frise des bénéfices de l'arrêt du tabac
- 📈 **Progrès** : courbe de poids avec moyenne sur 7 jours et date estimée d'objectif, calories sur 14 jours, sport par semaine, bilan de la semaine, badges

L'app marche **hors ligne**, s'installe sur l'écran d'accueil comme une vraie application, et **tes données restent sur ton téléphone** : rien n'est envoyé sur Internet.

## Installer l'app sur ton téléphone

L'app doit d'abord être mise en ligne (c'est gratuit). Le code ne contient aucune donnée personnelle : tes données sont créées et gardées uniquement dans le navigateur de ton téléphone.

### Option A — GitHub Pages

GitHub Pages est gratuit pour les dépôts **publics** (pour un dépôt privé, il faut un abonnement GitHub payant).

1. Sur GitHub, ouvre le dépôt → **Settings** → **General** → tout en bas, **Change visibility** → **Public** (facultatif si tu as GitHub Pro).
2. **Settings** → **Pages** → *Source* : **Deploy from a branch** → choisis la branche qui contient l'app (par ex. `main`) et le dossier **/ (root)** → **Save**.
3. Après 1 à 2 minutes, l'adresse s'affiche en haut de la page, du type `https://soupeauchocolat.github.io/Fitness/`.

### Option B — Netlify (le dépôt peut rester privé)

1. Télécharge le dépôt en ZIP (bouton **Code** → **Download ZIP**) et décompresse-le.
2. Va sur <https://app.netlify.com/drop> et glisse-dépose le dossier : tu obtiens une adresse en `https://….netlify.app`.

### Ajouter l'app à l'écran d'accueil

- **iPhone (Safari)** : ouvre l'adresse → bouton **Partager** → **Sur l'écran d'accueil**.
- **Android (Chrome)** : ouvre l'adresse → menu **⋮** → **Installer l'application** (ou **Ajouter à l'écran d'accueil**).

Ouvre ensuite toujours l'app depuis son icône : c'est là que tes données sont gardées.

## Tes données

- Elles sont stockées dans le navigateur de ton téléphone, rien ne part sur Internet.
- **Réglages → Sauvegarder** crée un fichier de sauvegarde ; **Restaurer** le recharge (pratique pour changer de téléphone).
- Si tu effaces les données de ton navigateur ou désinstalles l'app, les données sont perdues : fais une sauvegarde de temps en temps.

## Comment ça marche

- **Calories** : métabolisme de base (Mifflin-St Jeor) × niveau d'activité, moins un déficit selon le rythme choisi (0,25 / 0,5 / 0,75 kg par semaine). Le déficit est limité à 25 % de la dépense, avec un minimum de 1 500 kcal (homme) ou 1 200 kcal (femme). Les calories du sport sont affichées à part et ne sont pas « rajoutées » à l'objectif.
- **Habitudes** : un jour non noté compte comme tenu ; seul « Craqué » remet la série à zéro. L'argent économisé se base sur le nombre total de jours tenus depuis le début.
- **Programme sport** : Lun / Mer / Ven renforcement (séances A et B en alternance), Mar / Sam cardio, Jeu repos actif, Dim repos. Le niveau maison augmente toutes les 2 semaines (modifiable dans l'onglet Sport).

## Pour les développeurs

Aucune dépendance, aucune compilation : HTML, CSS et JavaScript (modules ES).

```bash
npm start   # sert l'app sur http://localhost:8080 (python3 -m http.server)
npm test    # tests des calculs (node --test)
```

```
index.html              page unique
manifest.webmanifest    installation sur l'écran d'accueil
sw.js                   service worker (hors ligne)
css/style.css           styles (clair / sombre)
js/app.js               routage et barre d'onglets
js/store.js             données (localStorage)
js/calc.js              calculs : calories, tendances, séries d'habitudes, bilans
js/program.js           programme sportif
js/badges.js            badges
js/charts.js            graphiques SVG
js/data/                aliments, exercices, habitudes, citations
js/views/               écrans
tests/                  tests unitaires
```

Si tu ajoutes un fichier, ajoute-le aussi à la liste `ASSETS` de `sw.js` (un test le vérifie).

## Avertissement

Ma Forme est une aide au suivi personnel. Les calories et les dépenses affichées sont des estimations. L'app ne remplace pas l'avis d'un professionnel de santé : en cas de problème de santé, de perte de poids importante, ou pour arrêter le tabac ou l'alcool, parles-en à ton médecin.

- Tabac Info Service : **39 89** (accompagnement gratuit par des tabacologues)
- Alcool Info Service : **0 980 980 930** (anonyme, non surtaxé)
