import React, { useState } from 'react'
import { Card, CardContent } from './Card'
import { cn, formatCurrency } from '@/lib/utils'

interface RevenueBreakdown {
  currency: string
  earned_revenue: number
  outstanding_revenue: number
  total_revenue: number
}

interface KPICardProps {
  title: string
  value: number | string | React.ReactNode
  subtitle?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
    period: string
  }
  format?: 'number' | 'currency' | 'percentage'
  currency?: string
  icon?: React.ReactNode | React.ComponentType<any>
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray'
  className?: string
  onClick?: () => void
  loading?: boolean
  change?: number
  showMobileActions?: boolean
  quickActions?: Array<{
    label: string
    icon: React.ReactNode
    action: () => void
    color?: string
  }>
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  format = 'number',
  currency = 'USD',
  icon,
  color = 'blue',
  className,
  onClick,
  loading = false,
  change,
  showMobileActions = false,
  quickActions = [],
}: KPICardProps) {
  const [showActions, setShowActions] = useState(false)
  const formatValue = (val: number | string | React.ReactNode) => {
    if (typeof val === 'string') return val
    if (typeof val === 'number') {
      switch (format) {
        case 'currency':
          return formatCurrency(val, currency)
        case 'percentage':
          return `${val}%`
        default:
          return val.toLocaleString()
      }
    }
    // Return React node as-is
    return val
  }

  const colorClasses = {
    blue: 'text-primary-600 dark:text-primary-400',
    green: 'text-success-600 dark:text-success-400',
    yellow: 'text-warning-600 dark:text-warning-400',
    red: 'text-error-600 dark:text-error-400',
    gray: 'text-gray-600 dark:text-gray-400',
  }

  if (loading) {
    return (
      <Card className={cn('transition-all duration-200 h-full', className)}>
        <CardContent className="p-4 h-full flex flex-col justify-start min-h-[100px]">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="loading-shimmer h-4 w-20 mb-2" data-testid="loading-shimmer" />
              <div className="loading-shimmer h-8 w-24" />
            </div>
            {icon && (
              <div className="flex-shrink-0 ml-3">
                <div className="loading-shimmer h-6 w-6 rounded" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderIcon = () => {
    if (!icon) return null
    
    if (typeof icon === 'function') {
      const IconComponent = icon as React.ComponentType<any>
      return <IconComponent className="h-6 w-6" />
    }
    
    return icon
  }

  return (
    <div className="relative group">
      <Card
        className={cn(
          'transition-all duration-200 h-full',
          onClick && 'cursor-pointer hover:shadow-md',
          'touch-pan-y',
          showMobileActions && 'md:hover:scale-[1.02]',
          className
        )}
        onClick={onClick}
        onTouchStart={() => showMobileActions && setShowActions(true)}
        onTouchEnd={() => showMobileActions && setTimeout(() => setShowActions(false), 3000)}
      >
        <CardContent className="p-4 h-full flex flex-col justify-start min-h-[100px]">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-lg sm:text-xl font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </p>

              <div className="mt-1 flex items-baseline">
                <p className={cn(
                  'font-bold text-gray-900 dark:text-gray-100',
                  'text-xl sm:text-2xl lg:text-2xl'
                )}>
                  {formatValue(value)}
                </p>

                {(trend || change !== undefined) && (
                  <div className="ml-2 flex items-center">
                    <span
                      className={cn(
                        'text-sm sm:text-base font-medium',
                        (trend?.direction === 'up' || (change !== undefined && change > 0))
                          ? 'text-success-600 dark:text-success-400'
                          : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {change !== undefined ? (
                        `${change > 0 ? '+' : ''}${change}%`
                      ) : trend ? (
                        `${trend.direction === 'up' ? '↗' : '↘'} ${Math.abs(trend.value)}%`
                      ) : null}
                    </span>
                  </div>
                )}
              </div>

              {subtitle && (
                <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400 truncate">
                  {subtitle}
                </p>
              )}

              {trend?.period && (
                <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                  vs {trend.period}
                </p>
              )}
            </div>

            {icon && (
              <div className={cn('flex-shrink-0 ml-3', colorClasses[color])}>
                {renderIcon()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mobile Quick Actions */}
      {showMobileActions && quickActions.length > 0 && (
        <div className={cn(
          'absolute top-2 right-2 flex gap-1 transition-opacity duration-200',
          'md:opacity-0 md:group-hover:opacity-100',
          showActions ? 'opacity-100' : 'opacity-0 md:opacity-0'
        )}>
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                action.action()
              }}
              className={cn(
                'p-2 rounded-full text-white shadow-md transition-all duration-200',
                'hover:scale-110 active:scale-95',
                action.color || 'bg-primary-700 hover:bg-primary-800'
              )}
              title={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Preset KPI cards for common use cases
export function RevenueKPICard({
  earnedRevenue,
  outstandingRevenue,
  currency = 'USD',
  className,
  onClick,
  showMobileActions,
  quickActions,
  isMixedCurrency = false,
  currencyBreakdown = []
}: {
  earnedRevenue: number
  outstandingRevenue: number
  currency?: string
  className?: string
  onClick?: () => void
  showMobileActions?: boolean
  quickActions?: Array<{
    label: string
    icon: React.ReactNode
    action: () => void
    color?: string
  }>
  isMixedCurrency?: boolean
  currencyBreakdown?: RevenueBreakdown[]
}) {
  const totalRevenue = earnedRevenue + outstandingRevenue
  const displayCurrency = currency?.toUpperCase?.() || currency
  const hasBreakdown = isMixedCurrency && currencyBreakdown.length > 0

  if (hasBreakdown) {
    return (
      <Card
        className={cn(
          'transition-all duration-200 h-full',
          className
        )}
      >
        <CardContent className="p-4 h-full flex flex-col justify-start min-h-[100px]">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-lg sm:text-xl font-medium text-gray-500 dark:text-gray-400 truncate">
                Total Revenue
              </p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100 text-base">
                Multiple currencies detected
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Totals are shown per currency to avoid mixing exchange rates.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {currencyBreakdown.map((breakdown) => {
              const code = breakdown.currency?.toUpperCase?.() || 'USD'
              return (
                <div
                  key={code}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                      {code}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(breakdown.total_revenue, code)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <span className="text-success-600 dark:text-success-400 flex items-center justify-between sm:justify-start sm:gap-2">
                      <span className="font-medium">Earned</span>
                      <span>{formatCurrency(breakdown.earned_revenue, code)}</span>
                    </span>
                    <span className="text-yellow-600 dark:text-yellow-400 flex items-center justify-between sm:justify-end sm:gap-2">
                      <span className="font-medium">Outstanding</span>
                      <span>{formatCurrency(breakdown.outstanding_revenue, code)}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative group">
      <Card
        className={cn(
          'transition-all duration-200 h-full',
          onClick && 'cursor-pointer hover:shadow-md',
          'touch-pan-y',
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-4 h-full flex flex-col justify-start min-h-[100px]">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-lg sm:text-xl font-medium text-gray-500 dark:text-gray-400 truncate">
                Total Revenue
              </p>

              <div className="mt-1 flex items-baseline">
                <p className={cn(
                  'font-bold text-gray-900 dark:text-gray-100',
                  'text-xl sm:text-2xl lg:text-2xl'
                )}>
                  {formatCurrency(totalRevenue, displayCurrency)}
                </p>
              </div>

              {/* Dual values breakdown */}
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-success-600 dark:text-success-400 font-medium">
                    Earned
                  </span>
                  <span className="text-success-600 dark:text-success-400 font-medium">
                    {formatCurrency(earnedRevenue, displayCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    Outstanding
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    {formatCurrency(outstandingRevenue, displayCurrency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 ml-3 text-green-600 dark:text-green-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Quick Actions */}
      {showMobileActions && quickActions && quickActions.length > 0 && (
        <div className={cn(
          'absolute top-2 right-2 flex gap-1 transition-opacity duration-200',
          'md:opacity-0 md:group-hover:opacity-100',
          'opacity-0 md:opacity-0'
        )}>
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                action.action()
              }}
              className={cn(
                'p-2 rounded-full text-white shadow-md transition-all duration-200',
                'hover:scale-110 active:scale-95',
                action.color || 'bg-primary-700 hover:bg-primary-800'
              )}
              title={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function InvoiceCountKPICard({
  value,
  trend,
  subtitle,
  className,
  onClick,
  showMobileActions,
  quickActions
}: {
  value: number
  trend?: KPICardProps['trend']
  subtitle?: string
  className?: string
  onClick?: () => void
  showMobileActions?: boolean
  quickActions?: Array<{
    label: string
    icon: React.ReactNode
    action: () => void
    color?: string
  }>
}) {
  return (
    <KPICard
      title="Total Invoices"
      value={value}
      subtitle={subtitle}
      color="blue"
      trend={trend}
      className={className}
      onClick={onClick}
      showMobileActions={showMobileActions}
      quickActions={quickActions}
      icon={
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
    />
  )
}

export function OverdueKPICard({
  value,
  amount,
  currency = 'USD',
  className,
  onClick,
  showMobileActions,
  quickActions
}: {
  value: number
  amount?: number
  currency?: string
  className?: string
  onClick?: () => void
  showMobileActions?: boolean
  quickActions?: Array<{
    label: string
    icon: React.ReactNode
    action: () => void
    color?: string
  }>
}) {
  return (
    <KPICard
      title="Overdue Invoices"
      value={value}
      subtitle={amount ? formatCurrency(amount, currency) : undefined}
      color="red"
      className={className}
      onClick={onClick}
      showMobileActions={showMobileActions}
      quickActions={quickActions}
      icon={
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      }
    />
  )
}
