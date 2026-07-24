const CACHE = 'capycorn-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './capybara-snackdown.html',
  './sunny-savannah.html',
  './whisker-rush.html',
  './coin-cat-arena.html',
  './capybara-jump.html',
  './capy-vs-unicorn.html',
  './capy-salon.html',
  './assets/branding/capybara-snackdown-logo.png',
  './assets/branding/icon-180.png',
  './assets/branding/icon-192.png',
  './assets/branding/icon-512.png',
  './assets/branding/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
