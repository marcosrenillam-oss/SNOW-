// Service worker: la app funciona sin cobertura en la estación.
const CACHE = 'snowprofe-v5';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/main.js',
  './js/world.js',
  './js/content.js',
  './js/game.js',
  './js/fx.js',
  './vendor/lenis.mjs',
  './assets/env/studio-bg.jpg',
  './assets/env/mountain-bg.jpg',
  './assets/fabric/fabric_nor.jpg',
  './assets/fabric/fabric_rough.jpg',
  './assets/snow/snow_diff.jpg',
  './assets/snow/snow_nor_gl.jpg',
  './assets/snow/snow_rough.jpg',
  './vendor/three.module.min.js',
  './assets/drake-top.jpg',
  './assets/drake-base.jpg',
  './assets/snake-top.jpg',
  './assets/snake-base.jpg',
  './vendor/RoomEnvironment.js',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Red primero; si no hay red, caché.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (new URL(req.url).origin === location.origin || req.url.includes('fonts.g'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
  );
});
