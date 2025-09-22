import React from 'react'
import { X, User, Calendar, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterChip {
  key: string
  label: string
  value: string
  icon?: React.ReactNode
  onRemove: () => void
}

interface FilterChipsProps {
  filters: FilterChip[]
  onClearAll?: () => void
  className?: string
}

export function FilterChips({ filters, onClearAll, className }: FilterChipsProps) {
  if (filters.length === 0) {
    return null
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Active filters:
      </span>

      {filters.map((filter) => (
        <div
          key={filter.key}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-full text-sm text-primary-700 dark:text-primary-300"
        >
          {filter.icon && (
            <span className="flex-shrink-0">
              {filter.icon}
            </span>
          )}
          <span className="font-medium">
            {filter.label}:
          </span>
          <span>
            {filter.value}
          </span>
          <button
            onClick={filter.onRemove}
            className="flex-shrink-0 ml-1 p-0.5 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-full transition-colors"
            aria-label={`Remove ${filter.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {filters.length > 1 && onClearAll && (
        <button
          onClick={onClearAll}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <X className="h-3 w-3" />
          Clear all
        </button>
      )}
    </div>
  )
}

// Helper function to get appropriate icon for filter type
export function getFilterIcon(filterKey: string): React.ReactNode {
  const iconClass = "h-3 w-3"

  switch (filterKey) {
    case 'client_id':
      return <User className={iconClass} />
    case 'status':
      return <FileText className={iconClass} />
    case 'date_from':
    case 'date_to':
      return <Calendar className={iconClass} />
    default:
      return null
  }
}