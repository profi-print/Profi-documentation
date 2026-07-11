const CACHE_NAME = 'profitprint-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/otpCex.html',
  '/texKarta.html',
  '/css/theme.css',
  '/css/style.css',
  '/js/storage.js',
  // добавьте другие важные файлы (JS, CSS, шрифты)
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});