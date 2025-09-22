/**
 * Enhanced Progress Indicators
 * Provides various progress indicators for loading states and long-running operations
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

// Linear progress bar
interface ProgressBarProps {
  value: number // 0-100
  max?: number
  className?: string
  showLabel?: boolean
  label?: string
  color?: 'primary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  className,
  showLabel = false,
  label,
  color = 'primary',
  size = 'md',
  animated = true
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  const colorClasses = {
    primary: 'bg-primary-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600'
  }

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label || 'Progress'}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            colorClasses[color],
            animated && 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:100px_100%] animate-[shimmer_2s_infinite]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Circular progress indicator
interface CircularProgressProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  className?: string
  color?: 'primary' | 'success' | 'warning' | 'danger'
  showValue?: boolean
  children?: React.ReactNode
}

export function CircularProgress({
  value,
  size = 48,
  strokeWidth = 4,
  className,
  color = 'primary',
  showValue = false,
  children
}: CircularProgressProps) {
  const percentage = Math.min(Math.max(value, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const colorClasses = {
    primary: 'stroke-primary-600',
    success: 'stroke-green-600',
    warning: 'stroke-yellow-600',
    danger: 'stroke-red-600'
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(colorClasses[color], 'transition-all duration-300 ease-out')}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showValue && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(percentage)}%
          </span>
        ))}
      </div>
    </div>
  )
}

// Multi-step progress indicator
interface MultiStepProgressProps {
  steps: Array<{
    id: string
    label: string
    status: 'pending' | 'current' | 'completed' | 'error'
  }>
  className?: string
  showLabels?: boolean
  orientation?: 'horizontal' | 'vertical'
}

export function MultiStepProgress({
  steps,
  className,
  showLabels = true,
  orientation = 'horizontal'
}: MultiStepProgressProps) {
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      case 'current':
        return <Clock className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStepClasses = (status: string) => {
    const baseClasses = 'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-200'

    switch (status) {
      case 'completed':
        return cn(baseClasses, 'bg-green-500 text-white')
      case 'error':
        return cn(baseClasses, 'bg-red-500 text-white')
      case 'current':
        return cn(baseClasses, 'bg-primary-600 text-white animate-pulse')
      default:
        return cn(baseClasses, 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400')
    }
  }

  const getConnectorClasses = (prevStatus: string, currentStatus: string) => {
    const isCompleted = prevStatus === 'completed' || prevStatus === 'error'
    return cn(
      'transition-all duration-200',
      orientation === 'horizontal' ? 'flex-1 h-0.5 mx-2' : 'w-0.5 h-8 mx-auto my-2',
      isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
    )
  }

  if (orientation === 'vertical') {
    return (
      <div className={cn('flex flex-col', className)}>
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start">
            <div className="flex flex-col items-center">
              <div className={getStepClasses(step.status)}>
                {getStepIcon(step.status) || (index + 1)}
              </div>
              {index < steps.length - 1 && (
                <div className={getConnectorClasses(step.status, steps[index + 1]?.status)} />
              )}
            </div>
            {showLabels && (
              <div className="ml-4 pb-8">
                <p className={cn(
                  'text-sm font-medium',
                  step.status === 'current' ? 'text-primary-600' : 'text-gray-700 dark:text-gray-300'
                )}>
                  {step.label}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div className={getStepClasses(step.status)}>
              {getStepIcon(step.status) || (index + 1)}
            </div>
            {showLabels && (
              <p className={cn(
                'mt-2 text-xs text-center max-w-[80px] truncate',
                step.status === 'current' ? 'text-primary-600 font-medium' : 'text-gray-500 dark:text-gray-400'
              )}>
                {step.label}
              </p>
            )}
          </div>
          {index < steps.length - 1 && (
            <div className={getConnectorClasses(step.status, steps[index + 1]?.status)} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// Upload progress indicator
interface UploadProgressProps {
  files: Array<{
    name: string
    progress: number
    status: 'uploading' | 'completed' | 'error'
    error?: string
  }>
  className?: string
}

export function UploadProgress({ files, className }: UploadProgressProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {files.map((file, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {file.name}
            </p>
            <div className="flex items-center gap-2">
              {file.status === 'completed' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {file.status === 'error' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {file.progress}%
              </span>
            </div>
          </div>

          <ProgressBar
            value={file.progress}
            color={file.status === 'error' ? 'danger' : file.status === 'completed' ? 'success' : 'primary'}
            size="sm"
            animated={file.status === 'uploading'}
          />

          {file.error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {file.error}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// Infinite scroll loading indicator
export function InfiniteScrollLoader({ isLoading = false, hasMore = true, error = null }: {
  isLoading?: boolean
  hasMore?: boolean
  error?: string | null
}) {
  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (!hasMore) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">No more items to load</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading more...</span>
        </div>
      </div>
    )
  }

  return null
}