const CACHE_NAME = 'catchat-v1';
// Add all your folder paths here
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/folder1/page1.html',
  '/folder2/page2.html',
  '/resources/icons/chat_112.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});