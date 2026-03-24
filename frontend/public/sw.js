const CACHE_NAME = 'itupoker-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: serve from cache for static assets, network for API/socket
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Always go to network for API calls and socket.io
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io')) {
        return;
    }

    // Cache-first strategy for static files
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).then((response) => {
                // Cache successful GET responses for static assets
                if (event.request.method === 'GET' && response.status === 200) {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
                }
                return response;
            });
        }).catch(() => {
            // Offline fallback - return the app shell
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
            }
        })
    );
});
