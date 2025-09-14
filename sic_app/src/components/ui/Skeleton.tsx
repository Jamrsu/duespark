import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
  height?: string | number
  width?: string | number
  lines?: number
}

export function Skeleton({
  className,
  variant = 'rectangular',
  animation = 'pulse',
  height,
  width,
  lines = 1
}: SkeletonProps) {
  const getAnimationClasses = () => {
    switch (animation) {
      case 'pulse':
        return 'animate-pulse'
      case 'wave':
        return 'animate-[wave_1.5s_ease-in-out_infinite]'
      case 'none':
        return ''
      default:
        return 'animate-pulse'
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded'
      case 'circular':
        return 'rounded-full aspect-square'
      case 'rectangular':
        return 'rounded'
      default:
        return 'rounded'
    }
  }

  const baseClasses = cn(
    'bg-gray-200 dark:bg-gray-700',
    getAnimationClasses(),
    getVariantClasses(),
    className
  )

  const style: React.CSSProperties = {}
  if (height) style.height = typeof height === 'number' ? `${height}px` : height
  if (width) style.width = typeof width === 'number' ? `${width}px` : width

  if (lines > 1 && variant === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseClasses,
              index === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
            )}
            style={style}
          />
        ))}
      </div>
    )
  }

  return <div className={baseClasses} style={style} />
}

// Specific skeleton components for common use cases

export function SkeletonCard({
  showAvatar = true,
  showButton = true,
  lines = 3,
  className
}: {
  showAvatar?: boolean
  showButton?: boolean
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('p-6 space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      {/* Header with avatar */}
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <Skeleton variant="circular" className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-1/4" />
            <Skeleton variant="text" className="w-1/3" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-2">
        <Skeleton variant="text" lines={lines} />
      </div>

      {/* Action button */}
      {showButton && (
        <div className="flex justify-end pt-4">
          <Skeleton className="h-9 w-24" />
        </div>
      )}
    </div>
  )
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  className
}: {
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
}) {
  return (
    <div className={cn('w-full', className)}>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        {showHeader && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, index) => (
                <Skeleton key={index} variant="text" className="h-4" />
              ))}
            </div>
          </div>
        )}

        {/* Rows */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="px-6 py-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <Skeleton key={colIndex} variant="text" className="h-4" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SkeletonStats({
  count = 4,
  className
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <Skeleton variant="text" className="w-1/2 h-4" />
            <Skeleton variant="text" className="w-3/4 h-8" />
            <Skeleton variant="text" className="w-1/3 h-4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonForm({
  fields = 5,
  showButton = true,
  className
}: {
  fields?: number
  showButton?: boolean
  className?: string
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton variant="text" className="w-1/4 h-4" />
          <Skeleton className="h-12 w-full" />
          <Skeleton variant="text" className="w-1/3 h-3" />
        </div>
      ))}

      {showButton && (
        <div className="flex justify-end pt-4">
          <Skeleton className="h-10 w-32" />
        </div>
      )}
    </div>
  )
}