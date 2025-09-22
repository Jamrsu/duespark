// Service Worker registration and management

export interface ServiceWorkerOptions {
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onOffline?: () => void
  onOnline?: () => void
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onError?: (error: Error) => void
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private options: ServiceWorkerOptions = {}
  private refreshing = false

  /**
   * Register the service worker
   */
  public async register(options: ServiceWorkerOptions = {}): Promise<void> {
    this.options = options

    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported')
      return
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Service Worker registration skipped in development')
      return
    }

    const hadController = !!navigator.serviceWorker.controller

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('Service Worker registered successfully')

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdate()
      })

      // Listen for controller changes (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed')
        if (!hadController) {
          // First install, rely on normal navigation flow
          return
        }
        if (this.refreshing) {
          return
        }
        this.refreshing = true
        if (this.options.onUpdate && this.registration) {
          this.options.onUpdate(this.registration)
        }
        window.location.reload()
      })

      // Immediately activate an already waiting worker
      if (this.registration.waiting) {
        this.skipWaiting()
      }

      // Setup network status listeners
      this.setupNetworkListeners()

      if (this.options.onSuccess) {
        this.options.onSuccess(this.registration)
      }

    } catch (error) {
      console.error('Service Worker registration failed:', error)
      if (this.options.onError) {
        this.options.onError(error as Error)
      }
    }
  }

  /**
   * Unregister the service worker
   */
  public async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      const result = await this.registration.unregister()
      console.log('Service Worker unregistered:', result)
      return result
    } catch (error) {
      console.error('Service Worker unregistration failed:', error)
      return false
    }
  }

  /**
   * Check for service worker updates
   */
  public async checkForUpdates(): Promise<void> {
    if (!this.registration) {
      return
    }

    try {
      await this.registration.update()
      console.log('Service Worker update check completed')
    } catch (error) {
      console.error('Service Worker update check failed:', error)
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  public async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) {
      return
    }

    // Send message to waiting SW to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  /**
   * Get cache usage information
   */
  public async getCacheInfo(): Promise<{ used: number; quota: number; usage: string }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        const used = estimate.usage || 0
        const quota = estimate.quota || 0
        const usage = `${(used / 1024 / 1024).toFixed(1)} MB / ${(quota / 1024 / 1024).toFixed(1)} MB`

        return { used, quota, usage }
      } catch (error) {
        console.warn('Could not estimate storage usage:', error)
      }
    }

    return { used: 0, quota: 0, usage: 'Unknown' }
  }

  /**
   * Clear all caches
   */
  public async clearCaches(): Promise<void> {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
        console.log('All caches cleared')
      } catch (error) {
        console.error('Failed to clear caches:', error)
      }
    }
  }

  /**
   * Get service worker status
   */
  public getStatus(): {
    supported: boolean
    registered: boolean
    active: boolean
    waiting: boolean
    installing: boolean
  } {
    const supported = 'serviceWorker' in navigator
    const registered = !!this.registration
    const active = !!(this.registration?.active)
    const waiting = !!(this.registration?.waiting)
    const installing = !!(this.registration?.installing)

    return {
      supported,
      registered,
      active,
      waiting,
      installing
    }
  }

  /**
   * Handle service worker updates
   */
  private handleUpdate(): void {
    if (!this.registration) return

    const newWorker = this.registration.installing

    if (!newWorker) return

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('New service worker available')
        this.skipWaiting()
      }
    })
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('App is online')
      if (this.options.onOnline) {
        this.options.onOnline()
      }
    })

    window.addEventListener('offline', () => {
      console.log('App is offline')
      if (this.options.onOffline) {
        this.options.onOffline()
      }
    })
  }
}

// Global service worker manager instance
export const serviceWorkerManager = new ServiceWorkerManager()

// Utility functions
export const isOnline = (): boolean => navigator.onLine
export const isOffline = (): boolean => !navigator.onLine

/**
 * Register service worker with default options
 */
export async function registerSW(options: ServiceWorkerOptions = {}): Promise<void> {
  await serviceWorkerManager.register(options)
}

/**
 * Hook for React components
 */
export function useServiceWorker(options: ServiceWorkerOptions = {}) {
  const [isSupported] = React.useState(() => 'serviceWorker' in navigator)
  const [isRegistered, setIsRegistered] = React.useState(false)
  const [isOnlineState, setIsOnlineState] = React.useState(() => navigator.onLine)
  const [updateAvailable, setUpdateAvailable] = React.useState(false)
  const [cacheInfo, setCacheInfo] = React.useState({ used: 0, quota: 0, usage: 'Unknown' })

  React.useEffect(() => {
    const registerWithCallbacks = async () => {
      await serviceWorkerManager.register({
        ...options,
        onSuccess: (registration) => {
          setIsRegistered(true)
          options.onSuccess?.(registration)
        },
        onUpdate: (registration) => {
          setUpdateAvailable(true)
          options.onUpdate?.(registration)
        },
        onOnline: () => {
          setIsOnlineState(true)
          options.onOnline?.()
        },
        onOffline: () => {
          setIsOnlineState(false)
          options.onOffline?.()
        },
        onError: options.onError
      })
    }

    registerWithCallbacks()

    // Get cache info
    serviceWorkerManager.getCacheInfo().then(setCacheInfo)
  }, [])

  const updateServiceWorker = React.useCallback(async () => {
    await serviceWorkerManager.skipWaiting()
    setUpdateAvailable(false)
    window.location.reload()
  }, [])

  const clearCache = React.useCallback(async () => {
    await serviceWorkerManager.clearCaches()
    window.location.reload()
  }, [])

  return {
    isSupported,
    isRegistered,
    isOnline: isOnlineState,
    isOffline: !isOnlineState,
    updateAvailable,
    cacheInfo,
    updateServiceWorker,
    clearCache,
    checkForUpdates: serviceWorkerManager.checkForUpdates,
    unregister: serviceWorkerManager.unregister
  }
}

// Import React for the hook
import React from 'react'
