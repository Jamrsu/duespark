import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ 
  children, 
  className, 
  padding = 'md',
  ...props 
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return (
    <div
      className={cn(
        'card',
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('mb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export function CardTitle({ 
  children, 
  className, 
  as: Component = 'h3',
  ...props 
}: CardTitleProps) {
  return (
    <Component
      className={cn(
        'text-lg font-semibold text-gray-900 dark:text-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div
      className={cn('text-gray-600 dark:text-gray-400', className)}
      {...props}
    >
      {children}
    </div>
  )
}