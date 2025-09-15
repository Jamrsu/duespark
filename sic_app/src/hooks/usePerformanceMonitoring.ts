import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// Performance metrics interface
interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  fcp?: number // First Contentful Paint
  ttfb?: number // Time to First Byte

  // Custom metrics
  loadTime: number
  domContentLoaded: number
  networkLatency?: number
  bundleSize?: number
  memoryUsage?: number

  // User experience metrics
  timeToInteractive?: number
  bounceRate?: number
  taskDuration?: number
}

// Performance monitoring hook
export function usePerformanceMonitoring(enabled = true) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    domContentLoaded: 0
  })

  const metricsRef = useRef<PerformanceMetrics>(metrics)

  useEffect(() => {
    if (!enabled) return

    // Collect basic navigation timing
    const collectNavigationMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        const newMetrics: PerformanceMetrics = {
          loadTime: navigation.loadEventEnd - navigation.fetchStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          ttfb: navigation.responseStart - navigation.fetchStart,
          networkLatency: navigation.responseStart - navigation.requestStart
        }

        setMetrics(prev => ({ ...prev, ...newMetrics }))
        metricsRef.current = { ...metricsRef.current, ...newMetrics }
      }
    }

    // Collect Core Web Vitals using PerformanceObserver
    const collectWebVitals = () => {
      // Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1] as any
            if (lastEntry) {
              const lcp = lastEntry.renderTime || lastEntry.loadTime
              setMetrics(prev => ({ ...prev, lcp }))
              metricsRef.current = { ...metricsRef.current, lcp }
            }
          })
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

          // First Input Delay (FID)
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            entries.forEach((entry: any) => {
              const fid = entry.processingStart - entry.startTime
              setMetrics(prev => ({ ...prev, fid }))
              metricsRef.current = { ...metricsRef.current, fid }
            })
          })
          fidObserver.observe({ entryTypes: ['first-input'] })

          // Cumulative Layout Shift (CLS)
          const clsObserver = new PerformanceObserver((list) => {
            let clsValue = 0
            const entries = list.getEntries()
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value
              }
            })
            if (clsValue > 0) {
              setMetrics(prev => ({ ...prev, cls: clsValue }))
              metricsRef.current = { ...metricsRef.current, cls: clsValue }
            }
          })
          clsObserver.observe({ entryTypes: ['layout-shift'] })

          // First Contentful Paint (FCP)
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            entries.forEach((entry: any) => {
              if (entry.name === 'first-contentful-paint') {
                const fcp = entry.startTime
                setMetrics(prev => ({ ...prev, fcp }))
                metricsRef.current = { ...metricsRef.current, fcp }
              }
            })
          })
          fcpObserver.observe({ entryTypes: ['paint'] })
        } catch (error) {
          console.warn('Performance monitoring not fully supported:', error)
        }
      }
    }

    // Collect memory usage if available
    const collectMemoryMetrics = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const memoryUsage = memory.usedJSHeapSize / (1024 * 1024) // Convert to MB
        setMetrics(prev => ({ ...prev, memoryUsage }))
        metricsRef.current = { ...metricsRef.current, memoryUsage }
      }
    }

    // Initial collection
    collectNavigationMetrics()
    collectWebVitals()
    collectMemoryMetrics()

    // Collect memory usage periodically
    const memoryInterval = setInterval(collectMemoryMetrics, 5000)

    return () => {
      clearInterval(memoryInterval)
    }
  }, [enabled])

  return metrics
}

// React Query performance monitoring
export function useQueryPerformance() {
  const [queryMetrics, setQueryMetrics] = useState({
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    averageQueryTime: 0,
    cacheHitRatio: 0
  })

  const queryTimingsRef = useRef<number[]>([])

  // Track query performance
  useEffect(() => {
    const startTimes = new Map<string, number>()
    const originalFetch = window.fetch

    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const startTime = performance.now()
      startTimes.set(url, startTime)

      try {
        const response = await originalFetch(input, init)
        const endTime = performance.now()
        const duration = endTime - startTime

        // Track timing
        queryTimingsRef.current.push(duration)
        if (queryTimingsRef.current.length > 100) {
          queryTimingsRef.current = queryTimingsRef.current.slice(-50)
        }

        // Update metrics
        setQueryMetrics(prev => ({
          ...prev,
          totalQueries: prev.totalQueries + 1,
          successfulQueries: response.ok ? prev.successfulQueries + 1 : prev.successfulQueries,
          failedQueries: response.ok ? prev.failedQueries : prev.failedQueries + 1,
          averageQueryTime: queryTimingsRef.current.reduce((a, b) => a + b, 0) / queryTimingsRef.current.length
        }))

        return response
      } catch (error) {
        setQueryMetrics(prev => ({
          ...prev,
          totalQueries: prev.totalQueries + 1,
          failedQueries: prev.failedQueries + 1
        }))
        throw error
      }
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return queryMetrics
}

// Bundle size monitoring
export function useBundleAnalysis() {
  return useQuery({
    queryKey: ['bundle-analysis'],
    queryFn: async () => {
      // Estimate bundle size based on loaded resources
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

      const analysis = {
        totalResources: resources.length,
        jsSize: 0,
        cssSize: 0,
        imageSize: 0,
        totalSize: 0,
        slowestResources: [] as Array<{ name: string; duration: number; size?: number }>
      }

      resources.forEach(resource => {
        const size = resource.transferSize || 0
        const duration = resource.responseEnd - resource.startTime

        analysis.totalSize += size

        if (resource.name.includes('.js')) {
          analysis.jsSize += size
        } else if (resource.name.includes('.css')) {
          analysis.cssSize += size
        } else if (/\.(png|jpg|jpeg|gif|svg|webp)/.test(resource.name)) {
          analysis.imageSize += size
        }

        // Track slowest resources
        if (duration > 100) {
          analysis.slowestResources.push({
            name: resource.name,
            duration,
            size
          })
        }
      })

      // Sort by duration and keep top 10
      analysis.slowestResources = analysis.slowestResources
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)

      return analysis
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000
  })
}

// Performance score calculation
export function usePerformanceScore() {
  const metrics = usePerformanceMonitoring()
  const queryMetrics = useQueryPerformance()
  const bundleAnalysis = useBundleAnalysis()

  const calculateScore = () => {
    let score = 100

    // Core Web Vitals scoring (40% of total)
    if (metrics.lcp) {
      if (metrics.lcp > 4000) score -= 15 // Poor LCP
      else if (metrics.lcp > 2500) score -= 8 // Needs improvement
    }

    if (metrics.fid) {
      if (metrics.fid > 300) score -= 10 // Poor FID
      else if (metrics.fid > 100) score -= 5 // Needs improvement
    }

    if (metrics.cls) {
      if (metrics.cls > 0.25) score -= 10 // Poor CLS
      else if (metrics.cls > 0.1) score -= 5 // Needs improvement
    }

    // Network performance (30% of total)
    if (metrics.loadTime > 5000) score -= 12
    else if (metrics.loadTime > 3000) score -= 6

    if (queryMetrics.averageQueryTime > 1000) score -= 8
    else if (queryMetrics.averageQueryTime > 500) score -= 4

    // Query success rate (20% of total)
    const successRate = queryMetrics.totalQueries > 0
      ? queryMetrics.successfulQueries / queryMetrics.totalQueries
      : 1
    if (successRate < 0.9) score -= 10
    else if (successRate < 0.95) score -= 5

    // Bundle size (10% of total)
    const bundleSize = bundleAnalysis.data?.jsSize || 0
    if (bundleSize > 1024 * 1024) score -= 5 // > 1MB
    else if (bundleSize > 500 * 1024) score -= 3 // > 500KB

    return Math.max(0, Math.min(100, score))
  }

  return {
    score: calculateScore(),
    metrics,
    queryMetrics,
    bundleAnalysis: bundleAnalysis.data,
    recommendations: generateRecommendations(metrics, queryMetrics, bundleAnalysis.data)
  }
}

// Generate performance recommendations
function generateRecommendations(metrics: PerformanceMetrics, queryMetrics: any, bundleData: any) {
  const recommendations = []

  if (metrics.lcp && metrics.lcp > 2500) {
    recommendations.push({
      type: 'lcp',
      priority: metrics.lcp > 4000 ? 'high' : 'medium',
      message: 'Optimize Largest Contentful Paint by reducing image sizes or using lazy loading',
      value: `${metrics.lcp.toFixed(0)}ms`
    })
  }

  if (metrics.fid && metrics.fid > 100) {
    recommendations.push({
      type: 'fid',
      priority: metrics.fid > 300 ? 'high' : 'medium',
      message: 'Reduce First Input Delay by optimizing JavaScript execution',
      value: `${metrics.fid.toFixed(0)}ms`
    })
  }

  if (metrics.cls && metrics.cls > 0.1) {
    recommendations.push({
      type: 'cls',
      priority: metrics.cls > 0.25 ? 'high' : 'medium',
      message: 'Improve Cumulative Layout Shift by setting image dimensions and avoiding dynamic content',
      value: metrics.cls.toFixed(3)
    })
  }

  if (queryMetrics.averageQueryTime > 500) {
    recommendations.push({
      type: 'query',
      priority: queryMetrics.averageQueryTime > 1000 ? 'high' : 'medium',
      message: 'Optimize API queries by implementing caching or reducing payload size',
      value: `${queryMetrics.averageQueryTime.toFixed(0)}ms avg`
    })
  }

  if (bundleData && bundleData.jsSize > 500 * 1024) {
    recommendations.push({
      type: 'bundle',
      priority: bundleData.jsSize > 1024 * 1024 ? 'high' : 'medium',
      message: 'Reduce bundle size by implementing code splitting or removing unused dependencies',
      value: `${(bundleData.jsSize / 1024).toFixed(0)}KB`
    })
  }

  if (metrics.memoryUsage && metrics.memoryUsage > 100) {
    recommendations.push({
      type: 'memory',
      priority: metrics.memoryUsage > 200 ? 'high' : 'low',
      message: 'Monitor memory usage and fix potential memory leaks',
      value: `${metrics.memoryUsage.toFixed(1)}MB`
    })
  }

  return recommendations
}

// Performance monitoring provider
export function usePerformanceProvider() {
  const performanceScore = usePerformanceScore()

  // Send performance data to analytics (implement as needed)
  useEffect(() => {
    if (performanceScore.score > 0) {
      // Send to your analytics service
      console.log('Performance Score:', performanceScore.score)
      console.log('Recommendations:', performanceScore.recommendations)
    }
  }, [performanceScore.score])

  return performanceScore
}