/**
 * Comprehensive loading state components for consistent UX
 */

import React from 'react'
import { Loader2, Clock, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Loading spinner variants
type SpinnerSize = 'sm' | 'md' | 'lg'
type SpinnerVariant = 'primary' | 'secondary' | 'muted'

interface LoadingSpinnerProps {
  size?: SpinnerSize
  variant?: SpinnerVariant
  className?: string
  text?: string
}

export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  className,
  text
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  const variantClasses = {
    primary: 'text-primary-600',
    secondary: 'text-gray-500',
    muted: 'text-gray-400'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2
        className={cn(
          'animate-spin',
          sizeClasses[size],
          variantClasses[variant]
        )}
        aria-label="Loading"
      />
      {text && (
        <span className={cn(
          'text-sm',
          variantClasses[variant]
        )}>
          {text}
        </span>
      )}
    </div>
  )
}

// Button loading state
interface LoadingButtonProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
  disabled?: boolean
  className?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  onClick?: (e: React.MouseEvent) => void
}

export function LoadingButton({
  isLoading,
  children,
  loadingText,
  disabled,
  className,
  variant = 'primary',
  size = 'md',
  onClick
}: LoadingButtonProps) {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus-ring disabled:opacity-50 disabled:cursor-not-allowed tap-target"

  const variantClasses = {
    primary: "bg-primary-700 hover:bg-primary-800 text-white",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white",
    outline: "border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200",
    ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
  }

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      aria-disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <LoadingSpinner
            size="sm"
            variant={variant === 'outline' || variant === 'ghost' ? 'muted' : 'secondary'}
            className="mr-2"
          />
          {loadingText || 'Loading...'}
        </>
      ) : (
        children
      )}
    </button>
  )
}

// Card loading skeleton
interface LoadingCardProps {
  title?: boolean
  lines?: number
  className?: string
  avatar?: boolean
  actions?: boolean
}

export function LoadingCard({
  title = true,
  lines = 3,
  className,
  avatar = false,
  actions = false
}: LoadingCardProps) {
  return (
    <div className={cn(
      'animate-pulse bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6',
      className
    )}>
      {/* Header with avatar */}
      {(title || avatar) && (
        <div className="flex items-center gap-4 mb-4">
          {avatar && (
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
          )}
          {title && (
            <div className="flex-1">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md w-2/3 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-1/2" />
            </div>
          )}
        </div>
      )}

      {/* Content lines */}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 bg-gray-200 dark:bg-gray-700 rounded-md',
              i === lines - 1 ? 'w-2/3' : 'w-full'
            )}
          />
        ))}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-md" />
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-md" />
        </div>
      )}
    </div>
  )
}

// Enhanced skeleton components for specific use cases
export function LoadingDashboardCard() {
  return (
    <LoadingCard
      title
      lines={2}
      className="p-6"
    />
  )
}

export function LoadingInvoiceCard() {
  return (
    <div className="animate-pulse bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-md mb-2" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-md" />
        </div>
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-md" />
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-md" />
      </div>
    </div>
  )
}

export function LoadingClientCard() {
  return (
    <LoadingCard
      avatar
      title={false}
      lines={2}
      actions
      className="p-4"
    />
  )
}

// Step progress indicator
interface StepProgressProps {
  currentStep: number
  totalSteps: number
  stepLabels?: string[]
  className?: string
}

export function StepProgress({ currentStep, totalSteps, stepLabels, className }: StepProgressProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isCompleted = stepNumber < currentStep
        const isUpcoming = stepNumber > currentStep

        return (
          <div key={stepNumber} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  isActive && 'bg-primary-700 text-white',
                  isCompleted && 'bg-green-500 text-white',
                  isUpcoming && 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  stepNumber
                )}
              </div>
              {stepLabels && (
                <span className={cn(
                  'mt-2 text-xs text-center',
                  isActive && 'text-primary-600 font-medium',
                  isCompleted && 'text-green-500',
                  isUpcoming && 'text-gray-400'
                )}>
                  {stepLabels[index]}
                </span>
              )}
            </div>

            {index < totalSteps - 1 && (
              <div
                className={cn(
                  'w-12 h-0.5 mx-2',
                  isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Process status indicator
interface ProcessStatusProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  message?: string
  className?: string
}

export function ProcessStatus({ status, message, className }: ProcessStatusProps) {
  const statusConfig = {
    idle: {
      icon: Clock,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100 dark:bg-gray-800'
    },
    loading: {
      icon: Loader2,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50 dark:bg-primary-900/20'
    },
    success: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    error: {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg',
      config.bgColor,
      className
    )}>
      <Icon
        className={cn(
          'h-4 w-4',
          config.color,
          status === 'loading' && 'animate-spin'
        )}
      />
      {message && (
        <span className={cn('text-sm', config.color)}>
          {message}
        </span>
      )}
    </div>
  )
}

// Form field loading skeleton
export function LoadingFormField() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2" />
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    </div>
  )
}

// Table row loading skeleton
interface LoadingTableRowProps {
  columns: number
}

export function LoadingTableRow({ columns }: LoadingTableRowProps) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md" />
        </td>
      ))}
    </tr>
  )
}

// Page loading overlay
interface LoadingOverlayProps {
  message?: string
  className?: string
}

export function LoadingOverlay({ message = 'Loading...', className }: LoadingOverlayProps) {
  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm',
      className
    )}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  )
}

// Content loading wrapper
interface LoadingContentProps {
  isLoading: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

export function LoadingContent({
  isLoading,
  children,
  fallback,
  className
}: LoadingContentProps) {
  if (isLoading) {
    return (
      <div className={className}>
        {fallback || <LoadingCard />}
      </div>
    )
  }

  return <div className={className}>{children}</div>
}
