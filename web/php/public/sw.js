// سرویس‌ورکر سادهٔ PWA — کش پوستهٔ اپ
const CACHE = 'taxi-app-v1';
const SHELL = ['/app', '/manifest.json', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // درخواست‌های API هرگز کش نمی‌شوند
  if (url.pathname.startsWith('/api')) return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (e.request.method === 'GET' && resp.ok && url.origin === location.origin) {
        const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return resp;
    }).catch(() => caches.match('/app')))
  );
});
