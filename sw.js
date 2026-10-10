// Mreža prvo, cache kao rezerva (aplikacija uvijek dobije zadnju verziju kad ima interneta)
const CACHE = 'polaris-v3';
const SHELL = ['./', 'index.html', 'style.css?v=3', 'app.js?v=3', 'supabase.js?v=2.45.4', 'manifest.webmanifest', 'icon-192.png', 'polaris-logo.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
