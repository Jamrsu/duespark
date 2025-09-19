/**
 * Retry utility with exponential backoff for handling network errors
 */

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryCondition?: (error: any) => boolean
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Use standardized error handler to determine if retryable
    try {
      const { isRetryable } = require('./errorHandling')
      return isRetryable(error)
    } catch {
      // Fallback to original logic if error handler not available
      if (!error.response) return true // Network error
      if (error.response.status >= 500) return true // Server error
      if (error.response.status === 0) return true // CORS error
      return false
    }
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options }
  let lastError: any

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry if this is the last attempt
      if (attempt === opts.maxRetries) {
        break
      }

      // Don't retry if the condition says not to
      if (!opts.retryCondition(error)) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      )

      // Add some jitter to prevent thundering herd
      const jitteredDelay = delay * (0.5 + Math.random() * 0.5)

      console.log(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${jitteredDelay}ms`)

      await new Promise(resolve => setTimeout(resolve, jitteredDelay))
    }
  }

  throw lastError
}

/**
 * Enhanced error formatting with retry information
 */
export function formatErrorWithRetry(error: any, attemptNumber?: number): string {
  let baseMessage = "An unexpected error occurred"

  if (error.response?.data?.detail) {
    baseMessage = error.response.data.detail
  } else if (error.response?.data?.error?.message) {
    baseMessage = error.response.data.error.message
  } else if (error.message) {
    if (error.message.includes('Network Error')) {
      baseMessage = "Network connection error"
    } else if (error.message.includes('CORS')) {
      baseMessage = "Connection configuration error"
    } else {
      baseMessage = error.message
    }
  }

  if (attemptNumber && attemptNumber > 1) {
    baseMessage += ` (attempted ${attemptNumber} times)`
  }

  return baseMessage
}