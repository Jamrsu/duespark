/**
 * Keyboard Navigation and Focus Management
 * Provides comprehensive keyboard navigation support throughout the application
 */

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAccessibility } from './AccessibilityProvider'

// Focus management hook
export function useFocusManagement() {
  const { setFocusTo, manageFocus } = useAccessibility()
  const focusHistoryRef = useRef<string[]>([])

  const saveFocus = useCallback((elementId: string) => {
    focusHistoryRef.current.push(elementId)
    if (focusHistoryRef.current.length > 10) {
      focusHistoryRef.current.shift()
    }
  }, [])

  const restoreFocus = useCallback(() => {
    const lastFocusId = focusHistoryRef.current.pop()
    if (lastFocusId) {
      setFocusTo(lastFocusId)
    }
  }, [setFocusTo])

  const clearFocusHistory = useCallback(() => {
    focusHistoryRef.current = []
  }, [])

  return {
    saveFocus,
    restoreFocus,
    clearFocusHistory,
    setFocusTo,
    manageFocus
  }
}

// Keyboard shortcut handler
interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  description: string
  action: () => void
  disabled?: boolean
}

interface KeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[]
  scope?: 'global' | 'local'
  children?: React.ReactNode
}

export function KeyboardShortcutsProvider({
  shortcuts,
  scope = 'local',
  children
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const matchedShortcut = shortcuts.find(shortcut => {
        if (shortcut.disabled) return false

        return (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!event.ctrlKey === !!shortcut.ctrlKey &&
          !!event.altKey === !!shortcut.altKey &&
          !!event.shiftKey === !!shortcut.shiftKey &&
          !!event.metaKey === !!shortcut.metaKey
        )
      })

      if (matchedShortcut) {
        event.preventDefault()
        matchedShortcut.action()
      }
    }

    if (scope === 'global') {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      if (scope === 'global') {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [shortcuts, scope])

  if (scope === 'local' && children) {
    return (
      <div onKeyDown={(e) => {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return
        }

        const matchedShortcut = shortcuts.find(shortcut => {
          if (shortcut.disabled) return false

          return (
            e.key.toLowerCase() === shortcut.key.toLowerCase() &&
            !!e.ctrlKey === !!shortcut.ctrlKey &&
            !!e.altKey === !!shortcut.altKey &&
            !!e.shiftKey === !!shortcut.shiftKey &&
            !!e.metaKey === !!shortcut.metaKey
          )
        })

        if (matchedShortcut) {
          e.preventDefault()
          matchedShortcut.action()
        }
      }}>
        {children}
      </div>
    )
  }

  return <>{children}</>
}

// Roving tabindex for lists and grids
interface RovingTabIndexProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical' | 'both'
  loop?: boolean
  onSelectionChange?: (index: number) => void
}

export function RovingTabIndex({
  children,
  className,
  orientation = 'vertical',
  loop = true,
  onSelectionChange
}: RovingTabIndexProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const items = React.Children.toArray(children)

  const moveToIndex = useCallback((newIndex: number) => {
    let targetIndex = newIndex

    if (loop) {
      if (targetIndex < 0) targetIndex = items.length - 1
      if (targetIndex >= items.length) targetIndex = 0
    } else {
      targetIndex = Math.max(0, Math.min(items.length - 1, targetIndex))
    }

    setCurrentIndex(targetIndex)
    onSelectionChange?.(targetIndex)

    // Focus the new item
    const container = containerRef.current
    if (container) {
      const focusableElements = container.querySelectorAll('[tabindex]')
      const targetElement = focusableElements[targetIndex] as HTMLElement
      targetElement?.focus()
    }
  }, [items.length, loop, onSelectionChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault()
          moveToIndex(currentIndex + 1)
        }
        break
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault()
          moveToIndex(currentIndex - 1)
        }
        break
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault()
          moveToIndex(currentIndex + 1)
        }
        break
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault()
          moveToIndex(currentIndex - 1)
        }
        break
      case 'Home':
        e.preventDefault()
        moveToIndex(0)
        break
      case 'End':
        e.preventDefault()
        moveToIndex(items.length - 1)
        break
    }
  }, [orientation, currentIndex, moveToIndex, items.length])

  return (
    <div
      ref={containerRef}
      className={className}
      onKeyDown={handleKeyDown}
      role="list"
    >
      {items.map((child, index) => (
        <div
          key={index}
          role="listitem"
          tabIndex={index === currentIndex ? 0 : -1}
          onClick={() => moveToIndex(index)}
          onFocus={() => setCurrentIndex(index)}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

// Focus visible indicator
interface FocusVisibleProps {
  children: React.ReactNode
  className?: string
}

export function FocusVisible({ children, className }: FocusVisibleProps) {
  const [isFocusVisible, setIsFocusVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let hadKeyboardEvent = false

    const onKeyDown = () => {
      hadKeyboardEvent = true
    }

    const onPointerDown = () => {
      hadKeyboardEvent = false
    }

    const onFocus = () => {
      setIsFocusVisible(hadKeyboardEvent)
    }

    const onBlur = () => {
      setIsFocusVisible(false)
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    element.addEventListener('focus', onFocus, true)
    element.addEventListener('blur', onBlur, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      element.removeEventListener('focus', onFocus, true)
      element.removeEventListener('blur', onBlur, true)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        className,
        isFocusVisible && 'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'
      )}
    >
      {children}
    </div>
  )
}

// Skip link component for keyboard navigation
interface SkipLinkProps {
  targetId: string
  children: React.ReactNode
  className?: string
}

export function SkipLink({ targetId, children, className }: SkipLinkProps) {
  const handleClick = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault()
    const target = document.getElementById(targetId)
    if (target) {
      target.focus()
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [targetId])

  return (
    <a
      href={`#${targetId}`}
      className={cn(
        'sr-only focus:not-sr-only',
        'absolute top-4 left-4 z-50',
        'bg-primary-600 text-white px-4 py-2 rounded-md',
        'text-sm font-medium',
        'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600',
        'transition-all duration-200',
        className
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e)
        }
      }}
    >
      {children}
    </a>
  )
}

// Keyboard navigation menu
interface KeyboardMenuProps {
  items: Array<{
    key: string
    label: string
    action: () => void
    disabled?: boolean
    shortcut?: string
  }>
  className?: string
  onClose?: () => void
}

export function KeyboardMenu({ items, className, onClose }: KeyboardMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % items.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + items.length) % items.length)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          const selectedItem = items[selectedIndex]
          if (selectedItem && !selectedItem.disabled) {
            selectedItem.action()
            onClose?.()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose?.()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [items, selectedIndex, onClose])

  return (
    <div
      ref={menuRef}
      className={cn(
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[200px]',
        className
      )}
      role="menu"
      aria-orientation="vertical"
    >
      {items.map((item, index) => (
        <div
          key={item.key}
          role="menuitem"
          tabIndex={index === selectedIndex ? 0 : -1}
          className={cn(
            'flex items-center justify-between px-4 py-2 text-sm cursor-pointer',
            'focus:outline-none transition-colors duration-150',
            index === selectedIndex && 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300',
            item.disabled ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
          )}
          onClick={() => {
            if (!item.disabled) {
              item.action()
              onClose?.()
            }
          }}
          aria-disabled={item.disabled}
        >
          <span>{item.label}</span>
          {item.shortcut && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-4">
              {item.shortcut}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// Global keyboard shortcuts display
export function KeyboardShortcutsHelp({ shortcuts }: { shortcuts: KeyboardShortcut[] }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault()
        setIsVisible(true)
      }
      if (e.key === 'Escape') {
        setIsVisible(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Keyboard Shortcuts
          </h2>
        </div>
        <div className="p-6 space-y-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.ctrlKey && (
                  <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">Ctrl</kbd>
                )}
                {shortcut.altKey && (
                  <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">Alt</kbd>
                )}
                {shortcut.shiftKey && (
                  <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">Shift</kbd>
                )}
                {shortcut.metaKey && (
                  <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">⌘</kbd>
                )}
                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                  {shortcut.key.toUpperCase()}
                </kbd>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Press <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}