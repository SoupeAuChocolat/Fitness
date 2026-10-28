// Prépare le dossier www/ utilisé par l'app Android (Capacitor).
// L'app web reste à la racine du dépôt ; ce script en copie les fichiers
// et ajoute le moteur Capacitor (capacitor.js) dans la page.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');
const ENTRIES = ['index.html', 'manifest.webmanifest', 'css', 'js', 'icons', 'img'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const entry of ENTRIES) {
  if (existsSync(join(root, entry))) cpSync(join(root, entry), join(out, entry), { recursive: true });
}
cpSync(join(root, 'node_modules/@capacitor/core/dist/capacitor.js'), join(out, 'capacitor.js'));

const html = readFileSync(join(out, 'index.html'), 'utf8');
const tag = '<script type="module" src="js/app.js"></script>';
if (!html.includes(tag)) throw new Error('balise du script principal introuvable dans index.html');
writeFileSync(join(out, 'index.html'), html.replace(tag, `<script src="capacitor.js"></script>\n  ${tag}`));

console.log('www/ prêt');
