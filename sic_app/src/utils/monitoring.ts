/**
 * Client-side monitoring and analytics utility
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: Date
  tags?: Record<string, string>
}

interface UserAction {
  action: string
  component: string
  timestamp: Date
  metadata?: Record<string, any>
}

interface ErrorMetric {
  type: string
  message: string
  stack?: string
  url: string
  userAgent: string
  timestamp: Date
  userId?: string
}

class MonitoringService {
  private performanceMetrics: PerformanceMetric[] = []
  private userActions: UserAction[] = []
  private errorMetrics: ErrorMetric[] = []
  private sessionId: string
  private isDevelopment: boolean
  private isTestEnvironment: boolean
  private isEnabled: boolean

  constructor() {
    this.sessionId = this.generateSessionId()
    this.isDevelopment = import.meta.env.DEV || false
    this.isTestEnvironment = this.detectTestEnvironment()
    this.isEnabled = !this.isTestEnvironment && typeof window !== 'undefined'

    if (this.isEnabled) {
      this.initializePerformanceObserver()
      this.initializeErrorTracking()
    }
  }

  private detectTestEnvironment(): boolean {
    // Check multiple indicators for test environment
    return (
      typeof process !== 'undefined' && process.env?.NODE_ENV === 'test' ||
      typeof window !== 'undefined' && (
        // @ts-ignore
        window.__vitest__ ||
        // @ts-ignore
        window.__jest__ ||
        window.location?.href?.includes('localhost') && navigator?.userAgent?.includes('HeadlessChrome')
      ) ||
      typeof global !== 'undefined' && (
        // @ts-ignore
        global.__vitest__ ||
        // @ts-ignore
        global.__jest__
      ) ||
      import.meta.env?.MODE === 'test' ||
      import.meta.env?.VITEST === true
    )
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private initializePerformanceObserver() {
    if (!this.isEnabled || this.isTestEnvironment) return

    if (!this.isDevelopment && typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.recordPerformanceMetric('page_load_time', entry.duration)
            } else if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
              this.recordPerformanceMetric('first_contentful_paint', entry.startTime)
            }
          }
        })

        observer.observe({ type: 'navigation', buffered: true })
        observer.observe({ type: 'paint', buffered: true })
      } catch (error) {
        console.warn('Performance monitoring unavailable:', error)
      }
    }
  }

  private initializeErrorTracking() {
    if (!this.isEnabled || this.isTestEnvironment || typeof window === 'undefined') return

    window.addEventListener('error', (event) => {
      this.recordError({
        type: 'javascript_error',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date()
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        type: 'unhandled_promise_rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date()
      })
    })
  }

  /**
   * Record a performance metric
   */
  recordPerformanceMetric(name: string, value: number, tags?: Record<string, string>) {
    if (!this.isEnabled || this.isTestEnvironment) return

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      tags
    }

    this.performanceMetrics.push(metric)

    // Log in development
    if (this.isDevelopment) {
      console.log(`[Performance] ${name}: ${value}ms`, tags)
    }

    // Keep only recent metrics (last 100)
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics.shift()
    }
  }

  /**
   * Record a user action for behavioral analytics
   */
  recordUserAction(action: string, component: string, metadata?: Record<string, any>) {
    if (!this.isEnabled || this.isTestEnvironment) return

    const userAction: UserAction = {
      action,
      component,
      timestamp: new Date(),
      metadata
    }

    this.userActions.push(userAction)

    // Log in development
    if (this.isDevelopment) {
      console.log(`[User Action] ${component}: ${action}`, metadata)
    }

    // Keep only recent actions (last 100)
    if (this.userActions.length > 100) {
      this.userActions.shift()
    }
  }

  /**
   * Record an error for monitoring
   */
  recordError(error: ErrorMetric) {
    if (!this.isEnabled || this.isTestEnvironment) return

    this.errorMetrics.push(error)

    // Always log errors
    console.error('[Error Tracking]', {
      type: error.type,
      message: error.message,
      url: error.url,
      timestamp: error.timestamp
    })

    // Keep only recent errors (last 50)
    if (this.errorMetrics.length > 50) {
      this.errorMetrics.shift()
    }
  }

  /**
   * Record API response times
   */
  recordApiMetric(endpoint: string, method: string, duration: number, status: number) {
    if (!this.isEnabled || this.isTestEnvironment) return

    this.recordPerformanceMetric('api_response_time', duration, {
      endpoint,
      method,
      status: status.toString()
    })

    // Track API errors
    if (status >= 400 && typeof navigator !== 'undefined') {
      this.recordError({
        type: 'api_error',
        message: `API ${method} ${endpoint} returned ${status}`,
        url: endpoint,
        userAgent: navigator.userAgent,
        timestamp: new Date()
      })
    }
  }

  /**
   * Get current session analytics summary
   */
  getSessionSummary() {
    return {
      sessionId: this.sessionId,
      totalActions: this.userActions.length,
      totalErrors: this.errorMetrics.length,
      avgPerformance: this.calculateAveragePerformance(),
      topActions: this.getTopUserActions(),
      recentErrors: this.errorMetrics.slice(-5)
    }
  }

  private calculateAveragePerformance(): Record<string, number> {
    const metrics = this.performanceMetrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = { total: 0, count: 0 }
      }
      acc[metric.name].total += metric.value
      acc[metric.name].count += 1
      return acc
    }, {} as Record<string, { total: number; count: number }>)

    return Object.entries(metrics).reduce((acc, [name, data]) => {
      acc[name] = Math.round(data.total / data.count)
      return acc
    }, {} as Record<string, number>)
  }

  private getTopUserActions(): Array<{ action: string; count: number }> {
    const actionCounts = this.userActions.reduce((acc, action) => {
      const key = `${action.component}:${action.action}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }))
  }

  /**
   * Send analytics data to backend (in production)
   */
  async flushAnalytics() {
    if (this.isDevelopment) {
      console.log('[Analytics] Session summary:', this.getSessionSummary())
      return
    }

    try {
      const summary = this.getSessionSummary()

      // In a real app, you'd send this to your analytics endpoint
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(summary)
      // })

      // For demo purposes, just log
      console.log('[Analytics] Would send to backend:', summary)

    } catch (error) {
      console.error('[Analytics] Failed to flush analytics:', error)
    }
  }
}

// Create singleton instance
export const monitoring = new MonitoringService()

// Only set up global event listeners in browser environment, not in tests
if (typeof window !== 'undefined' && !monitoring['isTestEnvironment']) {
  // Flush analytics on page unload
  window.addEventListener('beforeunload', () => {
    monitoring.flushAnalytics()
  })

  // Flush analytics periodically (every 5 minutes)
  setInterval(() => {
    monitoring.flushAnalytics()
  }, 5 * 60 * 1000)
}