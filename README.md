# Ma Forme 🌱

Application Android (et web), en français, pour **perdre du poids** et **reprendre de bonnes habitudes**, au quotidien.

- ⚖️ **Mesures** : poids, tour de taille, eau, sommeil, pas
- 👣 **Pas et sommeil automatiques** depuis **Connexion Santé** (Health Connect), avec les calories brûlées en marchant
- 🍽️ **Repas** : plus de 3 000 aliments (table officielle **CIQUAL** de l'ANSES) + 137 aliments courants en portions, **scan de code-barres** (Open Food Facts), aliments perso, « fréquents » en 1 clic, « comme hier »
- 🥩 **Protéines, glucides, lipides** avec un objectif de protéines
- 🎯 **Objectif calorique** calculé selon ton profil, qui augmente avec tes pas
- 💪 **Sport** : programme débutant progressif (maison sans matériel ou salle), **photos animées ou animations** pour chaque exercice, séance guidée avec minuteurs, cardio, charges notées en salle
- 🛡️ **Habitudes à arrêter** (sucre, tabac, masturbation / porno, alcool, ou les tiennes) : check-in « Tenu / Craqué », séries, calendrier, argent économisé, bouton 🆘 avec respiration guidée
- 🪥 **Brossage de dents** matin, midi et soir, avec série de jours parfaits
- 🔔 **Rappels** : bilan du soir, eau, séance de sport, brossage de dents
- 📈 **Progrès** : courbes, pas, calories, sport, bilan de la semaine, badges

Tes données restent **sur ton téléphone** : rien n'est envoyé sur un serveur (seul le scan de code-barres interroge Open Food Facts avec le numéro du produit).

## Installer l'app Android

1. Télécharge **MaForme.apk** sur ton téléphone :
   - depuis le dépôt GitHub → **Releases** (versions de la branche principale),
   - ou depuis l'onglet **Actions** → dernière exécution « APK Android » → artefact **MaForme-apk** (fichier zip à décompresser).
2. Ouvre le fichier. Android demande d'autoriser l'installation depuis ton navigateur ou ton gestionnaire de fichiers : accepte (une seule fois).
3. Lance **Ma Forme**, remplis ton profil, puis sur l'écran « Aujourd'hui » :
   - **Connecter Connexion Santé** → coche « Pas » et « Sommeil » ;
   - **Activer les rappels** → autorise les notifications.

Les nouvelles versions s'installent **par-dessus** l'ancienne : tes données sont conservées (toutes les versions sont signées avec la même clé).

### Mes pas n'apparaissent pas ?

Ma Forme lit les pas que Connexion Santé a reçus. Ouvre **Connexion Santé → Données et accès → Activité → Pas** : s'il n'y a rien, aucune app ne lui envoie tes pas. Sur beaucoup de téléphones Android 14+, le téléphone compte les pas tout seul ; sinon installe **Google Fit** et active le partage vers Connexion Santé dans ses réglages.

Une valeur que tu modifies à la main dans Ma Forme n'est plus remplacée par la synchronisation pour ce jour-là.

## Version web (facultatif)

La même app fonctionne dans un navigateur (sans Connexion Santé, rappels ni scan à la caméra ; le code-barres peut être tapé) : <https://soupeauchocolat.github.io/Fitness/> (GitHub Pages), puis « Ajouter à l'écran d'accueil ». Les données du navigateur et celles de l'app Android sont séparées (passer de l'une à l'autre avec Sauvegarder / Restaurer).

## Tes données

- Stockées dans l'app sur le téléphone (et dans la sauvegarde Android automatique si elle est activée).
- **Réglages → Sauvegarder** crée un fichier de sauvegarde à garder où tu veux (Drive, mail…) ; **Restaurer** le recharge.

## Comment ça marche

- **Calories de base** : métabolisme de base (Mifflin-St Jeor) × 1,2 (journée assise), moins un déficit selon le rythme choisi (0,25 / 0,5 / 0,75 kg par semaine). Déficit limité à 25 % de la dépense, minimum 1 500 kcal (homme) ou 1 200 kcal (femme).
- **Calories des pas** : équation métabolique de la marche de l'**ACSM** (American College of Sports Medicine) : coût net ≈ 0,1 ml d'O₂ par kg et par mètre, soit **≈ 0,5 kcal par kg et par km** (1 L d'O₂ ≈ 5 kcal). Longueur de pas estimée à 41,5 % de la taille (homme) ou 41,3 % (femme). Les 4 000 premiers pas de la journée sont considérés comme déjà compris dans la dépense de base ; au-delà, les calories s'ajoutent à l'objectif du jour (réglable : « affichées seulement »).
- **Protéines** : 1,6 g par kg de poids objectif (modifiable).
- **Habitudes** : un jour non noté compte comme tenu ; seul « Craqué » remet la série à zéro.
- **Programme sport** : Lun / Mer / Ven renforcement (A/B en alternance), Mar / Sam cardio, Jeu repos actif, Dim repos. Le niveau maison augmente toutes les 2 semaines.

## Sources des données

- Aliments : table de composition nutritionnelle **CIQUAL 2020**, ANSES ([ciqual.anses.fr](https://ciqual.anses.fr)), licence ouverte. Quand l'énergie n'est pas renseignée, elle est calculée à partir des macronutriments (coefficients du règlement UE 1169/2011).
- Produits scannés : [Open Food Facts](https://world.openfoodfacts.org), base collaborative (ODbL).
- Photos d'exercices : [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (domaine public, Unlicense). Les 5 exercices sans photo sont animés en dessin.

## Pour les développeurs

L'app web (HTML, CSS, JavaScript en modules ES, sans compilation) est à la racine. Le projet Android ([Capacitor](https://capacitorjs.com) 8) est dans `android/`.

```bash
npm install            # Capacitor et ses plugins
npm start              # app web sur http://localhost:8080
npm test               # tests (node --test)
npm run android:apk    # copie l'app dans www/, synchronise Android, construit l'APK
                       # → android/app/build/outputs/apk/release/app-release.apk
```

Il faut Node 22+, Java 21 et le SDK Android (variable `ANDROID_HOME` ou `android/local.properties`). GitHub Actions construit l'APK à chaque push (`.github/workflows/android.yml`).

```
index.html, css/, js/          app web (aussi utilisée telle quelle dans l'app Android)
js/native.js                   accès aux plugins Android (null dans un navigateur)
js/health.js                   synchronisation Connexion Santé
js/reminders.js                rappels (notifications locales)
js/barcode.js                  scan + Open Food Facts
js/foods.js, js/data/ciqual.js base d'aliments (CIQUAL générée par scripts/ciqual-to-js.py)
js/exmedia.js, js/stick.js     photos et animations des exercices (img/ex/)
android/app/src/main/java/fr/maforme/app/HealthConnectPlugin.kt   plugin Connexion Santé
scripts/build-web.js           prépare www/ pour Android
tests/                         tests
```

Si tu ajoutes un fichier JavaScript, ajoute-le à la liste `ASSETS` de `sw.js` (un test le vérifie).

**Clé de signature** : toutes les versions doivent être signées avec la même clé pour s'installer par-dessus la précédente. La clé n'est pas dans le dépôt : en local, `android/app/maforme.keystore` + `android/keystore.properties` (`storePassword=…`) ; sur GitHub, les secrets `MAFORME_KEYSTORE_B64` (fichier en base64) et `MAFORME_KEYSTORE_PASSWORD`. Sans clé, l'APK est signé avec une clé de test. **Garde une copie de la clé** : si elle est perdue, il faudra désinstaller l'app (après une sauvegarde) pour installer une nouvelle version.

## Avertissement

Ma Forme est une aide au suivi personnel. Les calories et les dépenses affichées sont des estimations. L'app ne remplace pas l'avis d'un professionnel de santé : en cas de problème de santé, de perte de poids importante, ou pour arrêter le tabac ou l'alcool, parles-en à ton médecin.

- Tabac Info Service : **39 89** (accompagnement gratuit par des tabacologues)
- Alcool Info Service : **0 980 980 930** (anonyme, non surtaxé)
