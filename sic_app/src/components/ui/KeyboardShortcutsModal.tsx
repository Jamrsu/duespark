import React, { useState } from 'react'
import { X, Keyboard, Search } from 'lucide-react'
import { Button } from './Button'
import {
  KeyboardShortcutGroup,
  formatShortcut,
  useKeyboardShortcuts,
  commonShortcuts
} from '@/hooks/useKeyboardShortcuts'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
  shortcutGroups?: KeyboardShortcutGroup[]
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcutGroups = []
}: KeyboardShortcutsModalProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Close modal with Escape key
  useKeyboardShortcuts({
    shortcuts: [
      commonShortcuts.escape(onClose)
    ],
    enabled: isOpen
  })

  if (!isOpen) return null

  // Default shortcut groups if none provided
  const defaultGroups: KeyboardShortcutGroup[] = [
    {
      name: 'Navigation',
      shortcuts: [
        { keys: ['mod', 'd'], description: 'Go to dashboard', action: () => {} },
        { keys: ['mod', 'i'], description: 'Go to invoices', action: () => {} },
        { keys: ['mod', 'c'], description: 'Go to clients', action: () => {} },
        { keys: ['mod', ','], description: 'Go to settings', action: () => {} },
      ]
    },
    {
      name: 'Actions',
      shortcuts: [
        { keys: ['mod', 'n'], description: 'Create new', action: () => {} },
        { keys: ['mod', 's'], description: 'Save', action: () => {} },
        { keys: ['mod', 'k'], description: 'Search', action: () => {} },
        { keys: ['mod', 'r'], description: 'Refresh', action: () => {} },
        { keys: ['mod', '/'], description: 'Show keyboard shortcuts', action: () => {} },
      ]
    },
    {
      name: 'Interface',
      shortcuts: [
        { keys: ['mod', 'b'], description: 'Toggle sidebar', action: () => {} },
        { keys: ['mod', 'shift', 't'], description: 'Toggle theme', action: () => {} },
        { keys: ['escape'], description: 'Close modal/dialog', action: () => {} },
      ]
    },
    {
      name: 'Forms',
      shortcuts: [
        { keys: ['mod', 'enter'], description: 'Submit form', action: () => {} },
        { keys: ['mod', 'shift', 'r'], description: 'Reset form', action: () => {} },
      ]
    }
  ]

  const groups = shortcutGroups.length > 0 ? shortcutGroups : defaultGroups

  // Filter shortcuts based on search query
  const filteredGroups = groups.map(group => ({
    ...group,
    shortcuts: group.shortcuts.filter(shortcut =>
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatShortcut(shortcut.keys).toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.shortcuts.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <Keyboard className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Keyboard Shortcuts
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Speed up your workflow with these shortcuts
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto p-6">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8">
              <Keyboard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No shortcuts found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGroups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {group.name}
                  </h3>
                  <div className="space-y-2">
                    {group.shortcuts.map((shortcut, shortcutIndex) => (
                      <div
                        key={shortcutIndex}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {formatShortcut(shortcut.keys).split(' + ').map((key, keyIndex) => (
                            <React.Fragment key={keyIndex}>
                              <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded">
                                {key}
                              </kbd>
                              {keyIndex < formatShortcut(shortcut.keys).split(' + ').length - 1 && (
                                <span className="text-xs text-gray-400 mx-1">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>💡 Tip: Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">Cmd/Ctrl + /</kbd> to open this dialog</span>
            </div>
            <span>{filteredGroups.reduce((acc, group) => acc + group.shortcuts.length, 0)} shortcuts</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook to manage the keyboard shortcuts modal
export function useKeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)

  // Global shortcut to open the modal
  useKeyboardShortcuts({
    shortcuts: [
      commonShortcuts.showHelp(openModal)
    ]
  })

  return {
    isOpen,
    openModal,
    closeModal
  }
}