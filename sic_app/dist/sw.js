// Service Worker for offline support
// Version 1.0.0

const CACHE_NAME = 'sic-app-v1.0.0'
const STATIC_CACHE = 'sic-app-static-v1.0.0'
const DYNAMIC_CACHE = 'sic-app-dynamic-v1.0.0'

// Files to cache for offline support
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add your static assets here
]

// API endpoints to cache
const CACHEABLE_API_PATTERNS = [
  /\/api\/clients/,
  /\/api\/invoices/,
  /\/api\/dashboard/,
]

// Network-first strategy for API calls
const NETWORK_FIRST_PATTERNS = [
  /\/api\/auth/,
  /\/api\/.*\/(create|update|delete)/,
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Failed to install service worker:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE &&
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName.startsWith('sic-app-')
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle offline/online requests
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return
  }

  // Handle different types of requests
  if (request.url.includes('/api/')) {
    // API requests
    event.respondWith(handleApiRequest(request))
  } else if (request.destination === 'document') {
    // Navigation requests
    event.respondWith(handleNavigationRequest(request))
  } else {
    // Static assets (JS, CSS, images, etc.)
    event.respondWith(handleStaticRequest(request))
  }
})

// Handle API requests with appropriate caching strategy
async function handleApiRequest(request) {
  const url = request.url

  // Network-first for critical operations
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url))) {
    return networkFirstStrategy(request, DYNAMIC_CACHE)
  }

  // Cache-first for read operations that can be stale
  if (CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url))) {
    return cacheFirstStrategy(request, DYNAMIC_CACHE)
  }

  // Default: network only for uncached API calls
  try {
    return await fetch(request)
  } catch (error) {
    console.warn('[SW] API request failed:', url)
    // Return a custom offline response for API calls
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This feature requires an internet connection'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

// Handle navigation requests (SPA routing)
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const response = await fetch(request)

    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    console.log('[SW] Network failed for navigation, serving from cache')

    // Fallback to cached version
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Fallback to index.html for SPA routing
    const indexResponse = await caches.match('/index.html')
    if (indexResponse) {
      return indexResponse
    }

    // Last resort: offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - SIC App</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; text-align: center; padding: 2rem; }
            .offline { color: #666; }
          </style>
        </head>
        <body>
          <div class="offline">
            <h1>You're offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    )
  }
}

// Handle static assets
async function handleStaticRequest(request) {
  return cacheFirstStrategy(request, STATIC_CACHE)
}

// Cache-first strategy: check cache first, fallback to network
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    console.log('[SW] Serving from cache:', request.url)
    return cachedResponse
  }

  try {
    console.log('[SW] Fetching from network:', request.url)
    const response = await fetch(request)

    if (response.status === 200) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    console.warn('[SW] Network request failed:', request.url)
    throw error
  }
}

// Network-first strategy: try network first, fallback to cache
async function networkFirstStrategy(request, cacheName) {
  try {
    console.log('[SW] Fetching from network (network-first):', request.url)
    const response = await fetch(request)

    if (response.status === 200) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)

    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('[SW] Serving stale content from cache:', request.url)
      return cachedResponse
    }

    throw error
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered')
    event.waitUntil(syncFailedRequests())
  }
})

// Sync failed requests when back online
async function syncFailedRequests() {
  // Implementation would depend on your app's needs
  // Could replay failed API calls stored in IndexedDB
  console.log('[SW] Syncing failed requests...')
}

// Handle push notifications (if needed)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()

    const options = {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.tag || 'default',
      data: data.data || {},
      actions: data.actions || [],
    }

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})

console.log('[SW] Service worker loaded successfully')