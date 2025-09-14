import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isValid, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatting
export function formatCurrency(amountCents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amountCents / 100)
}

// Date formatting
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return 'Invalid date'
  return format(dateObj, 'MMM d, yyyy')
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return 'Invalid date'
  return format(dateObj, 'MMM d, yyyy h:mm a')
}

export function formatDateTimeLocal(date: Date): string {
  // Format for datetime-local input
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export function isOverdue(dueDate: string): boolean {
  const due = parseISO(dueDate)
  return isValid(due) && due < new Date()
}

// Status helpers
export function getStatusColor(status: string) {
  const colors = {
    draft: 'status-draft',
    pending: 'status-pending', 
    paid: 'status-paid',
    overdue: 'status-overdue',
    cancelled: 'status-cancelled',
    sent: 'status-paid',
    failed: 'status-overdue',
  }
  return colors[status as keyof typeof colors] || 'status-draft'
}

// JWT token helpers
export function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = parseJwtPayload(token)
    if (!payload?.exp) return true
    return Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}

// Validation helpers
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Mobile detection
export function isMobile(): boolean {
  return window.innerWidth <= 768
}

export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// Storage helpers with error handling
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },
  
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Silent fail for storage errors
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch {
      // Silent fail
    }
  },
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel(): void } {
  let timeout: NodeJS.Timeout | null = null
  
  const debounced = ((...args: any[]) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T & { cancel(): void }
  
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }
  
  return debounced
}

// Focus management for accessibility
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>
  
  const firstFocusableElement = focusableElements[0]
  const lastFocusableElement = focusableElements[focusableElements.length - 1]
  
  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    
    if (e.shiftKey) {
      if (document.activeElement === firstFocusableElement) {
        lastFocusableElement.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === lastFocusableElement) {
        firstFocusableElement.focus()
        e.preventDefault()
      }
    }
  }
  
  element.addEventListener('keydown', handleTabKey)
  firstFocusableElement?.focus()
  
  return () => {
    element.removeEventListener('keydown', handleTabKey)
  }
}

// Error message extraction
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }
    if ('error' in error && typeof error.error === 'object' && error.error !== null) {
      if ('message' in error.error && typeof error.error.message === 'string') {
        return error.error.message
      }
    }
  }
  return 'An unknown error occurred'
}