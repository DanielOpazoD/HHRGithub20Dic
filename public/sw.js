/**
 * Service Worker for HHR Hospital Tracker
 * Uses Workbox from CDN (importScripts pattern)
 */

// Import Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// Check if Workbox loaded
if (workbox) {
    console.log('Workbox loaded successfully');

    // Version for cache busting
    const CACHE_VERSION = 'v2.0.0';
    const OFFLINE_PAGE = '/offline.html';

    // Use strategies from workbox
    const { StaleWhileRevalidate, CacheFirst, NetworkFirst, NetworkOnly } = workbox.strategies;
    const { ExpirationPlugin } = workbox.expiration;
    const { CacheableResponsePlugin } = workbox.cacheableResponse;
    const { BackgroundSyncPlugin } = workbox.backgroundSync;
    const { registerRoute, NavigationRoute, setCatchHandler } = workbox.routing;
    const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;

    // Precache offline page
    precacheAndRoute([
        { url: OFFLINE_PAGE, revision: CACHE_VERSION },
        { url: '/', revision: CACHE_VERSION },
    ]);

    // Cleanup old caches
    cleanupOutdatedCaches();

    // ============================================
    // OFFLINE FALLBACK
    // ============================================

    // Cache offline page on install
    self.addEventListener('install', (event) => {
        event.waitUntil(
            caches.open(`offline-${CACHE_VERSION}`).then((cache) => {
                return cache.addAll([
                    OFFLINE_PAGE,
                    '/',
                ]);
            })
        );
        self.skipWaiting();
    });

    // Activate and claim clients immediately
    self.addEventListener('activate', (event) => {
        event.waitUntil(
            Promise.all([
                self.clients.claim(),
                // Delete old caches
                caches.keys().then((cacheNames) => {
                    return Promise.all(
                        cacheNames
                            .filter((name) => !name.includes(CACHE_VERSION))
                            .map((name) => caches.delete(name))
                    );
                }),
            ])
        );
    });

    // ============================================
    // CACHING STRATEGIES
    // ============================================

    // Static assets (JS, CSS) - Stale While Revalidate
    registerRoute(
        ({ request }) => request.destination === 'script' || request.destination === 'style',
        new StaleWhileRevalidate({
            cacheName: `static-${CACHE_VERSION}`,
            plugins: [
                new CacheableResponsePlugin({ statuses: [0, 200] }),
                new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 24 * 60 * 60 }),
            ],
        })
    );

    // Google Fonts - Cache First
    registerRoute(
        ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
        new CacheFirst({
            cacheName: `fonts-${CACHE_VERSION}`,
            plugins: [
                new CacheableResponsePlugin({ statuses: [0, 200] }),
                new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
            ],
        })
    );

    // Images - Cache First
    registerRoute(
        ({ request }) => request.destination === 'image',
        new CacheFirst({
            cacheName: `images-${CACHE_VERSION}`,
            plugins: [
                new CacheableResponsePlugin({ statuses: [0, 200] }),
                new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
            ],
        })
    );

    // Firebase/Firestore - Network First with cache fallback
    registerRoute(
        ({ url }) => url.origin.includes('firebaseio.com') || url.origin.includes('googleapis.com'),
        new NetworkFirst({
            cacheName: `firebase-${CACHE_VERSION}`,
            networkTimeoutSeconds: 10,
            plugins: [
                new CacheableResponsePlugin({ statuses: [0, 200] }),
                new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
            ],
        })
    );

    // API calls with background sync for POST
    const bgSyncPlugin = new BackgroundSyncPlugin('patientSyncQueue', {
        maxRetentionTime: 24 * 60, // Retry for up to 24 hours
    });

    registerRoute(
        ({ url }) => url.pathname.startsWith('/api/') && url.method === 'POST',
        new NetworkOnly({
            plugins: [bgSyncPlugin],
        }),
        'POST'
    );

    // API GET requests - StaleWhileRevalidate
    registerRoute(
        ({ url }) => url.pathname.startsWith('/api/'),
        new StaleWhileRevalidate({
            cacheName: `api-${CACHE_VERSION}`,
            plugins: [
                new CacheableResponsePlugin({ statuses: [0, 200] }),
                new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }),
            ],
        })
    );

    // Pages/Navigation - Network First
    registerRoute(
        ({ request }) => request.mode === 'navigate',
        new NetworkFirst({
            cacheName: `pages-${CACHE_VERSION}`,
            networkTimeoutSeconds: 5,
            plugins: [
                new CacheableResponsePlugin({ statuses: [0, 200] }),
                new ExpirationPlugin({ maxEntries: 25 }),
            ],
        })
    );

    // Fallback for navigation failures
    setCatchHandler(async ({ event }) => {
        if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_PAGE);
        }
        return Response.error();
    });

    // ============================================
    // MESSAGE HANDLERS
    // ============================================

    self.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
            self.skipWaiting();
        }
        if (event.data && event.data.type === 'CACHE_URLS') {
            const urlsToCache = event.data.payload;
            caches.open(`dynamic-${CACHE_VERSION}`).then((cache) => {
                cache.addAll(urlsToCache);
            });
        }
        if (event.data && event.data.type === 'CLEAR_CACHE') {
            caches.keys().then((cacheNames) => {
                cacheNames.forEach((cacheName) => caches.delete(cacheName));
            });
        }
    });

} else {
    console.error('Workbox failed to load');
}
