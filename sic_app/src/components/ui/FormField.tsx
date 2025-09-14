import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useFormAnnouncements } from './ScreenReaderAnnouncer'

export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid'

interface FormFieldProps {
  children: React.ReactNode
  label: string
  error?: string
  validationState?: ValidationState
  helpText?: string
  required?: boolean
  className?: string
  icon?: React.ReactNode
}

export function FormField({
  children,
  label,
  error,
  validationState = 'idle',
  helpText,
  required = false,
  className,
  icon
}: FormFieldProps) {
  const [showValidation, setShowValidation] = useState(false)
  const { announceValidationError } = useFormAnnouncements()

  useEffect(() => {
    if (validationState === 'valid' || validationState === 'invalid') {
      setShowValidation(true)
    } else {
      setShowValidation(false)
    }
  }, [validationState])

  useEffect(() => {
    if (error && validationState === 'invalid') {
      announceValidationError(label, error)
    }
  }, [error, validationState, label, announceValidationError])

  const getValidationIcon = () => {
    switch (validationState) {
      case 'validating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getFieldClassName = () => {
    const baseClasses = 'block w-full px-3 py-3 border rounded-lg shadow-sm focus:ring-2 transition-all duration-200 tap-target'

    switch (validationState) {
      case 'valid':
        return cn(baseClasses, 'border-green-300 bg-green-50 dark:bg-green-900/20 focus:ring-green-500 focus:border-green-500')
      case 'invalid':
        return cn(baseClasses, 'border-red-300 bg-red-50 dark:bg-red-900/20 focus:ring-red-500 focus:border-red-500')
      case 'validating':
        return cn(baseClasses, 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 focus:ring-blue-500 focus:border-blue-500')
      default:
        return cn(baseClasses, 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-primary-500 focus:border-primary-500')
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {icon && <span className="inline-block mr-1">{icon}</span>}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          className: getFieldClassName()
        })}

        {showValidation && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {getValidationIcon()}
          </div>
        )}
      </div>

      {helpText && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        </div>
      )}
    </div>
  )
}

interface FormSectionProps {
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function FormSection({
  title,
  description,
  icon,
  children,
  className
}: FormSectionProps) {
  return (
    <div className={cn('space-y-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}

interface FormActionsProps {
  children: React.ReactNode
  className?: string
}

export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-3 sm:justify-end pt-6 border-t border-gray-200 dark:border-gray-700', className)}>
      {children}
    </div>
  )
}