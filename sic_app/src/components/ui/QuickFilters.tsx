import React from 'react'
import { AlertTriangle, Clock, CheckCircle, Calendar, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickFilter {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  filters: {
    client_id?: string
    status?: string
    date_from?: string
    date_to?: string
    sortBy?: string
  }
  isActive?: boolean
}

interface QuickFiltersProps {
  onFilterSelect: (filters: QuickFilter['filters']) => void
  activeFilters: {
    client_id: string
    status: string
    date_from: string
    date_to: string
    sortBy: string
  }
  className?: string
}

export function QuickFilters({ onFilterSelect, activeFilters, className }: QuickFiltersProps) {
  // Generate date strings for "This Month"
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const quickFilters: QuickFilter[] = [
    {
      id: 'overdue',
      label: 'Overdue',
      icon: <AlertTriangle className="h-4 w-4" />,
      description: 'Show overdue invoices',
      filters: {
        status: 'overdue',
        sortBy: 'date_oldest'
      }
    },
    {
      id: 'unpaid',
      label: 'Unpaid',
      icon: <Clock className="h-4 w-4" />,
      description: 'Show pending invoices',
      filters: {
        status: 'pending',
        sortBy: 'date_oldest'
      }
    },
    {
      id: 'paid',
      label: 'Paid',
      icon: <CheckCircle className="h-4 w-4" />,
      description: 'Show paid invoices',
      filters: {
        status: 'paid',
        sortBy: 'date_newest'
      }
    },
    {
      id: 'this_month',
      label: 'This Month',
      icon: <Calendar className="h-4 w-4" />,
      description: 'Show invoices from this month',
      filters: {
        date_from: formatDate(firstDayOfMonth),
        date_to: formatDate(lastDayOfMonth),
        sortBy: 'date_newest'
      }
    },
    {
      id: 'high_value',
      label: 'High Value',
      icon: <DollarSign className="h-4 w-4" />,
      description: 'Sort by amount (high to low)',
      filters: {
        sortBy: 'amount_high_to_low'
      }
    }
  ]

  // Check if a quick filter is currently active
  const isQuickFilterActive = (quickFilter: QuickFilter) => {
    const { filters } = quickFilter

    // Check each filter property
    if (filters.status && activeFilters.status !== filters.status) return false
    if (filters.date_from && activeFilters.date_from !== filters.date_from) return false
    if (filters.date_to && activeFilters.date_to !== filters.date_to) return false
    if (filters.sortBy && activeFilters.sortBy !== filters.sortBy) return false

    // If we have status, date_from, or date_to filters, make sure other filters are empty
    if (filters.status || filters.date_from || filters.date_to) {
      if (filters.status && (activeFilters.client_id || activeFilters.date_from || activeFilters.date_to)) {
        if (filters.status && !filters.date_from && !filters.date_to) {
          return activeFilters.status === filters.status && !activeFilters.client_id && !activeFilters.date_from && !activeFilters.date_to
        }
      }
      if (filters.date_from || filters.date_to) {
        return activeFilters.date_from === (filters.date_from || '') &&
               activeFilters.date_to === (filters.date_to || '') &&
               !activeFilters.client_id &&
               !activeFilters.status
      }
    }

    // For sort-only filters, just check if the sort matches
    if (filters.sortBy && !filters.status && !filters.date_from && !filters.date_to) {
      return activeFilters.sortBy === filters.sortBy
    }

    return false
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Quick Filters
        </h4>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickFilters.map((filter) => {
          const isActive = isQuickFilterActive(filter)

          return (
            <button
              key={filter.id}
              onClick={() => onFilterSelect(filter.filters)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200',
                'text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
              )}
              title={filter.description}
            >
              <span className={cn(
                'transition-colors',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}>
                {filter.icon}
              </span>
              {filter.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}