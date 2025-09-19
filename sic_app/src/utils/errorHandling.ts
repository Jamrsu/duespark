/**
 * Centralized error handling utility for consistent user-friendly messages
 */

import { toast } from 'react-hot-toast'
import { monitoring } from './monitoring'

// Error categories for different types of user-facing messages
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  SERVER = 'server',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',        // Info/warning level
  MEDIUM = 'medium',  // User action required
  HIGH = 'high',      // Critical error
  CRITICAL = 'critical' // System failure
}

interface ErrorContext {
  operation?: string
  component?: string
  userId?: string | number
  retryCount?: number
  timestamp?: Date
}

interface StandardError {
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  technicalMessage?: string
  userAction?: string
  canRetry?: boolean
  retryAfter?: number
}

class ErrorHandler {
  private errorMap: Map<string, StandardError> = new Map()

  constructor() {
    this.initializeErrorMappings()
  }

  private initializeErrorMappings() {
    // Network errors
    this.errorMap.set('NETWORK_ERROR', {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message: 'Connection issue detected. Retrying automatically...',
      userAction: 'Please check your internet connection. We\'ll keep trying.',
      canRetry: true,
      retryAfter: 2000
    })

    this.errorMap.set('CORS_ERROR', {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      message: 'Connection configuration error',
      technicalMessage: 'CORS policy blocked the request',
      userAction: 'Please refresh the page. If the issue persists, try clearing your browser cache.',
      canRetry: true
    })

    this.errorMap.set('TIMEOUT_ERROR', {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message: 'Request timed out. Retrying...',
      userAction: 'This usually resolves automatically. Please wait a moment.',
      canRetry: true,
      retryAfter: 3000
    })

    // Authentication errors
    this.errorMap.set('UNAUTHORIZED', {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      message: 'Your session has expired',
      userAction: 'Please sign in again to continue.',
      canRetry: false
    })

    this.errorMap.set('INVALID_CREDENTIALS', {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      message: 'Email or password is incorrect',
      userAction: 'Please check your email and password and try again.',
      canRetry: false
    })

    this.errorMap.set('TOKEN_EXPIRED', {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      message: 'Session expired. Redirecting to login...',
      userAction: 'You will be automatically redirected to the login page.',
      canRetry: false
    })

    // Validation errors
    this.errorMap.set('VALIDATION_FAILED', {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      message: 'Please check the highlighted fields',
      userAction: 'Correct the errors and try again.',
      canRetry: false
    })

    this.errorMap.set('EMAIL_INVALID', {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      message: 'Please enter a valid email address',
      userAction: 'Check the email format (example: user@domain.com)',
      canRetry: false
    })

    this.errorMap.set('PASSWORD_TOO_WEAK', {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      message: 'Password doesn\'t meet security requirements',
      userAction: 'Use at least 8 characters with letters, numbers, and symbols.',
      canRetry: false
    })

    // Permission errors
    this.errorMap.set('FORBIDDEN', {
      category: ErrorCategory.PERMISSION,
      severity: ErrorSeverity.MEDIUM,
      message: 'You don\'t have permission for this action',
      userAction: 'Contact your administrator if you believe this is an error.',
      canRetry: false
    })

    // Server errors
    this.errorMap.set('SERVER_ERROR', {
      category: ErrorCategory.SERVER,
      severity: ErrorSeverity.HIGH,
      message: 'Something went wrong on our end',
      userAction: 'Please try again in a few moments. We\'re working to fix this.',
      canRetry: true,
      retryAfter: 5000
    })

    this.errorMap.set('SERVICE_UNAVAILABLE', {
      category: ErrorCategory.SERVER,
      severity: ErrorSeverity.HIGH,
      message: 'Service temporarily unavailable',
      userAction: 'We\'re performing maintenance. Please try again shortly.',
      canRetry: true,
      retryAfter: 10000
    })

    // Business logic errors
    this.errorMap.set('ONBOARDING_INCOMPLETE', {
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      message: 'Please complete your account setup',
      userAction: 'Finish the onboarding process to access all features.',
      canRetry: false
    })

    this.errorMap.set('PAYMENT_METHOD_REQUIRED', {
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      message: 'Payment method required',
      userAction: 'Configure a payment method to create invoices.',
      canRetry: false
    })

    // External service errors
    this.errorMap.set('STRIPE_CONFIG_ERROR', {
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.MEDIUM,
      message: 'Stripe payment processing is not available',
      userAction: 'You can still use manual invoicing. Contact support for Stripe setup.',
      canRetry: false
    })

    this.errorMap.set('EMAIL_SERVICE_ERROR', {
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.LOW,
      message: 'Email delivery may be delayed',
      userAction: 'Your action was saved, but notification emails might be delayed.',
      canRetry: true
    })
  }

  /**
   * Parse and standardize any error into a user-friendly format
   */
  parseError(error: any, context: ErrorContext = {}): StandardError {
    // Handle axios/HTTP errors
    if (error.response) {
      return this.parseHttpError(error, context)
    }

    // Handle network errors
    if (!error.response && error.request) {
      return this.parseNetworkError(error, context)
    }

    // Handle JavaScript errors
    if (error instanceof Error) {
      return this.parseJavaScriptError(error, context)
    }

    // Handle string errors
    if (typeof error === 'string') {
      return this.parseStringError(error, context)
    }

    // Default fallback
    return this.getDefaultError(error, context)
  }

  private parseHttpError(error: any, _context: ErrorContext): StandardError {
    const status = error.response.status
    const data = error.response.data

    switch (status) {
      case 400:
        if (data?.detail?.includes('Stripe')) {
          return this.errorMap.get('STRIPE_CONFIG_ERROR')!
        }
        if (data?.detail?.includes('email')) {
          return this.errorMap.get('EMAIL_INVALID')!
        }
        return {
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          message: data?.detail || data?.error?.message || 'Please check your input',
          userAction: 'Correct the highlighted fields and try again.',
          canRetry: false
        }

      case 401:
        return this.errorMap.get('UNAUTHORIZED')!

      case 403:
        return this.errorMap.get('FORBIDDEN')!

      case 422:
        return {
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          message: this.formatValidationErrors(data?.detail),
          userAction: 'Please correct the errors and try again.',
          canRetry: false
        }

      case 500:
        return this.errorMap.get('SERVER_ERROR')!

      case 503:
        return this.errorMap.get('SERVICE_UNAVAILABLE')!

      default:
        return {
          category: ErrorCategory.SERVER,
          severity: ErrorSeverity.MEDIUM,
          message: data?.detail || data?.error?.message || `Request failed (${status})`,
          userAction: 'Please try again. If the issue persists, contact support.',
          canRetry: status >= 500,
          retryAfter: status >= 500 ? 3000 : undefined
        }
    }
  }

  private parseNetworkError(error: any, _context: ErrorContext): StandardError {
    if (error.code === 'ECONNABORTED') {
      return this.errorMap.get('TIMEOUT_ERROR')!
    }

    if (error.message?.includes('CORS')) {
      return this.errorMap.get('CORS_ERROR')!
    }

    return this.errorMap.get('NETWORK_ERROR')!
  }

  private parseJavaScriptError(error: Error, _context: ErrorContext): StandardError {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return this.errorMap.get('NETWORK_ERROR')!
    }

    return {
      category: ErrorCategory.SERVER,
      severity: ErrorSeverity.MEDIUM,
      message: 'An unexpected error occurred',
      technicalMessage: error.message,
      userAction: 'Please refresh the page and try again.',
      canRetry: true
    }
  }

  private parseStringError(error: string, _context: ErrorContext): StandardError {
    const lowerError = error.toLowerCase()

    if (lowerError.includes('network')) {
      return this.errorMap.get('NETWORK_ERROR')!
    }

    if (lowerError.includes('unauthorized') || lowerError.includes('token')) {
      return this.errorMap.get('UNAUTHORIZED')!
    }

    return {
      category: ErrorCategory.SERVER,
      severity: ErrorSeverity.MEDIUM,
      message: error,
      userAction: 'Please try again.',
      canRetry: true
    }
  }

  private getDefaultError(error: any, _context: ErrorContext): StandardError {
    return {
      category: ErrorCategory.SERVER,
      severity: ErrorSeverity.MEDIUM,
      message: 'An unexpected error occurred',
      technicalMessage: JSON.stringify(error),
      userAction: 'Please try again. If the issue persists, contact support.',
      canRetry: true
    }
  }

  private formatValidationErrors(details: any): string {
    if (!details || !Array.isArray(details)) {
      return 'Please check your input'
    }

    const errors = details.map(detail => {
      const field = detail.loc?.[detail.loc.length - 1] || 'field'
      const message = detail.msg || 'is invalid'
      return `${field}: ${message}`
    })

    return errors.length === 1
      ? errors[0]
      : `Multiple errors: ${errors.slice(0, 2).join(', ')}${errors.length > 2 ? '...' : ''}`
  }

  /**
   * Display error to user with appropriate toast type
   */
  displayError(error: any, context: ErrorContext = {}) {
    const standardError = this.parseError(error, context)

    // Add retry count info if applicable
    let message = standardError.message
    if (context.retryCount && context.retryCount > 0) {
      message += ` (Attempt ${context.retryCount + 1})`
    }

    // Choose toast type based on severity
    switch (standardError.severity) {
      case ErrorSeverity.LOW:
        toast(message, { icon: 'ℹ️' })
        break
      case ErrorSeverity.MEDIUM:
        toast.error(message)
        break
      case ErrorSeverity.HIGH:
        toast.error(message, { duration: 6000 })
        break
      case ErrorSeverity.CRITICAL:
        toast.error(message, { duration: 0 }) // Stays until dismissed
        break
    }

    // Log technical details for debugging and monitoring
    if (standardError.technicalMessage) {
      console.error('Error details:', {
        category: standardError.category,
        severity: standardError.severity,
        userMessage: standardError.message,
        technicalMessage: standardError.technicalMessage,
        context,
        originalError: error
      })

      // Track error in monitoring system
      monitoring.recordError({
        type: `handled_error_${standardError.category}`,
        message: standardError.message,
        stack: error?.stack || standardError.technicalMessage,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        userId: context.userId?.toString()
      })
    }

    return standardError
  }

  /**
   * Get user-friendly error without displaying
   */
  formatError(error: any, context: ErrorContext = {}): StandardError {
    return this.parseError(error, context)
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: any): boolean {
    const standardError = this.parseError(error)
    return standardError.canRetry || false
  }

  /**
   * Get retry delay for retryable errors
   */
  getRetryDelay(error: any): number {
    const standardError = this.parseError(error)
    return standardError.retryAfter || 1000
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler()

// Convenience functions
export const displayError = (error: any, context: ErrorContext = {}) =>
  errorHandler.displayError(error, context)

export const formatError = (error: any, context: ErrorContext = {}) =>
  errorHandler.formatError(error, context)

export const isRetryable = (error: any) =>
  errorHandler.isRetryable(error)

export const getRetryDelay = (error: any) =>
  errorHandler.getRetryDelay(error)