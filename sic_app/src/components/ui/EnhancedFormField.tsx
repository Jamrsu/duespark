/**
 * Enhanced Form Field Component
 * Provides real-time validation, better error messaging, and improved accessibility
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Info } from 'lucide-react'
import { useAccessibility } from './AccessibilityProvider'

export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid'
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'

interface EnhancedFormFieldProps {
  label: string
  name: string
  type?: InputType
  value?: string
  placeholder?: string
  error?: string
  validationState?: ValidationState
  helpText?: string
  required?: boolean
  disabled?: boolean
  className?: string
  inputClassName?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  autoComplete?: string
  maxLength?: number
  minLength?: number
  pattern?: string

  // Validation props
  showValidationIcon?: boolean
  validateOnBlur?: boolean
  validateOnChange?: boolean
  debounceValidation?: number

  // Callbacks
  onChange?: (value: string, name: string) => void
  onBlur?: (value: string, name: string) => void
  onValidate?: (value: string, name: string) => Promise<string | null> | string | null

  // Accessibility
  ariaDescribedBy?: string
  ariaInvalid?: boolean
}

export function EnhancedFormField({
  label,
  name,
  type = 'text',
  value = '',
  placeholder,
  error,
  validationState = 'idle',
  helpText,
  required = false,
  disabled = false,
  className,
  inputClassName,
  leftIcon,
  rightIcon,
  autoComplete,
  maxLength,
  minLength,
  pattern,
  showValidationIcon = true,
  validateOnBlur = true,
  validateOnChange = false,
  debounceValidation = 300,
  onChange,
  onBlur,
  onValidate,
  ariaDescribedBy,
  ariaInvalid,
  ...props
}: EnhancedFormFieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onBlur' | 'value' | 'name' | 'type'>) {
  const [showPassword, setShowPassword] = useState(false)
  const [internalValue, setInternalValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const [hasUserInput, setHasUserInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const validationTimeoutRef = useRef<NodeJS.Timeout>()
  const { announceFormError, isReducedMotion } = useAccessibility()

  const fieldId = `field-${name}`
  const errorId = `${fieldId}-error`
  const helpId = `${fieldId}-help`
  const describedBy = [
    ariaDescribedBy,
    helpText && helpId,
    error && errorId
  ].filter(Boolean).join(' ')

  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value)
  }, [value])

  // Announce errors to screen readers
  useEffect(() => {
    if (error && validationState === 'invalid' && hasUserInput) {
      announceFormError(label, error)
    }
  }, [error, validationState, hasUserInput, label, announceFormError])

  const runValidation = useCallback(async (val: string) => {
    if (!onValidate) return

    try {
      const result = await onValidate(val, name)
      return result
    } catch (err) {
      return 'Validation failed'
    }
  }, [onValidate, name])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    setHasUserInput(true)

    onChange?.(newValue, name)

    // Real-time validation with debouncing
    if (validateOnChange && onValidate) {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }

      validationTimeoutRef.current = setTimeout(async () => {
        await runValidation(newValue)
      }, debounceValidation)
    }
  }, [onChange, name, validateOnChange, onValidate, runValidation, debounceValidation])

  const handleBlur = useCallback(async (e: React.FocusEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setIsFocused(false)
    setHasUserInput(true)

    onBlur?.(newValue, name)

    // Validation on blur
    if (validateOnBlur && onValidate) {
      await runValidation(newValue)
    }
  }, [onBlur, name, validateOnBlur, onValidate, runValidation])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const getValidationIcon = () => {
    if (!showValidationIcon || validationState === 'idle') return null

    switch (validationState) {
      case 'validating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" aria-label="Validating" />
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" aria-label="Valid" />
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" aria-label="Invalid" />
      default:
        return null
    }
  }

  const getInputClassName = () => {
    const baseClasses = cn(
      'block w-full px-3 py-3 min-h-[44px] rounded-lg border transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-1',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800',
      'placeholder:text-gray-400 dark:placeholder:text-gray-500',
      'text-gray-900 dark:text-gray-100',
      leftIcon && 'pl-10',
      (rightIcon || showValidationIcon || type === 'password') && 'pr-10'
    )

    const stateClasses = {
      idle: cn(
        'border-gray-300 dark:border-gray-600',
        'bg-white dark:bg-gray-700',
        'focus:ring-primary-500 focus:border-primary-500'
      ),
      validating: cn(
        'border-blue-300 dark:border-blue-500',
        'bg-blue-50 dark:bg-blue-900/20',
        'focus:ring-blue-500 focus:border-blue-500'
      ),
      valid: cn(
        'border-green-300 dark:border-green-500',
        'bg-green-50 dark:bg-green-900/20',
        'focus:ring-green-500 focus:border-green-500'
      ),
      invalid: cn(
        'border-red-300 dark:border-red-500',
        'bg-red-50 dark:bg-red-900/20',
        'focus:ring-red-500 focus:border-red-500'
      )
    }

    const focusClasses = isFocused ? 'ring-2' : ''

    return cn(baseClasses, stateClasses[validationState], focusClasses, inputClassName)
  }

  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        )}
      </label>

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">
              {leftIcon}
            </span>
          </div>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          id={fieldId}
          name={name}
          type={inputType}
          value={internalValue}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          required={required}
          disabled={disabled}
          className={getInputClassName()}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          aria-describedby={describedBy || undefined}
          aria-invalid={ariaInvalid || (validationState === 'invalid' ? true : undefined)}
          aria-required={required}
          {...props}
        />

        {/* Right Icons */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {/* Password toggle */}
          {type === 'password' && (
            <button
              type="button"
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={0}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              )}
            </button>
          )}

          {/* Custom right icon (when not password field) */}
          {rightIcon && type !== 'password' && (
            <span className="text-gray-400 dark:text-gray-500 pointer-events-none mr-2" aria-hidden="true">
              {rightIcon}
            </span>
          )}

          {/* Validation icon */}
          {getValidationIcon()}
        </div>
      </div>

      {/* Character count (if maxLength is set) */}
      {maxLength && (
        <div className="flex justify-end">
          <span className={cn(
            'text-xs',
            internalValue.length > maxLength * 0.9 ? 'text-orange-500' : 'text-gray-400'
          )}>
            {internalValue.length}/{maxLength}
          </span>
        </div>
      )}

      {/* Help text */}
      {helpText && !error && (
        <div className="flex items-start gap-2">
          <Info className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
          <p id={helpId} className="text-sm text-gray-500 dark:text-gray-400">
            {helpText}
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          className={cn(
            'flex items-start gap-2 transition-all duration-200',
            !isReducedMotion && 'animate-in slide-in-from-left-2'
          )}
        >
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        </div>
      )}

      {/* Success message for valid state */}
      {validationState === 'valid' && !error && (
        <div
          className={cn(
            'flex items-start gap-2 transition-all duration-200',
            !isReducedMotion && 'animate-in slide-in-from-left-2'
          )}
        >
          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-green-600 dark:text-green-400">
            Looks good!
          </p>
        </div>
      )}
    </div>
  )
}