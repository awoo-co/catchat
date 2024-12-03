const CACHE_NAME = 'catchat-cache-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/src/offline-image.jpg', // Example offline image
];

// Install service worker and cache files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// Activate service worker and clear old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch from cache first, then network if not found
self.addEventListener('fetch', (event) => {
  console.log('Fetching:', event.request.url);
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('Returning cached response for:', event.request.url);
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          console.log('Caching new response for:', event.request.url);
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
