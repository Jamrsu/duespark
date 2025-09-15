/**
 * Enhanced form validation utilities
 */

import { z } from 'zod'

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/, // International phone format
  url: /^https?:\/\/.+/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  currency: /^\d+(\.\d{1,2})?$/, // Currency format (e.g., 123.45)
  zipCode: /^\d{5}(-\d{4})?$/, // US ZIP code
  creditCard: /^\d{13,19}$/, // Credit card number
  ssn: /^\d{3}-?\d{2}-?\d{4}$/, // US SSN
}

// Enhanced error messages with context
export const ValidationMessages = {
  required: (field: string) => `${field} is required`,
  email: (field: string) => `Please enter a valid ${field.toLowerCase()} address`,
  minLength: (field: string, min: number) => `${field} must be at least ${min} characters long`,
  maxLength: (field: string, max: number) => `${field} must be no more than ${max} characters long`,
  min: (field: string, min: number) => `${field} must be at least ${min}`,
  max: (field: string, max: number) => `${field} must be no more than ${max}`,
  pattern: (field: string, description: string) => `${field} ${description}`,
  strongPassword: () => 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character',
  passwordMatch: () => 'Passwords do not match',
  uniqueEmail: () => 'This email address is already in use',
  validUrl: (field: string) => `Please enter a valid ${field.toLowerCase()} URL`,
  validPhone: (field: string) => `Please enter a valid ${field.toLowerCase()} number`,
  validCurrency: (field: string) => `Please enter a valid ${field.toLowerCase()} amount (e.g., 123.45)`,
  futureDate: (field: string) => `${field} must be a future date`,
  pastDate: (field: string) => `${field} must be a past date`,
}

// Reusable Zod schemas with enhanced validation
export const CommonSchemas = {
  // Email with contextual messages
  email: (fieldName: string = 'Email') =>
    z.string()
      .min(1, ValidationMessages.required(fieldName))
      .email(ValidationMessages.email(fieldName))
      .max(254, ValidationMessages.maxLength(fieldName, 254)), // RFC compliant max length

  // Strong password validation
  password: (fieldName: string = 'Password') =>
    z.string()
      .min(8, ValidationMessages.minLength(fieldName, 8))
      .regex(ValidationPatterns.strongPassword, ValidationMessages.strongPassword()),

  // Phone number with international support
  phone: (fieldName: string = 'Phone number') =>
    z.string()
      .optional()
      .refine(
        (val) => !val || ValidationPatterns.phone.test(val),
        { message: ValidationMessages.validPhone(fieldName) }
      ),

  // URL validation
  url: (fieldName: string = 'URL', required: boolean = false) => {
    const base = z.string().url(ValidationMessages.validUrl(fieldName))
    return required ? base.min(1, ValidationMessages.required(fieldName)) : base.optional()
  },

  // Currency validation
  currency: (fieldName: string = 'Amount', min?: number, max?: number) => {
    const baseSchema = z.string()
      .min(1, ValidationMessages.required(fieldName))
      .regex(ValidationPatterns.currency, ValidationMessages.validCurrency(fieldName))
      .transform((val) => parseFloat(val))

    if (min !== undefined && max !== undefined) {
      return baseSchema.refine((val) => val >= min && val <= max, {
        message: `${fieldName} must be between ${min} and ${max}`
      })
    } else if (min !== undefined) {
      return baseSchema.refine((val) => val >= min, {
        message: ValidationMessages.min(fieldName, min)
      })
    } else if (max !== undefined) {
      return baseSchema.refine((val) => val <= max, {
        message: ValidationMessages.max(fieldName, max)
      })
    }

    return baseSchema
  },

  // Date validation with future/past constraints
  date: (fieldName: string = 'Date', constraint?: 'future' | 'past') => {
    const baseSchema = z.string()
      .min(1, ValidationMessages.required(fieldName))
      .transform((val) => new Date(val))
      .refine((date) => !isNaN(date.getTime()), {
        message: `Please enter a valid ${fieldName.toLowerCase()}`
      })

    if (constraint === 'future') {
      return baseSchema.refine((date) => date > new Date(), {
        message: ValidationMessages.futureDate(fieldName)
      })
    } else if (constraint === 'past') {
      return baseSchema.refine((date) => date < new Date(), {
        message: ValidationMessages.pastDate(fieldName)
      })
    }

    return baseSchema
  },

  // Required string with length constraints
  requiredString: (fieldName: string, minLength: number = 1, maxLength: number = 255) =>
    z.string()
      .min(minLength, minLength === 1
        ? ValidationMessages.required(fieldName)
        : ValidationMessages.minLength(fieldName, minLength)
      )
      .max(maxLength, ValidationMessages.maxLength(fieldName, maxLength)),

  // Optional string with length constraints
  optionalString: (fieldName: string, maxLength: number = 255) =>
    z.string()
      .max(maxLength, ValidationMessages.maxLength(fieldName, maxLength))
      .optional(),

  // Numeric validation
  number: (fieldName: string, min?: number, max?: number) => {
    let schema = z.number({
      required_error: ValidationMessages.required(fieldName),
      invalid_type_error: `${fieldName} must be a number`
    })

    if (min !== undefined) {
      schema = schema.min(min, ValidationMessages.min(fieldName, min))
    }

    if (max !== undefined) {
      schema = schema.max(max, ValidationMessages.max(fieldName, max))
    }

    return schema
  },
}

// Form validation state management
export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid'

export interface FieldValidationResult {
  isValid: boolean
  error?: string
  state: ValidationState
}

// Async validation helper
export const createAsyncValidator = <T>(
  validator: (value: T) => Promise<boolean>,
  errorMessage: string,
  debounceMs: number = 500
) => {
  let timeoutId: NodeJS.Timeout

  return (value: T): Promise<FieldValidationResult> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId)

      if (!value) {
        resolve({ isValid: true, state: 'idle' })
        return
      }

      // Set validating state immediately
      resolve({ isValid: true, state: 'validating' })

      timeoutId = setTimeout(async () => {
        try {
          const isValid = await validator(value)
          resolve({
            isValid,
            error: isValid ? undefined : errorMessage,
            state: isValid ? 'valid' : 'invalid'
          })
        } catch (error) {
          resolve({
            isValid: false,
            error: errorMessage,
            state: 'invalid'
          })
        }
      }, debounceMs)
    })
  }
}

// Password confirmation validator
export const createPasswordConfirmation = (passwordField: string) =>
  z.object({
    [passwordField]: z.string(),
    confirmPassword: z.string()
  }).refine(
    (data) => data[passwordField as keyof typeof data] === data.confirmPassword,
    {
      message: ValidationMessages.passwordMatch(),
      path: ['confirmPassword']
    }
  )

// Cross-field validation helpers
export const createConditionalField = <T>(
  condition: (data: any) => boolean,
  schema: z.ZodSchema<T>,
  fieldName: string
) => {
  return z.any().superRefine((data, ctx) => {
    if (condition(data)) {
      const result = schema.safeParse(data[fieldName])
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({
            ...issue,
            path: [fieldName, ...issue.path]
          })
        })
      }
    }
  })
}

// Form-level validation utilities
export const validateFormStep = async <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ isValid: boolean; errors: Record<string, string>; data?: T }> => {
  try {
    const validatedData = await schema.parseAsync(data)
    return { isValid: true, errors: {}, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.reduce((acc, issue) => {
        const path = issue.path.join('.')
        acc[path] = issue.message
        return acc
      }, {} as Record<string, string>)
      return { isValid: false, errors }
    }
    return { isValid: false, errors: { form: 'Validation failed' } }
  }
}

// Note: Real-time validation hook should be implemented in a separate hooks file
// This is just the type definition for reference
export type UseFieldValidationHook = <T>(
  value: T,
  validator: (value: T) => Promise<FieldValidationResult>,
  dependencies?: any[]
) => FieldValidationResult

// Export common validation schemas for reuse
export { z } from 'zod'