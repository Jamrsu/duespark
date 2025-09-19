import React, { createContext, useContext, useCallback, useRef, ReactNode } from 'react'

type AnnouncementPriority = 'polite' | 'assertive'

interface Announcement {
  id: string
  message: string
  priority: AnnouncementPriority
  timestamp: number
}

interface ScreenReaderContextType {
  announce: (message: string, priority?: AnnouncementPriority) => void
  announcePolite: (message: string) => void
  announceAssertive: (message: string) => void
}

const ScreenReaderContext = createContext<ScreenReaderContextType | null>(null)

interface ScreenReaderProviderProps {
  children: ReactNode
}

export function ScreenReaderProvider({ children }: ScreenReaderProviderProps) {
  const politeRef = useRef<HTMLDivElement>(null)
  const assertiveRef = useRef<HTMLDivElement>(null)

  const announce = useCallback((message: string, priority: AnnouncementPriority = 'polite') => {
    if (!message.trim()) return

    const targetRef = priority === 'assertive' ? assertiveRef : politeRef

    if (targetRef.current) {
      // Clear previous content first
      targetRef.current.textContent = ''

      // Use a small delay to ensure screen readers pick up the change
      setTimeout(() => {
        if (targetRef.current) {
          targetRef.current.textContent = message
        }
      }, 10)
    }

    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔊 Screen Reader Announcement (${priority}):`, message)
    }
  }, [])

  const announcePolite = useCallback((message: string) => {
    announce(message, 'polite')
  }, [announce])

  const announceAssertive = useCallback((message: string) => {
    announce(message, 'assertive')
  }, [announce])

  return (
    <ScreenReaderContext.Provider
      value={{
        announce,
        announcePolite,
        announceAssertive,
      }}
    >
      {children}

      {/* Screen reader announcement regions */}
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </ScreenReaderContext.Provider>
  )
}

export function useScreenReader() {
  const context = useContext(ScreenReaderContext)
  if (!context) {
    throw new Error('useScreenReader must be used within a ScreenReaderProvider')
  }
  return context
}

// Hook for automatic announcements on route changes
export function useRouteAnnouncements() {
  const { announcePolite } = useScreenReader()

  const announcePageChange = useCallback((title: string) => {
    announcePolite(`Navigated to ${title} page`)
  }, [announcePolite])

  const announcePageLoad = useCallback((title: string, description?: string) => {
    const message = description
      ? `${title} page loaded. ${description}`
      : `${title} page loaded`
    announcePolite(message)
  }, [announcePolite])

  return {
    announcePageChange,
    announcePageLoad,
  }
}

// Hook for form announcements
export function useFormAnnouncements() {
  const { announcePolite, announceAssertive } = useScreenReader()

  const announceFormSubmission = useCallback((success: boolean, message?: string) => {
    if (success) {
      announcePolite(message || 'Form submitted successfully')
    } else {
      announceAssertive(message || 'Form submission failed. Please check for errors.')
    }
  }, [announcePolite, announceAssertive])

  const announceValidationError = useCallback((fieldName: string, error: string) => {
    announceAssertive(`${fieldName}: ${error}`)
  }, [announceAssertive])

  const announceFieldUpdate = useCallback((fieldName: string, value: string) => {
    announcePolite(`${fieldName} updated to ${value}`)
  }, [announcePolite])

  return {
    announceFormSubmission,
    announceValidationError,
    announceFieldUpdate,
  }
}

// Hook for data loading announcements
export function useLoadingAnnouncements() {
  const { announcePolite, announceAssertive } = useScreenReader()

  const announceLoadingStart = useCallback((resource: string) => {
    announcePolite(`Loading ${resource}`)
  }, [announcePolite])

  const announceLoadingComplete = useCallback((resource: string, count?: number) => {
    const message = count !== undefined
      ? `${resource} loaded. ${count} items found.`
      : `${resource} loaded successfully`
    announcePolite(message)
  }, [announcePolite])

  const announceLoadingError = useCallback((resource: string, error?: string) => {
    const message = error
      ? `Failed to load ${resource}: ${error}`
      : `Failed to load ${resource}`
    announceAssertive(message)
  }, [announceAssertive])

  return {
    announceLoadingStart,
    announceLoadingComplete,
    announceLoadingError,
  }
}

// Hook for action announcements
export function useActionAnnouncements() {
  const { announcePolite, announceAssertive } = useScreenReader()

  const announceSuccess = useCallback((action: string, target?: string) => {
    const message = target
      ? `${action} ${target} successfully`
      : `${action} completed successfully`
    announcePolite(message)
  }, [announcePolite])

  const announceError = useCallback((action: string, error?: string, target?: string) => {
    const baseMessage = target
      ? `Failed to ${action} ${target}`
      : `${action} failed`
    const message = error ? `${baseMessage}: ${error}` : baseMessage
    announceAssertive(message)
  }, [announceAssertive])

  const announceSelection = useCallback((item: string, count?: number) => {
    const message = count !== undefined
      ? `${item} selected. ${count} items selected total.`
      : `${item} selected`
    announcePolite(message)
  }, [announcePolite])

  return {
    announceSuccess,
    announceError,
    announceSelection,
  }
}

// Component for manual announcements
interface AnnouncementProps {
  message: string
  priority?: AnnouncementPriority
  trigger?: boolean
}

export function Announcement({ message, priority = 'polite', trigger = true }: AnnouncementProps) {
  const { announce } = useScreenReader()

  React.useEffect(() => {
    if (trigger && message) {
      announce(message, priority)
    }
  }, [message, priority, trigger, announce])

  return null
}