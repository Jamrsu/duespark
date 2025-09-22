import React, { useState, useRef, useEffect } from 'react'
import { ArrowUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SortOption {
  value: string
  label: string
}

interface SortDropdownProps {
  value: string
  onChange: (value: string) => void
  options: SortOption[]
  className?: string
}

export function SortDropdown({ value, onChange, options, className }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <ArrowUpDown className="h-4 w-4" />
        <span className="hidden sm:inline">Sort:</span>
        <span className="text-gray-900 dark:text-gray-100">
          {selectedOption?.label || 'Select sort'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
          <div className="py-2">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between',
                  value === option.value
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-gray-700 dark:text-gray-300'
                )}
              >
                <span>{option.label}</span>
                {value === option.value && (
                  <Check className="h-4 w-4" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}