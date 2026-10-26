// خطیار PWA service worker — cache is versioned and HTML/JS/CSS/JSON are network-first.
const CACHE = 'khatyar-web-20261026.features2';
const SHELL = ['/app?sw=20261026.features2', '/manifest.json', '/icon-192.png', '/icon-512.png', '/assets/android-navigation.js?v=20261025.2', '/assets/android-app.css?v=20261026.2', '/assets/android-app-ui.js?v=20261025.2', '/assets/web-document-editor.js?v=20261026.2', '/assets/web-payroll-image.js?v=20261026.2', '/assets/payroll-access-layout.json', '/assets/web-features-core.js?v=20261026.2', '/assets/web-features-personal.js?v=20261026.2', '/assets/web-features-field.js?v=20261026.2', '/assets/web-features-services.js?v=20261026.2', '/assets/web-features-company.js?v=20261026.2', '/assets/web-features-device.js?v=20261026.2', '/assets/MaterialCommunityIcons-15.0.2.ttf'];
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
      // خطیار: قبلاً response.clone() داخل یک callback غیرهمزمان (بعد از resolve شدن caches.open) صدا زده می‌شد.
      // clone() باید همان لحظه و همزمان، پیش از هر مصرفی از بدنهٔ پاسخ، انجام شود؛ وگرنه با خطای
      // «Response body is already used» مواجه می‌شد چون تا آن لحظه بدنهٔ پاسخ اصلی مصرف شده بود.
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(c => c.put(event.request, copy)); }
      return response;
    }).catch(() => caches.match(event.request).then(r => r || caches.match('/app?sw=20261026.features2'))));
    return;
  }
  if (IMMUTABLE_EXT.test(url.pathname)) {
    event.respondWith(caches.match(event.request).then(r => r || fetch(event.request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(c => c.put(event.request, copy)); }
      return response;
    })));
  }
});
