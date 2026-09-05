// خطیار PWA service worker — cache is versioned and HTML/JS/CSS/JSON are network-first.
const CACHE = 'khatyar-web-20260905.12';
const SHELL = ['/app?sw=20260905.12', '/manifest.json', '/icon-192.png', '/icon-512.png'];
const IMMUTABLE_EXT = /\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot|mp3|wav|ogg|mp4|webm)$/i;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return;
  const isDocument = event.request.mode === 'navigate' || url.pathname === '/app' || url.pathname.endsWith('.html');
  const isCode = /\.(?:js|mjs|css|json)$/i.test(url.pathname);
  if (isDocument || isCode) {
    event.respondWith(fetch(event.request, {cache:'no-store'}).then(response => {
      if (response.ok && isDocument) caches.open(CACHE).then(c => c.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request).then(r => r || caches.match('/app?sw=20260905.12'))));
    return;
  }
  if (IMMUTABLE_EXT.test(url.pathname)) {
    event.respondWith(caches.match(event.request).then(r => r || fetch(event.request).then(response => {
      if (response.ok) caches.open(CACHE).then(c => c.put(event.request, response.clone()));
      return response;
    })));
  }
});
