import React, { useState, useRef, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  threshold?: number
  className?: string
  disabled?: boolean
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 60,
  className,
  disabled = false
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [canRefresh, setCanRefresh] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return

    const container = containerRef.current
    if (!container) return

    // Only start pull-to-refresh if scrolled to the top
    if (container.scrollTop > 0) return

    startY.current = e.touches[0].clientY
    currentY.current = startY.current
    setIsPulling(true)
  }, [disabled, isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return

    const container = containerRef.current
    if (!container) return

    // Only continue if still at the top
    if (container.scrollTop > 0) {
      setIsPulling(false)
      setPullDistance(0)
      setCanRefresh(false)
      return
    }

    currentY.current = e.touches[0].clientY
    const deltaY = currentY.current - startY.current

    if (deltaY > 0) {
      // Add resistance to the pull
      const resistance = 0.6
      const adjustedDistance = deltaY * resistance

      setPullDistance(Math.min(adjustedDistance, threshold * 1.5))
      setCanRefresh(adjustedDistance >= threshold)

      // Prevent default scrolling when pulling down
      if (deltaY > 10) {
        e.preventDefault()
      }
    } else {
      setPullDistance(0)
      setCanRefresh(false)
    }
  }, [isPulling, disabled, isRefreshing, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled || isRefreshing) return

    setIsPulling(false)

    if (canRefresh && pullDistance >= threshold) {
      setIsRefreshing(true)
      setCanRefresh(false)

      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        // Add a minimum refresh time for better UX
        setTimeout(() => {
          setIsRefreshing(false)
          setPullDistance(0)
        }, 500)
      }
    } else {
      setPullDistance(0)
      setCanRefresh(false)
    }
  }, [isPulling, disabled, isRefreshing, canRefresh, pullDistance, threshold, onRefresh])

  const refreshIconRotation = isRefreshing
    ? 'animate-spin'
    : canRefresh
    ? 'rotate-180'
    : `rotate-${Math.min(Math.floor(pullDistance * 2), 180)}`

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateY(${isPulling || isRefreshing ? Math.min(pullDistance * 0.4, 30) : 0}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull to refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 z-10"
          style={{
            height: Math.max(pullDistance * 0.8, 0),
            opacity: Math.min(pullDistance / threshold, 1)
          }}
        >
          <div className="flex flex-col items-center gap-2 py-2">
            <RefreshCw
              className={cn(
                'h-5 w-5 text-primary-600 dark:text-primary-400 transition-transform duration-200',
                refreshIconRotation
              )}
            />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {isRefreshing
                ? 'Refreshing...'
                : canRefresh
                ? 'Release to refresh'
                : 'Pull to refresh'
              }
            </span>
          </div>
        </div>
      )}

      {children}
    </div>
  )
}