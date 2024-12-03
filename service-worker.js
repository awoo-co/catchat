self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('catchat-cache').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/style.css',
        '/script.js',
        '/manifest.json',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        // Add other files necessary for offline functionality
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
