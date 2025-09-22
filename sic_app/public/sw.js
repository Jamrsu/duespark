// DueSpark Service Worker - Advanced PWA Capabilities
// Version 1.1.0 - Phase 2 Mobile-First Enhancements

const CACHE_PREFIX = 'duespark'
const BUILD_VERSION = (() => {
  try {
    if (self && self.__DUESPARK_BUILD_ID) return self.__DUESPARK_BUILD_ID
    const url = new URL(self.location.href)
    const searchVersion = url.searchParams.get('v')
    if (searchVersion) return searchVersion
    return `${url.pathname.replace(/\W+/g, '-')}-${Date.now()}`
  } catch (error) {
    return `fallback-${Date.now()}`
  }
})()

const STATIC_CACHE = `${CACHE_PREFIX}-static-${BUILD_VERSION}`
const DYNAMIC_CACHE = `${CACHE_PREFIX}-dynamic-${BUILD_VERSION}`
const API_CACHE = `${CACHE_PREFIX}-api-${BUILD_VERSION}`
const ACTIVE_CACHES = new Set([STATIC_CACHE, DYNAMIC_CACHE, API_CACHE])

// Files to cache for offline support
const STATIC_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/offline.html',
  // Critical API data for offline functionality
]

// API endpoints to cache with stale-while-revalidate
const CACHEABLE_API_PATTERNS = [
  /\/api\/analytics\/summary/,
  /\/api\/invoices\?limit=5/,
  /\/api\/clients/,
  /\/api\/dashboard/,
]

// Network-first strategy for critical operations
const NETWORK_FIRST_PATTERNS = [
  /\/api\/auth/,
  /\/api\/.*\/(create|update|delete)/,
  /\/api\/reminders\/send/,
  /\/api\/payments/,
]

// Background sync patterns
const SYNC_PATTERNS = [
  /\/api\/invoices\/\d+\/remind/,
  /\/api\/analytics\/track/,
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[DueSpark SW] Installing service worker...', BUILD_VERSION)

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(async (cache) => {
        console.log('[DueSpark SW] Caching static assets')
        await Promise.all(
          STATIC_ASSETS.map(async (asset) => {
            try {
              await cache.add(asset)
            } catch (error) {
              console.warn('[DueSpark SW] Skipping static asset (failed to cache):', asset, error)
            }
          })
        )
      }),
      // Pre-cache critical API data if user is authenticated
      preCacheCriticalData()
    ])
      .then(() => {
        console.log('[DueSpark SW] Service worker installed successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[DueSpark SW] Failed to install service worker:', error)
      })
  )
})

// Pre-cache critical data for better offline experience
async function preCacheCriticalData() {
  try {
    const cache = await caches.open(API_CACHE)
    // Pre-cache dashboard data if available
    const dashboardUrl = '/api/analytics/summary'
    const response = await fetch(dashboardUrl)
    if (response.ok) {
      await cache.put(dashboardUrl, response)
    }
  } catch (error) {
    console.warn('[DueSpark SW] Pre-caching failed:', error)
  }
}

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...', BUILD_VERSION)

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              if (ACTIVE_CACHES.has(cacheName)) {
                return false
              }

              // Remove legacy caches prefixed with duespark- or sic-app-
              return cacheName.startsWith(`${CACHE_PREFIX}-`) || cacheName.startsWith('sic-app-')
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

self.addEventListener('message', (event) => {
  if (!event.data) return

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data.type === 'CLEAR_DUESPARK_CACHES') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith(`${CACHE_PREFIX}-`) || cacheName.startsWith('sic-app-'))
            .map((cacheName) => caches.delete(cacheName))
        )
      })
    )
  }
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
    const response = await fetch(request)

    if (response.ok) {
      return response
    }

    if (response.status === 404) {
      console.warn('[SW] Navigation returned 404, falling back to SPA index:', request.url)
      return await serveSpaFallback()
    }

    return response
  } catch (error) {
    console.log('[SW] Network failed for navigation, serving fallback', error)
    return await serveSpaFallback()
  }
}

async function serveSpaFallback() {
  // Prefer cached index.html
  const cache = await caches.open(STATIC_CACHE)
  const cachedIndex = await cache.match('/index.html')
  if (cachedIndex) {
    return cachedIndex
  }

  const cachedGlobalIndex = await caches.match('/index.html')
  if (cachedGlobalIndex) {
    return cachedGlobalIndex
  }

  try {
    const response = await fetch('/index.html')
    if (response.ok) {
      cache.put('/index.html', response.clone())
      return response
    }
  } catch (error) {
    console.warn('[SW] Failed to fetch SPA fallback index:', error)
  }

  // Last resort: offline page
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Offline - DueSpark</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui; text-align: center; padding: 2rem; }
          .offline { color: #666; }
        </style>
      </head>
      <body>
        <div class="offline">
          <h1>📱 DueSpark Offline</h1>
          <p>Don't worry! You can still view your cached invoices and analytics.</p>
          <div style="margin: 2rem 0;">
            <a href="/app/dashboard" style="display: inline-block; background: #0ea5e9; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 0.5rem; margin: 0.5rem;">View Dashboard</a>
            <a href="/app/invoices" style="display: inline-block; background: #10b981; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 0.5rem; margin: 0.5rem;">View Invoices</a>
          </div>
          <button onclick="window.location.reload()" style="background: #6b7280; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer;">Try Reconnecting</button>
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

// Handle static assets
async function handleStaticRequest(request) {
  return cacheFirstStrategy(request, STATIC_CACHE)
}

// Cache strategy that prefers fresh network responses and updates cache.
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)

  try {
    console.log('[SW] Fetching (network-preferred):', request.url)
    const response = await fetch(request)

    if (response && response.status === 200) {
      cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    console.warn('[SW] Network request failed, attempting cache:', request.url)
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      console.log('[SW] Returning cached fallback:', request.url)
      return cachedResponse
    }
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
  console.log('[DueSpark SW] Background sync triggered:', event.tag)

  if (event.tag === 'duespark-reminders') {
    event.waitUntil(syncPendingReminders())
  } else if (event.tag === 'duespark-analytics') {
    event.waitUntil(syncAnalyticsEvents())
  } else if (event.tag === 'duespark-invoices') {
    event.waitUntil(syncInvoiceUpdates())
  }
})

// Sync pending reminder requests
async function syncPendingReminders() {
  console.log('[DueSpark SW] Syncing pending reminders...')
  const offlineDb = await openOfflineDB()
  const pendingReminders = await getPendingRequests(offlineDb, 'reminders')

  for (const reminder of pendingReminders) {
    try {
      await fetch(reminder.url, {
        method: reminder.method,
        headers: reminder.headers,
        body: reminder.body
      })
      await removePendingRequest(offlineDb, 'reminders', reminder.id)
    } catch (error) {
      console.warn('[DueSpark SW] Failed to sync reminder:', error)
    }
  }
}

// Sync analytics events
async function syncAnalyticsEvents() {
  console.log('[DueSpark SW] Syncing analytics events...')
  // Implementation for analytics sync
}

// Sync invoice updates
async function syncInvoiceUpdates() {
  console.log('[DueSpark SW] Syncing invoice updates...')
  // Implementation for invoice sync
}

// Handle push notifications (if needed)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()

    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: data.tag || 'duespark-notification',
      data: data.data || {},
      vibrate: [200, 100, 200], // Mobile vibration pattern
      requireInteraction: data.urgent || false,
      actions: data.actions || [
        {
          action: 'view',
          title: '👁️ View',
          icon: '/icon-192x192.png'
        },
        {
          action: 'remind',
          title: '📧 Send Reminder',
          icon: '/icon-192x192.png'
        }
      ],
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

// Add offline database support
async function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DueSparkOffline', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Store for pending requests
      if (!db.objectStoreNames.contains('pendingRequests')) {
        const store = db.createObjectStore('pendingRequests', { keyPath: 'id', autoIncrement: true })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }

      // Store for offline actions
      if (!db.objectStoreNames.contains('offlineActions')) {
        const store = db.createObjectStore('offlineActions', { keyPath: 'id', autoIncrement: true })
        store.createIndex('action', 'action', { unique: false })
      }
    }
  })
}

async function getPendingRequests(db, type) {
  const transaction = db.transaction(['pendingRequests'], 'readonly')
  const store = transaction.objectStore('pendingRequests')
  const index = store.index('type')

  return new Promise((resolve, reject) => {
    const request = index.getAll(type)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function removePendingRequest(db, type, id) {
  const transaction = db.transaction(['pendingRequests'], 'readwrite')
  const store = transaction.objectStore('pendingRequests')

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Message handling for app communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting()
        break
      case 'QUEUE_REMINDER':
        queueOfflineAction('reminder', event.data.payload)
        break
      case 'QUEUE_ANALYTICS':
        queueOfflineAction('analytics', event.data.payload)
        break
    }
  }
})

async function queueOfflineAction(action, payload) {
  try {
    const db = await openOfflineDB()
    const transaction = db.transaction(['offlineActions'], 'readwrite')
    const store = transaction.objectStore('offlineActions')

    await store.add({
      action,
      payload,
      timestamp: Date.now()
    })

    // Register background sync
    await self.registration.sync.register(`duespark-${action}s`)
  } catch (error) {
    console.error('[DueSpark SW] Failed to queue offline action:', error)
  }
}

console.log('[DueSpark SW] Service worker v1.1.0 loaded successfully with enhanced PWA features')
