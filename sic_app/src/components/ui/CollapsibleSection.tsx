import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  className
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn('border border-gray-200 dark:border-gray-700 rounded-lg', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {title}
          </span>
        </div>
        <div className="flex-shrink-0">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}