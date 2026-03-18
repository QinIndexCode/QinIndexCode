const CACHE_NAME = 'mygitblog-v2';
const STATIC_CACHE_NAME = 'mygitblog-static-v2';
const DYNAMIC_CACHE_NAME = 'mygitblog-dynamic-v2';
const IMAGE_CACHE_NAME = 'mygitblog-images-v2';

const STATIC_ASSETS = [
    './',
    './index.html',
    './home.html',
    './tech.html',
    './projects.html',
    './blogs.html',
    './about.html',
    './tools.html',
    './donate.html',
    './css/main.css',
    './css/css2.css',
    './css/atom-one-dark.min.css',
    './js/smooth-scroll.js',
    './js/redirect-if-standalone.js'
];

const CRITICAL_ASSETS = [
    './',
    './index.html',
    './css/main.css',
    './css/css2.css'
];

const IMAGE_ASSETS = [
    './assets/images/avatar.jpg',
    './assets/images/avatar-alt.jpg'
];

const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE_NAME).then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            caches.open(CACHE_NAME).then((cache) => {
                console.log('[SW] Caching critical assets');
                return cache.addAll(CRITICAL_ASSETS);
            }),
            caches.open(IMAGE_CACHE_NAME).then((cache) => {
                console.log('[SW] Caching image assets');
                return cache.addAll(IMAGE_ASSETS);
            })
        ]).then(() => {
            console.log('[SW] All caches installed');
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (
                        cacheName !== CACHE_NAME &&
                        cacheName !== STATIC_CACHE_NAME &&
                        cacheName !== DYNAMIC_CACHE_NAME &&
                        cacheName !== IMAGE_CACHE_NAME
                    ) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Cache cleanup complete');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') {
        return;
    }

    if (!url.origin.includes(self.location.origin) && !url.hostname.includes('giscus.app')) {
        return;
    }

    if (url.hostname.includes('giscus.app')) {
        event.respondWith(networkFirst(request));
        return;
    }

    if (isImageRequest(request)) {
        event.respondWith(cacheFirstWithFallback(request, IMAGE_CACHE_NAME));
        return;
    }

    if (isStaticAsset(request)) {
        event.respondWith(staleWhileRevalidate(request, STATIC_CACHE_NAME));
        return;
    }

    if (isHTMLRequest(request)) {
        event.respondWith(networkFirstWithCache(request));
        return;
    }

    if (isAPIRequest(request)) {
        event.respondWith(networkFirst(request));
        return;
    }

    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE_NAME));
});

function isImageRequest(request) {
    return request.destination === 'image' ||
           /\.(jpg|jpeg|png|gif|webp|svg|ico|avif)$/i.test(request.url);
}

function isStaticAsset(request) {
    return request.destination === 'style' ||
           request.destination === 'script' ||
           request.destination === 'font' ||
           /\.(css|js|woff2?|ttf|eot)$/i.test(request.url);
}

function isHTMLRequest(request) {
    return request.destination === 'document' ||
           request.headers.get('accept')?.includes('text/html');
}

function isAPIRequest(request) {
    return request.url.includes('/api/') ||
           request.url.includes('github.com');
}

async function cacheFirst(request, cacheName = CACHE_NAME) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache first failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

async function cacheFirstWithFallback(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        return caches.match('./assets/images/avatar.jpg');
    }
}

async function networkFirst(request, cacheName = DYNAMIC_CACHE_NAME) {
    const cache = await caches.open(cacheName);
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        console.error('[SW] Network first failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirstWithCache(request, cacheName = CACHE_NAME) {
    const cache = await caches.open(cacheName);
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const offlineResponse = await cache.match('./index.html');
        if (offlineResponse) {
            return offlineResponse;
        }
        
        console.error('[SW] Network first with cache failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

async function staleWhileRevalidate(request, cacheName = DYNAMIC_CACHE_NAME) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch((error) => {
        console.error('[SW] Stale while revalidate fetch failed:', error);
        return cachedResponse;
    });
    
    return cachedResponse || fetchPromise;
}

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        const urls = event.data.urls;
        caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.addAll(urls);
        });
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
                caches.delete(cacheName);
            });
        });
    }
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-blogs') {
        console.log('[SW] Background sync: sync-blogs');
    }
});

console.log('[SW] Service Worker loaded - v2');
