/**
 * Enhanced Accessibility Provider
 * Provides centralized accessibility features including ARIA live regions,
 * focus management, and screen reader announcements
 */

import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react'

interface AccessibilityContextType {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
  setFocusTo: (elementId: string) => void
  manageFocus: (element: HTMLElement | null) => void
  isReducedMotion: boolean
  announcePageChange: (title: string) => void
  announceFormError: (field: string, error: string) => void
  announceSuccess: (message: string) => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

interface AccessibilityProviderProps {
  children: React.ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const liveRegionRef = useRef<HTMLDivElement>(null)
  const assertiveRegionRef = useRef<HTMLDivElement>(null)
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const region = priority === 'assertive' ? assertiveRegionRef.current : liveRegionRef.current
    if (region) {
      // Clear first, then set message to ensure it's announced
      region.textContent = ''
      setTimeout(() => {
        region.textContent = message
      }, 100)
    }
  }, [])

  const setFocusTo = useCallback((elementId: string) => {
    setTimeout(() => {
      const element = document.getElementById(elementId)
      if (element) {
        element.focus()
        // Scroll element into view if needed
        element.scrollIntoView({
          behavior: isReducedMotion ? 'auto' : 'smooth',
          block: 'center'
        })
      }
    }, 100)
  }, [isReducedMotion])

  const manageFocus = useCallback((element: HTMLElement | null) => {
    if (element) {
      element.focus()
      // Add focus indicator for non-focusable elements
      if (!element.hasAttribute('tabindex') &&
          !['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(element.tagName)) {
        element.setAttribute('tabindex', '-1')
      }
    }
  }, [])

  const announcePageChange = useCallback((title: string) => {
    announceToScreenReader(`Page changed to ${title}`, 'assertive')
    // Update page title for screen readers
    document.title = `${title} - DueSpark`
  }, [announceToScreenReader])

  const announceFormError = useCallback((field: string, error: string) => {
    announceToScreenReader(`Error in ${field}: ${error}`, 'assertive')
  }, [announceToScreenReader])

  const announceSuccess = useCallback((message: string) => {
    announceToScreenReader(`Success: ${message}`, 'assertive')
  }, [announceToScreenReader])

  const value: AccessibilityContextType = {
    announceToScreenReader,
    setFocusTo,
    manageFocus,
    isReducedMotion,
    announcePageChange,
    announceFormError,
    announceSuccess
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* Screen reader live regions */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />
      <div
        ref={assertiveRegionRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
      />
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

// Higher-order component for adding accessibility features to any component
export function withAccessibility<T extends object>(Component: React.ComponentType<T>) {
  return function AccessibleComponent(props: T) {
    const accessibility = useAccessibility()
    return <Component {...props} accessibility={accessibility} />
  }
}

// Hook for managing skip links
export function useSkipNavigation() {
  const { setFocusTo } = useAccessibility()

  const skipToMain = useCallback(() => {
    setFocusTo('main-content')
  }, [setFocusTo])

  const skipToNavigation = useCallback(() => {
    setFocusTo('main-navigation')
  }, [setFocusTo])

  return {
    skipToMain,
    skipToNavigation
  }
}

// Enhanced focus trap hook
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }

      if (e.key === 'Escape') {
        // Allow parent to handle escape
        e.stopPropagation()
      }
    }

    if (firstElement) {
      firstElement.focus()
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive])

  return containerRef
}