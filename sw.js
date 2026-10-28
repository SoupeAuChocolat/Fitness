// Service worker : l'app fonctionne hors ligne.
// Stratégie « réseau d'abord » : en ligne, on récupère toujours la dernière
// version ; hors ligne (ou réseau trop lent), on sert la copie en cache.
const CACHE = 'ma-forme-v6';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'js/app.js',
  'js/badges.js',
  'js/barcode.js',
  'js/calc.js',
  'js/challenges.js',
  'js/charts.js',
  'js/dates.js',
  'js/exmedia.js',
  'js/foods.js',
  'js/habit-actions.js',
  'js/health.js',
  'js/native.js',
  'js/nutrition.js',
  'js/program.js',
  'js/reminders.js',
  'js/stick.js',
  'js/store.js',
  'js/ui.js',
  'js/data/ciqual.js',
  'js/data/exercises.js',
  'js/data/support.js',
  'js/data/foods.js',
  'js/data/habits.js',
  'js/data/quotes.js',
  'js/views/habit.js',
  'js/views/habits.js',
  'js/views/meals.js',
  'js/views/onboarding.js',
  'js/widget.js',
  'js/views/progress.js',
  'js/views/settings.js',
  'js/views/sport.js',
  'js/views/today.js',
  'js/views/workout.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
    const response = await Promise.race([fetch(request), timeout]);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') return cache.match('index.html');
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});
