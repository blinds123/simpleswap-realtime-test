// Service Worker for PWA functionality
// Handles offline caching, background sync, and performance optimization

const CACHE_NAME = 'simpleswap-v1';
const DYNAMIC_CACHE = 'simpleswap-dynamic-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/mobile.css',
    '/js/config.bundle.min.js',
    '/js/security.bundle.min.js',
    '/js/performance.bundle.min.js',
    '/js/api.bundle.min.js',
    '/js/monitoring.bundle.min.js',
    '/js/app.bundle.min.js',
    '/offline.html'
];

// API endpoints to handle differently
const API_ENDPOINTS = [
    'api.simpleswap.io',
    'exchange.mercuryo.io',
    'ipapi.co'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Caching static assets');
            return cache.addAll(STATIC_ASSETS).catch((error) => {
                console.error('[ServiceWorker] Failed to cache:', error);
                // Continue installation even if some assets fail
                return Promise.resolve();
            });
        })
    );
    
    // Force the new service worker to activate
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => {
                        return cacheName.startsWith('simpleswap-') && 
                               cacheName !== CACHE_NAME &&
                               cacheName !== DYNAMIC_CACHE;
                    })
                    .map((cacheName) => {
                        console.log('[ServiceWorker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        })
    );
    
    // Take control of all clients
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle API requests differently
    if (API_ENDPOINTS.some(endpoint => url.hostname.includes(endpoint))) {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // For navigation requests, try network first
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // For everything else, use cache first
    event.respondWith(cacheFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Update cache in background
            fetchAndCache(request, CACHE_NAME);
            return cachedResponse;
        }
        
        return await fetchAndCache(request, DYNAMIC_CACHE);
    } catch (error) {
        console.error('[ServiceWorker] Fetch failed:', error);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            return cache.match(OFFLINE_URL);
        }
        
        throw error;
    }
}

// Network-first strategy
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            return cache.match(OFFLINE_URL);
        }
        
        throw error;
    }
}

// Fetch and cache helper
async function fetchAndCache(request, cacheName) {
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response.ok && response.status === 200) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
    }
    
    return response;
}

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
                caches.delete(cacheName);
            });
        });
        
        event.ports[0].postMessage({ success: true });
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        const urls = event.data.urls || [];
        caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.addAll(urls);
        });
    }
});

// Background sync for failed requests
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-analytics') {
        event.waitUntil(syncAnalytics());
    }
});

// Sync analytics data when connection is restored
async function syncAnalytics() {
    try {
        // Get queued analytics from IndexedDB or similar
        const queuedData = await getQueuedAnalytics();
        
        if (queuedData && queuedData.length > 0) {
            // Send to analytics endpoint
            await fetch('/api/analytics/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(queuedData)
            });
            
            // Clear queue on success
            await clearAnalyticsQueue();
        }
    } catch (error) {
        console.error('[ServiceWorker] Analytics sync failed:', error);
        throw error; // Retry later
    }
}

// Placeholder functions for analytics queue
async function getQueuedAnalytics() {
    // Implementation would use IndexedDB
    return [];
}

async function clearAnalyticsQueue() {
    // Implementation would clear IndexedDB
}

// Push notification support
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'New notification',
        icon: '/images/icon-192x192.png',
        badge: '/images/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: data.data || {},
        actions: data.actions || [],
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'SimpleSwap', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const urlToOpen = event.notification.data.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window open
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // Open new window if needed
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});