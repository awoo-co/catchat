// service-worker.js

const CACHE_NAME = "catchat-cache-v1";
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/service-worker.js',
  'https://cdn.scaledrone.com/scaledrone.min.js', // Include external assets like ScaleDrone (or use local copy)
];

// Install event - caching necessary assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching files');
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event - check cache first, then network if offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Return cached file if available
      }
      return fetch(event.request); // Otherwise fetch from network
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
