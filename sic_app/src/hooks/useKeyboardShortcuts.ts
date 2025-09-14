import { useEffect, useCallback, useRef } from 'react'

export type KeyboardShortcut = {
  keys: string[]
  description: string
  action: () => void
  preventDefault?: boolean
  disabled?: boolean
  global?: boolean
}

export type KeyboardShortcutGroup = {
  name: string
  shortcuts: KeyboardShortcut[]
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
  element?: HTMLElement | null
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  element
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const handleKeyDown = useCallback((event: Event) => {
    const keyboardEvent = event as KeyboardEvent
    if (!enabled) return

    const pressedKeys = []
    if (keyboardEvent.ctrlKey || keyboardEvent.metaKey) pressedKeys.push('mod')
    if (keyboardEvent.altKey) pressedKeys.push('alt')
    if (keyboardEvent.shiftKey) pressedKeys.push('shift')

    // Add the main key (convert to lowercase for consistency)
    const mainKey = keyboardEvent.key.toLowerCase()
    if (!['control', 'meta', 'alt', 'shift'].includes(mainKey)) {
      pressedKeys.push(mainKey)
    }

    const pressedCombo = pressedKeys.join('+')

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      if (shortcut.disabled) return false

      const shortcutCombo = shortcut.keys.map(key =>
        key.replace('cmd', 'mod').replace('ctrl', 'mod')
      ).join('+').toLowerCase()

      return shortcutCombo === pressedCombo
    })

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        keyboardEvent.preventDefault()
        keyboardEvent.stopPropagation()
      }
      matchingShortcut.action()
    }
  }, [enabled])

  useEffect(() => {
    const targetElement = element || document

    targetElement.addEventListener('keydown', handleKeyDown)

    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, element])
}

// Hook for managing global keyboard shortcuts
export function useGlobalKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  useKeyboardShortcuts({
    shortcuts: shortcuts.filter(s => s.global !== false),
    enabled
  })
}

// Common keyboard shortcuts
export const commonShortcuts = {
  // Navigation
  goToDashboard: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', 'd'],
    description: 'Go to dashboard',
    action,
    global: true
  }),

  goToInvoices: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', 'i'],
    description: 'Go to invoices',
    action,
    global: true
  }),

  goToClients: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', 'c'],
    description: 'Go to clients',
    action,
    global: true
  }),

  goToSettings: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', ','],
    description: 'Go to settings',
    action,
    global: true
  }),

  // Actions
  createNew: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', 'n'],
    description: 'Create new',
    action,
    global: true
  }),

  save: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', 's'],
    description: 'Save',
    action,
    global: true
  }),

  search: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', 'k'],
    description: 'Search',
    action,
    global: true
  }),

  refresh: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', 'r'],
    description: 'Refresh',
    action,
    global: true
  }),

  // UI
  toggleSidebar: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', 'b'],
    description: 'Toggle sidebar',
    action,
    global: true
  }),

  toggleTheme: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', 'shift', 't'],
    description: 'Toggle theme',
    action,
    global: true
  }),

  showHelp: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', '/'],
    description: 'Show keyboard shortcuts',
    action,
    global: true
  }),

  escape: (action: () => void): KeyboardShortcut => ({
    keys: ['escape'],
    description: 'Close modal/dialog',
    action,
    global: true
  }),

  // Form shortcuts
  submitForm: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', 'enter'],
    description: 'Submit form',
    action,
    global: false
  }),

  resetForm: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', 'shift', 'r'],
    description: 'Reset form',
    action,
    global: false
  }),

  // Table shortcuts
  selectAll: (action: () => void): KeyboardShortcut => ({
    keys: ['mod', 'a'],
    description: 'Select all',
    action,
    global: false,
    preventDefault: false
  }),

  deleteSelected: (action: () => void): KeyboardShortcut => ({
    keys: ['delete'],
    description: 'Delete selected',
    action,
    global: false
  }),
}

// Platform-specific key display
export function getKeyDisplayName(key: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

  const keyMap: Record<string, string> = {
    mod: isMac ? '⌘' : 'Ctrl',
    cmd: '⌘',
    ctrl: 'Ctrl',
    alt: isMac ? '⌥' : 'Alt',
    shift: isMac ? '⇧' : 'Shift',
    enter: '↵',
    escape: 'Esc',
    delete: isMac ? '⌫' : 'Del',
    backspace: '⌫',
    tab: '⇥',
    space: '␣',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
  }

  return keyMap[key.toLowerCase()] || key.toUpperCase()
}

// Format shortcut for display
export function formatShortcut(keys: string[]): string {
  return keys.map(getKeyDisplayName).join(' + ')
}