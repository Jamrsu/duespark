import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars'
  className?: string
  color?: 'primary' | 'white' | 'gray'
  text?: string
}

export function LoadingSpinner({
  size = 'md',
  variant = 'spinner',
  className = '',
  color = 'primary',
  text
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const colorClasses = {
    primary: 'text-primary-500',
    white: 'text-white',
    gray: 'text-gray-500'
  }

  const renderSpinner = () => {
    switch (variant) {
      case 'spinner':
        return (
          <Loader2
            className={cn(
              sizeClasses[size],
              colorClasses[color],
              'animate-spin'
            )}
          />
        )

      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full animate-bounce',
                  size === 'xs' && 'w-1 h-1',
                  size === 'sm' && 'w-1.5 h-1.5',
                  size === 'md' && 'w-2 h-2',
                  size === 'lg' && 'w-3 h-3',
                  size === 'xl' && 'w-4 h-4',
                  color === 'primary' && 'bg-primary-500',
                  color === 'white' && 'bg-white',
                  color === 'gray' && 'bg-gray-500'
                )}
                style={{
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )

      case 'pulse':
        return (
          <div
            className={cn(
              'rounded-full animate-pulse',
              sizeClasses[size],
              color === 'primary' && 'bg-primary-500',
              color === 'white' && 'bg-white',
              color === 'gray' && 'bg-gray-500'
            )}
          />
        )

      case 'bars':
        return (
          <div className="flex space-x-0.5 items-end">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  'animate-[bounce_1s_ease-in-out_infinite]',
                  size === 'xs' && 'w-0.5 h-3',
                  size === 'sm' && 'w-0.5 h-4',
                  size === 'md' && 'w-1 h-6',
                  size === 'lg' && 'w-1.5 h-8',
                  size === 'xl' && 'w-2 h-10',
                  color === 'primary' && 'bg-primary-500',
                  color === 'white' && 'bg-white',
                  color === 'gray' && 'bg-gray-500'
                )}
                style={{
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )

      default:
        return (
          <div
            className={cn(
              sizeClasses[size],
              'border-4 rounded-full animate-spin',
              color === 'primary' && 'border-gray-200 dark:border-gray-600 border-t-primary-500',
              color === 'white' && 'border-gray-300 border-t-white',
              color === 'gray' && 'border-gray-300 border-t-gray-500'
            )}
          />
        )
    }
  }

  return (
    <div className={cn('flex flex-col items-center justify-center p-8', className)}>
      <div role="status" aria-label={text || "Loading"}>
        {renderSpinner()}
        <span className="sr-only">{text || "Loading..."}</span>
      </div>
      {text && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  )
}

interface LoadingOverlayProps {
  isVisible: boolean
  text?: string
  className?: string
  backdrop?: 'light' | 'dark' | 'blur'
}

export function LoadingOverlay({
  isVisible,
  text = "Loading...",
  className,
  backdrop = 'light'
}: LoadingOverlayProps) {
  if (!isVisible) return null

  const backdropClasses = {
    light: 'bg-white/80 dark:bg-gray-900/80',
    dark: 'bg-gray-900/50',
    blur: 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm'
  }

  return (
    <div className={cn(
      'absolute inset-0 z-50 flex items-center justify-center',
      backdropClasses[backdrop],
      className
    )}>
      <div className="flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  )
}

interface InlineLoadingProps {
  isLoading: boolean
  children: React.ReactNode
  loadingComponent?: React.ReactNode
  className?: string
}

export function InlineLoading({
  isLoading,
  children,
  loadingComponent,
  className
}: InlineLoadingProps) {
  return (
    <div className={cn('relative', className)}>
      {isLoading ? (
        loadingComponent || <LoadingSpinner size="sm" />
      ) : (
        children
      )}
    </div>
  )
}