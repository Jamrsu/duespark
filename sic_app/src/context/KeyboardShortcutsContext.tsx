import { createContext, useContext, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKeyboardShortcutsModal, KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal'
import { useGlobalKeyboardShortcuts, commonShortcuts, KeyboardShortcutGroup } from '@/hooks/useKeyboardShortcuts'

interface KeyboardShortcutsContextType {
  openShortcutsModal: () => void
  closeShortcutsModal: () => void
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null)

interface KeyboardShortcutsProviderProps {
  children: ReactNode
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const navigate = useNavigate()
  const { isOpen, openModal, closeModal } = useKeyboardShortcutsModal()

  // Define global shortcuts
  const globalShortcuts = [
    // Navigation shortcuts
    commonShortcuts.goToDashboard(() => navigate('/app/dashboard')),
    commonShortcuts.goToInvoices(() => navigate('/app/invoices')),
    commonShortcuts.goToClients(() => navigate('/app/clients')),
    commonShortcuts.goToSettings(() => navigate('/app/settings')),

    // Creation shortcuts
    commonShortcuts.createNew(() => navigate('/app/invoices/new')),

    // UI shortcuts
    commonShortcuts.refresh(() => window.location.reload()),

    // Search shortcut (could integrate with command palette later)
    commonShortcuts.search(() => {
      // Focus search input if available
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
        searchInput.select()
      }
    }),
  ]

  // Register global shortcuts
  useGlobalKeyboardShortcuts(globalShortcuts)

  // Define shortcut groups for the help modal
  const shortcutGroups: KeyboardShortcutGroup[] = [
    {
      name: 'Navigation',
      shortcuts: [
        { keys: ['mod', 'd'], description: 'Go to dashboard', action: () => navigate('/app/dashboard') },
        { keys: ['mod', 'i'], description: 'Go to invoices', action: () => navigate('/app/invoices') },
        { keys: ['mod', 'c'], description: 'Go to clients', action: () => navigate('/app/clients') },
        { keys: ['mod', ','], description: 'Go to settings', action: () => navigate('/app/settings') },
      ]
    },
    {
      name: 'Invoice List Navigation',
      shortcuts: [
        { keys: ['j'], description: 'Navigate down in invoice list', action: () => {} },
        { keys: ['k'], description: 'Navigate up in invoice list', action: () => {} },
        { keys: ['space'], description: 'Select/deselect current invoice', action: () => {} },
        { keys: ['enter'], description: 'Open current invoice', action: () => {} },
        { keys: ['escape'], description: 'Clear navigation focus', action: () => {} },
      ]
    },
    {
      name: 'Invoice Actions',
      shortcuts: [
        { keys: ['m'], description: 'Mark current invoice as paid', action: () => {} },
        { keys: ['r'], description: 'Send reminder for current invoice', action: () => {} },
        { keys: ['mod', 'a'], description: 'Select all unpaid invoices', action: () => {} },
      ]
    },
    {
      name: 'General Actions',
      shortcuts: [
        { keys: ['mod', 'k'], description: 'Focus search', action: () => {} },
        { keys: ['mod', 'r'], description: 'Refresh page', action: () => window.location.reload() },
        { keys: ['mod', '/'], description: 'Show keyboard shortcuts', action: openModal },
        { keys: ['mod', 'n'], description: 'Create new invoice', action: () => navigate('/app/invoices/new') },
      ]
    },
    {
      name: 'Forms',
      shortcuts: [
        { keys: ['mod', 'enter'], description: 'Submit form', action: () => {} },
        { keys: ['mod', 's'], description: 'Save form', action: () => {} },
        { keys: ['escape'], description: 'Cancel/Close', action: () => {} },
      ]
    },
    {
      name: 'Interface',
      shortcuts: [
        { keys: ['mod', 'shift', 't'], description: 'Toggle theme', action: () => {} },
        { keys: ['escape'], description: 'Close modal/dialog', action: () => {} },
      ]
    }
  ]

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        openShortcutsModal: openModal,
        closeShortcutsModal: closeModal,
      }}
    >
      {children}
      <KeyboardShortcutsModal
        isOpen={isOpen}
        onClose={closeModal}
        shortcutGroups={shortcutGroups}
      />
    </KeyboardShortcutsContext.Provider>
  )
}

export function useKeyboardShortcutsContext() {
  const context = useContext(KeyboardShortcutsContext)
  if (!context) {
    throw new Error('useKeyboardShortcutsContext must be used within a KeyboardShortcutsProvider')
  }
  return context
}
