// Mreža prvo, cache kao rezerva (aplikacija uvijek dobije zadnju verziju kad ima interneta)
const CACHE = 'polaris-v19';
const SHELL = ['./', 'index.html', 'style.css?v=19', 'app.js?v=19', 'supabase.js?v=2.45.4', 'manifest.webmanifest', 'icon-192.png', 'polaris-logo.png', 'nerotta.svg'];
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

// Push obavijesti (Web Push): prikaz i klik
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Polaris', {
    body: d.body || '', icon: 'icon-192.png', tag: d.tag || undefined, data: { url: d.url || '#/' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const hash = (e.notification.data && e.notification.data.url) || '#/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
    const c = list.find((x) => x.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({ type: 'go', url: hash }); if ('focus' in c) await c.focus(); return; }
    return self.clients.openWindow(new URL(hash, self.registration.scope).href);
  }));
});
