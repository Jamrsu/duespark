import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
  fullWidth?: boolean
  ariaLabel?: string
  ariaDescribedBy?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  children,
  fullWidth = false,
  ariaLabel,
  ariaDescribedBy,
  leftIcon,
  rightIcon,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 tap-target'

  const variants = {
    primary: 'bg-primary-700 hover:bg-primary-800 active:bg-primary-900 text-white focus:ring-primary-500 shadow-sm hover:shadow-md',
    secondary: 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500 text-gray-900 dark:text-gray-100 focus:ring-gray-500 shadow-sm hover:shadow-md',
    ghost: 'hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600 text-gray-700 dark:text-gray-200 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white focus:ring-red-500 shadow-sm hover:shadow-md',
    outline: 'border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-gray-500',
  }

  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-2.5 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[48px]',
  }

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={isLoading}
      {...props}
    >
      {/* Left icon */}
      {leftIcon && !isLoading && (
        <span className="mr-2 flex-shrink-0" aria-hidden="true">
          {leftIcon}
        </span>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
          role="img"
          aria-label="Loading"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {/* Button content */}
      <span className={cn('flex-grow', (leftIcon || rightIcon || isLoading) && 'mx-1')}>
        {children}
      </span>

      {/* Right icon */}
      {rightIcon && !isLoading && (
        <span className="ml-2 flex-shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  )
}
