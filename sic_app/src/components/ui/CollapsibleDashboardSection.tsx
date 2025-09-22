/**
 * Collapsible Dashboard Section Component
 * Provides mobile-optimized collapsible sections for dashboard content
 */

import React, { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useAccessibility } from './AccessibilityProvider'

interface CollapsibleDashboardSectionProps {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
  badge?: string | number
  defaultExpanded?: boolean
  className?: string
  headerClassName?: string
  contentClassName?: string
  priority?: 'high' | 'medium' | 'low'
  collapsible?: boolean
}

export function CollapsibleDashboardSection({
  title,
  children,
  icon,
  badge,
  defaultExpanded = true,
  className,
  headerClassName,
  contentClassName,
  priority = 'medium',
  collapsible = true
}: CollapsibleDashboardSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const { announceToScreenReader, isReducedMotion } = useAccessibility()
  const contentRef = useRef<HTMLDivElement>(null)
  const sectionId = `dashboard-section-${title.toLowerCase().replace(/\s+/g, '-')}`
  const contentId = `${sectionId}-content`

  const toggleExpanded = () => {
    if (!collapsible) return

    const newState = !isExpanded
    setIsExpanded(newState)
    announceToScreenReader(
      `${title} section ${newState ? 'expanded' : 'collapsed'}`,
      'polite'
    )
  }

  const priorityClasses = {
    high: 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
    medium: 'border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10',
    low: 'border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-900/10'
  }

  return (
    <section
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden',
        'transition-all duration-200',
        className
      )}
      aria-labelledby={sectionId}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between p-4 sm:p-6',
          collapsible && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700',
          'transition-colors duration-200',
          headerClassName
        )}
        onClick={toggleExpanded}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-controls={collapsible ? contentId : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={(e) => {
          if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            toggleExpanded()
          }
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icon */}
          {icon && (
            <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
              {icon}
            </div>
          )}

          {/* Title */}
          <h2
            id={sectionId}
            className={cn(
              'font-semibold text-gray-900 dark:text-gray-100 truncate',
              'text-lg sm:text-xl'
            )}
          >
            {title}
          </h2>

          {/* Badge */}
          {badge && (
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
                'flex-shrink-0'
              )}
              aria-label={`${badge} items`}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Collapse/Expand Indicator */}
        {collapsible && (
          <div className="flex-shrink-0 ml-2">
            {isExpanded ? (
              <ChevronUp
                className="h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform duration-200"
                aria-hidden="true"
              />
            ) : (
              <ChevronDown
                className="h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform duration-200"
                aria-hidden="true"
              />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        id={contentId}
        className={cn(
          'overflow-hidden transition-all duration-300',
          !isReducedMotion && 'ease-in-out',
          isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0',
          contentClassName
        )}
        aria-hidden={!isExpanded}
      >
        <div className="p-4 sm:p-6 pt-0">
          {children}
        </div>
      </div>
    </section>
  )
}

// Mobile-optimized dashboard grid
interface MobileDashboardGridProps {
  children: React.ReactNode
  className?: string
}

export function MobileDashboardGrid({
  children,
  className
}: MobileDashboardGridProps) {
  return (
    <div
      className={cn(
        'space-y-4 sm:space-y-6',
        // Mobile: single column, tablet: 2 columns, desktop: varies by content
        'grid grid-cols-1 gap-4 sm:gap-6',
        className
      )}
    >
      {children}
    </div>
  )
}

// Dashboard action button (floating action button for mobile)
interface DashboardActionButtonProps {
  onClick: () => void
  icon: React.ReactNode
  label: string
  variant?: 'primary' | 'secondary'
  className?: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

export function DashboardActionButton({
  onClick,
  icon,
  label,
  variant = 'primary',
  className,
  position = 'bottom-right'
}: DashboardActionButtonProps) {
  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6 sm:bottom-8 sm:right-8',
    'bottom-left': 'fixed bottom-6 left-6 sm:bottom-8 sm:left-8',
    'top-right': 'fixed top-6 right-6 sm:top-8 sm:right-8',
    'top-left': 'fixed top-6 left-6 sm:top-8 sm:left-8'
  }

  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-lg hover:shadow-xl'
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'z-40 p-4 rounded-full transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
        'active:scale-95 tap-target',
        'sm:hidden', // Hide on desktop, show only on mobile
        positionClasses[position],
        variantClasses[variant],
        className
      )}
      aria-label={label}
    >
      <div className="h-6 w-6" aria-hidden="true">
        {icon}
      </div>
    </button>
  )
}

// Quick stats summary component
interface QuickStatsProps {
  stats: Array<{
    label: string
    value: string | number
    change?: {
      value: number
      type: 'increase' | 'decrease' | 'neutral'
    }
    icon?: React.ReactNode
    onClick?: () => void
  }>
  className?: string
}

export function QuickStats({ stats, className }: QuickStatsProps) {
  return (
    <div className={cn(
      'grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4',
      className
    )}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className={cn(
            'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4',
            'transition-all duration-200',
            stat.onClick && 'cursor-pointer hover:shadow-md active:scale-95 tap-target'
          )}
          onClick={stat.onClick}
          role={stat.onClick ? 'button' : undefined}
          tabIndex={stat.onClick ? 0 : undefined}
          onKeyDown={(e) => {
            if (stat.onClick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              stat.onClick()
            }
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {stat.label}
            </span>
            {stat.icon && (
              <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                {stat.icon}
              </div>
            )}
          </div>

          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {stat.value}
          </div>

          {stat.change && (
            <div className={cn(
              'text-xs flex items-center gap-1',
              stat.change.type === 'increase' && 'text-green-600 dark:text-green-400',
              stat.change.type === 'decrease' && 'text-red-600 dark:text-red-400',
              stat.change.type === 'neutral' && 'text-gray-500 dark:text-gray-400'
            )}>
              <span>
                {stat.change.type === 'increase' ? '↗' : stat.change.type === 'decrease' ? '↘' : '→'}
              </span>
              <span>
                {Math.abs(stat.change.value)}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Dashboard content prioritization wrapper
interface PrioritizedContentProps {
  children: React.ReactNode
  priority: 'critical' | 'high' | 'medium' | 'low'
  className?: string
}

export function PrioritizedContent({
  children,
  priority,
  className
}: PrioritizedContentProps) {
  const priorityOrder = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  }

  return (
    <div
      className={className}
      style={{ order: priorityOrder[priority] }}
      data-priority={priority}
    >
      {children}
    </div>
  )
}