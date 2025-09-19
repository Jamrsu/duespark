import React from 'react'
import { cn } from '@/lib/utils'

// Base skeleton component with advanced animations
interface SkeletonProps {
  className?: string
  variant?: 'default' | 'pulse' | 'wave' | 'shimmer'
  speed?: 'slow' | 'normal' | 'fast'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  children?: React.ReactNode
}

export function Skeleton({
  className,
  variant = 'shimmer',
  speed = 'normal',
  rounded = 'sm',
  children,
  ...props
}: SkeletonProps) {
  const speedClasses = {
    slow: 'animate-pulse [animation-duration:2s]',
    normal: 'animate-pulse [animation-duration:1.5s]',
    fast: 'animate-pulse [animation-duration:1s]'
  }

  const roundedClasses = {
    none: '',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }

  const variantClasses = {
    default: 'bg-gray-200 dark:bg-gray-700',
    pulse: 'bg-gray-200 dark:bg-gray-700 animate-pulse',
    wave: 'bg-gradient-to-r from-gray-200 via-gray-100 via-gray-200 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:via-gray-700 dark:to-gray-700 bg-[length:200%_100%] animate-wave',
    shimmer: 'relative bg-gray-200 dark:bg-gray-700 overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent'
  }

  return (
    <div
      className={cn(
        'block',
        variantClasses[variant],
        speedClasses[speed],
        roundedClasses[rounded],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// KPI Card Skeleton
export function KPICardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="w-6 h-6 ml-3" rounded="full" />
      </div>
    </div>
  )
}

// Invoice List Item Skeleton
export function InvoiceItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5" rounded="full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Amount and due date */}
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-7 w-24" />
        <div className="text-right">
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Invoice details */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  )
}

// Client Item Skeleton
export function ClientItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12" rounded="full" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="text-right">
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

// Dashboard Statistics Grid Skeleton
export function DashboardStatsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4', className)}>
      {[...Array(4)].map((_, index) => (
        <KPICardSkeleton key={index} />
      ))}
    </div>
  )
}

// Status Breakdown Skeleton
export function StatusBreakdownSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700', className)}>
      <Skeleton className="h-6 w-40 mb-4" />

      {/* Mobile: Horizontal Scrollable */}
      <div className="flex sm:hidden gap-4 overflow-x-auto scrollbar-hide">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex-shrink-0 w-24 text-center">
            <Skeleton className="h-8 w-12 mx-auto mb-2" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>

      {/* Desktop: Grid Layout */}
      <div className="hidden sm:grid grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="text-center">
            <Skeleton className="h-8 w-12 mx-auto mb-2" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Recent Items List Skeleton
export function RecentItemsListSkeleton({
  itemCount = 3,
  className
}: {
  itemCount?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {[...Array(itemCount)].map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="text-right">
            <Skeleton className="h-5 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Form Skeleton
export function FormSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Form fields */}
      {[...Array(4)].map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
      </div>
    </div>
  )
}

// Table Skeleton
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      {/* Table header */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="grid gap-4 p-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {[...Array(columns)].map((_, index) => (
            <Skeleton key={index} className="h-4 w-20" />
          ))}
        </div>
      </div>

      {/* Table body */}
      <div className="bg-white dark:bg-gray-800">
        {[...Array(rows)].map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4 p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
            style={{
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              animationDelay: `${rowIndex * 50}ms`
            }}
          >
            {[...Array(columns)].map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="h-4 w-full"
                variant="shimmer"
                speed="normal"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Chart Skeleton
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6', className)}>
      <Skeleton className="h-6 w-32 mb-4" />

      {/* Chart area */}
      <div className="h-64 relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-2">
          {[...Array(5)].map((_, index) => (
            <Skeleton key={index} className="h-3 w-8" />
          ))}
        </div>

        {/* Chart bars */}
        <div className="ml-12 h-full flex items-end justify-between gap-2">
          {[...Array(7)].map((_, index) => {
            const heights = ['h-1/2', 'h-2/3', 'h-3/4', 'h-4/5', 'h-full', 'h-3/5', 'h-1/3']
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <Skeleton
                  className={cn("w-full mb-2", heights[index % heights.length])}
                  variant="shimmer"
                  speed="normal"
                />
                <Skeleton className="h-3 w-8" />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Staggered List Skeleton with animation delays
export function StaggeredListSkeleton({
  itemCount = 5,
  ItemComponent = InvoiceItemSkeleton,
  className
}: {
  itemCount?: number
  ItemComponent?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {[...Array(itemCount)].map((_, index) => (
        <div
          key={index}
          className="animate-fade-in"
          style={{
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'both'
          }}
        >
          <ItemComponent />
        </div>
      ))}
    </div>
  )
}

// Page Loading Skeleton
export function PageLoadingSkeleton({
  variant = 'dashboard',
  className
}: {
  variant?: 'dashboard' | 'list' | 'form' | 'detail'
  className?: string
}) {
  switch (variant) {
    case 'dashboard':
      return (
        <div className={cn('space-y-6', className)}>
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-32" rounded="md" />
          </div>

          {/* Stats */}
          <DashboardStatsSkeleton />

          {/* Status breakdown */}
          <StatusBreakdownSkeleton />

          {/* Recent items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-20" rounded="md" />
              </div>
              <RecentItemsListSkeleton />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <Skeleton className="h-6 w-32 mb-4" />
              <RecentItemsListSkeleton />
            </div>
          </div>
        </div>
      )

    case 'list':
      return (
        <div className={cn('space-y-6', className)}>
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-32" rounded="md" />
          </div>
          <StaggeredListSkeleton itemCount={8} />
        </div>
      )

    case 'form':
      return (
        <div className={cn('max-w-2xl mx-auto', className)}>
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <FormSkeleton />
        </div>
      )

    case 'detail':
      return (
        <div className={cn('space-y-6', className)}>
          <div className="flex justify-between items-start">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" rounded="md" />
              <Skeleton className="h-10 w-20" rounded="md" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <FormSkeleton />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="space-y-3">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )

    default:
      return <div className={className}>Loading...</div>
  }
}

