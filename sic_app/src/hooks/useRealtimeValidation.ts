import { useState, useEffect, useCallback, useRef } from 'react'
import { z } from 'zod'

export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid'

interface UseRealtimeValidationOptions<T> {
  schema: z.ZodSchema<T>
  value: any
  debounceMs?: number
  validateOnMount?: boolean
  asyncValidator?: (value: T) => Promise<boolean>
}

export function useRealtimeValidation<T>({
  schema,
  value,
  debounceMs = 300,
  validateOnMount = false,
  asyncValidator
}: UseRealtimeValidationOptions<T>) {
  const [validationState, setValidationState] = useState<ValidationState>('idle')
  const [error, setError] = useState<string | undefined>(undefined)
  const [isValidating, setIsValidating] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()
  const asyncValidationRef = useRef<number>(0)

  const validate = useCallback(async (inputValue: any) => {
    const validationId = ++asyncValidationRef.current

    try {
      setValidationState('validating')
      setIsValidating(true)
      setError(undefined)

      // First, validate with Zod schema
      const parsedValue = schema.parse(inputValue)

      // If async validator is provided, run it
      if (asyncValidator && validationId === asyncValidationRef.current) {
        const isAsyncValid = await asyncValidator(parsedValue)

        // Check if this is still the latest validation
        if (validationId === asyncValidationRef.current) {
          if (isAsyncValid) {
            setValidationState('valid')
            setError(undefined)
          } else {
            setValidationState('invalid')
            setError('This value is not available')
          }
        }
      } else {
        // Only sync validation
        if (validationId === asyncValidationRef.current) {
          setValidationState('valid')
          setError(undefined)
        }
      }
    } catch (err) {
      if (validationId === asyncValidationRef.current) {
        if (err instanceof z.ZodError) {
          setValidationState('invalid')
          setError(err.errors[0]?.message || 'Invalid value')
        } else {
          setValidationState('invalid')
          setError('Validation failed')
        }
      }
    } finally {
      if (validationId === asyncValidationRef.current) {
        setIsValidating(false)
      }
    }
  }, [schema, asyncValidator])

  const debouncedValidate = useCallback((inputValue: any) => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Don't validate empty values unless required
    if (!inputValue || inputValue === '') {
      setValidationState('idle')
      setError(undefined)
      setIsValidating(false)
      return
    }

    // Set up new timeout
    debounceRef.current = setTimeout(() => {
      validate(inputValue)
    }, debounceMs)
  }, [validate, debounceMs])

  useEffect(() => {
    if (validateOnMount) {
      validate(value)
    } else {
      debouncedValidate(value)
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [value, debouncedValidate, validate, validateOnMount])

  return {
    validationState,
    error,
    isValidating,
    validate: () => validate(value),
    reset: () => {
      setValidationState('idle')
      setError(undefined)
      setIsValidating(false)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }
}

// Hook for form-wide validation summary
export function useFormValidationSummary(fields: Record<string, { error?: string; validationState: ValidationState }>) {
  const [summary, setSummary] = useState({
    isValid: false,
    hasErrors: false,
    isValidating: false,
    errorCount: 0,
    fieldCount: Object.keys(fields).length
  })

  useEffect(() => {
    const fieldValues = Object.values(fields)
    const hasErrors = fieldValues.some(field => field.error)
    const isValidating = fieldValues.some(field => field.validationState === 'validating')
    const errorCount = fieldValues.filter(field => field.error).length
    const validCount = fieldValues.filter(field => field.validationState === 'valid').length
    const isValid = !hasErrors && validCount === fieldValues.length && !isValidating

    setSummary({
      isValid,
      hasErrors,
      isValidating,
      errorCount,
      fieldCount: fieldValues.length
    })
  }, [fields])

  return summary
}