import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Filter, X, Save, Star, Trash2, Home, Check, Settings, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterChips, getFilterIcon } from '@/components/ui/FilterChips'
import { QuickFilters } from '@/components/ui/QuickFilters'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { SortDropdown } from '@/components/ui/SortDropdown'
import { MobileInvoiceList } from '@/components/invoices/MobileInvoiceList'
import { useInvoices, useClients, useUpdateInvoiceStatus } from '@/api/hooks'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useKeyboardShortcuts, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts'
import { formatCurrency, formatDate } from '@/lib/utils'

// Filter preset type
interface FilterPreset {
  id: string
  name: string
  filters: {
    client_id: string
    status: string
    date_from: string
    date_to: string
    sortBy: string
  }
  createdAt: string
}

export function InvoicesView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Filter states
  const [filters, setFilters] = React.useState({
    client_id: '',
    status: '',
    date_from: '',
    date_to: '',
    sortBy: 'date_newest', // Default sort by newest first
  })
  
  const [showFilters, setShowFilters] = React.useState(false)
  const [showSaveDialog, setShowSaveDialog] = React.useState(false)
  const [presetName, setPresetName] = React.useState('')
  const [savedPresets, setSavedPresets] = React.useState<FilterPreset[]>([])
  const [defaultPresetId, setDefaultPresetId] = React.useState<string | null>(null)
  const [hasLoadedDefaults, setHasLoadedDefaults] = React.useState(false)

  // Bulk selection states
  const [selectedInvoices, setSelectedInvoices] = React.useState<Set<number>>(new Set())
  const [isSelectMode, setIsSelectMode] = React.useState(false)

  // Navigation states
  const [focusedInvoiceIndex, setFocusedInvoiceIndex] = React.useState<number>(-1)
  const [isNavigationActive, setIsNavigationActive] = React.useState(false)
  
  // Check URL parameters for client_id filter on mount
  React.useEffect(() => {
    const clientIdFromUrl = searchParams.get('client_id')
    if (clientIdFromUrl) {
      setFilters(prev => ({ ...prev, client_id: clientIdFromUrl }))
      setShowFilters(true) // Show filters panel to make it clear what's applied
      setHasLoadedDefaults(true) // Prevent default preset from overriding URL filter
    }
  }, [searchParams])

  // Load saved presets and default preset from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('invoiceFilterPresets')
    const defaultId = localStorage.getItem('invoiceDefaultPresetId')

    if (saved) {
      try {
        const presets = JSON.parse(saved)
        setSavedPresets(presets)

        // Set default preset ID if it exists
        if (defaultId) {
          setDefaultPresetId(defaultId)

          // Apply default preset if it exists and we haven't loaded defaults yet
          // (but don't override URL parameters)
          const defaultPreset = presets.find((p: FilterPreset) => p.id === defaultId)
          if (defaultPreset && !hasLoadedDefaults) {
            setFilters(defaultPreset.filters)
            setHasLoadedDefaults(true)
          }
        }
      } catch (error) {
        console.error('Error loading saved presets:', error)
      }
    }
  }, [hasLoadedDefaults])
  
  // Build query params for API (excluding sortBy which we handle client-side)
  const queryParams = React.useMemo(() => {
    const params: any = { limit: 100, offset: 0 }
    if (filters.client_id) params.client_id = parseInt(filters.client_id)
    if (filters.status) params.status = filters.status
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    return params
  }, [filters.client_id, filters.status, filters.date_from, filters.date_to])
  
  const { data: invoicesData, isLoading, refetch: refetchInvoices } = useInvoices(queryParams)
  const { data: clientsData } = useClients({ limit: 100, offset: 0 })
  const updateInvoiceStatus = useUpdateInvoiceStatus()
  
  const rawInvoices = invoicesData?.data || []
  const clients = clientsData?.data || []
  
  // Sort clients alphabetically for dropdown
  const sortedClients = React.useMemo(() => {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name))
  }, [clients])

  // Get the filtered client name for display
  const filteredClientName = React.useMemo(() => {
    if (!filters.client_id) return null
    const client = clients.find(c => c.id.toString() === filters.client_id)
    return client?.name
  }, [filters.client_id, clients])
  
  // Helper function to get client name
  const getClientName = (invoice: typeof rawInvoices[0]) => {
    // First try to use populated client data from API
    if (invoice.client?.name) {
      return invoice.client.name
    }
    // Fallback to lookup in clients array
    const client = clients.find(c => c.id === invoice.client_id)
    return client?.name || `Client #${invoice.client_id}`
  }
  
  // Sort invoices based on selected sort option
  const invoices = React.useMemo(() => {
    const sorted = [...rawInvoices]
    
    switch (filters.sortBy) {
      case 'amount_high_to_low':
        return sorted.sort((a, b) => b.amount_cents - a.amount_cents)
      case 'amount_low_to_high':
        return sorted.sort((a, b) => a.amount_cents - b.amount_cents)
      case 'date_newest':
        return sorted.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
      case 'date_oldest':
        return sorted.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      case 'invoice_high_to_low':
        return sorted.sort((a, b) => b.id - a.id)
      case 'invoice_low_to_high':
        return sorted.sort((a, b) => a.id - b.id)
      case 'company_a_to_z':
        return sorted.sort((a, b) => getClientName(a).localeCompare(getClientName(b)))
      case 'company_z_to_a':
        return sorted.sort((a, b) => getClientName(b).localeCompare(getClientName(a)))
      default:
        return sorted
    }
  }, [rawInvoices, filters.sortBy, clients])
  
  // Clear filters
  const clearFilters = () => {
    setFilters({
      client_id: '',
      status: '',
      date_from: '',
      date_to: '',
      sortBy: 'date_newest',
    })
  }
  
  // Check if any filters are active (excluding sortBy)
  const hasActiveFilters = filters.client_id !== '' || filters.status !== '' || filters.date_from !== '' || filters.date_to !== ''

  // Sort options for dropdown
  const sortOptions = [
    { value: 'date_newest', label: 'Date (Newest First)' },
    { value: 'date_oldest', label: 'Date (Oldest First)' },
    { value: 'amount_high_to_low', label: 'Amount (High to Low)' },
    { value: 'amount_low_to_high', label: 'Amount (Low to High)' },
    { value: 'invoice_high_to_low', label: 'Invoice # (High to Low)' },
    { value: 'invoice_low_to_high', label: 'Invoice # (Low to High)' },
    { value: 'company_a_to_z', label: 'Company (A-Z)' },
    { value: 'company_z_to_a', label: 'Company (Z-A)' }
  ]

  // Get responsive state
  const isMobile = useIsMobile()

  // Build filter chips data
  const filterChips = React.useMemo(() => {
    const chips = []

    if (filters.client_id) {
      const client = clients.find(c => c.id.toString() === filters.client_id)
      chips.push({
        key: 'client_id',
        label: 'Client',
        value: client?.name || `Client #${filters.client_id}`,
        icon: getFilterIcon('client_id'),
        onRemove: () => setFilters(prev => ({ ...prev, client_id: '' }))
      })
    }

    if (filters.status) {
      chips.push({
        key: 'status',
        label: 'Status',
        value: filters.status.charAt(0).toUpperCase() + filters.status.slice(1),
        icon: getFilterIcon('status'),
        onRemove: () => setFilters(prev => ({ ...prev, status: '' }))
      })
    }

    if (filters.date_from) {
      chips.push({
        key: 'date_from',
        label: 'From',
        value: new Date(filters.date_from).toLocaleDateString(),
        icon: getFilterIcon('date_from'),
        onRemove: () => setFilters(prev => ({ ...prev, date_from: '' }))
      })
    }

    if (filters.date_to) {
      chips.push({
        key: 'date_to',
        label: 'To',
        value: new Date(filters.date_to).toLocaleDateString(),
        icon: getFilterIcon('date_to'),
        onRemove: () => setFilters(prev => ({ ...prev, date_to: '' }))
      })
    }

    return chips
  }, [filters, clients])

  // Quick filter handler
  const handleQuickFilter = (quickFilters: any) => {
    setFilters(prev => ({
      ...prev,
      ...quickFilters
    }))
  }

  // Bulk selection helper functions
  const toggleSelectInvoice = (invoiceId: number) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev)
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId)
      } else {
        newSet.add(invoiceId)
      }
      return newSet
    })
  }

  const selectAllInvoices = () => {
    const unpaidInvoiceIds = invoices
      .filter(invoice => invoice.status !== 'paid')
      .map(invoice => invoice.id)
    setSelectedInvoices(new Set(unpaidInvoiceIds))
  }

  const clearSelection = () => {
    setSelectedInvoices(new Set())
    setIsSelectMode(false)
  }

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode)
    if (isSelectMode) {
      clearSelection()
    }
  }

  // Get selected invoices that can be marked as paid (exclude already paid invoices)
  const selectedUnpaidInvoices = invoices.filter(
    invoice => selectedInvoices.has(invoice.id) && invoice.status !== 'paid'
  )

  const bulkMarkAsPaid = async () => {
    if (selectedUnpaidInvoices.length === 0) return

    const paidDate = new Date().toISOString()

    try {
      // Process all selected invoices in parallel
      const results = await Promise.allSettled(
        selectedUnpaidInvoices.map(invoice =>
          updateInvoiceStatus.mutateAsync({
            invoiceId: invoice.id,
            status: 'paid',
            paidDate
          })
        )
      )

      // Count successful and failed operations
      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.filter(result => result.status === 'rejected').length

      // Show summary toast
      if (successful > 0 && failed === 0) {
        // All successful - success toast already shown by individual mutations
      } else if (successful > 0 && failed > 0) {
        console.warn(`Partial success: ${successful} invoices marked as paid, ${failed} failed`)
      } else if (failed > 0) {
        console.error(`All ${failed} invoices failed to be marked as paid`)
      }

      clearSelection()
    } catch (error) {
      console.error('Bulk mark as paid operation failed:', error)
    }
  }

  // Navigation helper functions
  const navigateUp = () => {
    if (invoices.length === 0) return
    setIsNavigationActive(true)
    setFocusedInvoiceIndex(prev => {
      const newIndex = prev <= 0 ? invoices.length - 1 : prev - 1
      return newIndex
    })
  }

  const navigateDown = () => {
    if (invoices.length === 0) return
    setIsNavigationActive(true)
    setFocusedInvoiceIndex(prev => {
      const newIndex = prev >= invoices.length - 1 ? 0 : prev + 1
      return newIndex
    })
  }

  const selectCurrentInvoice = () => {
    if (focusedInvoiceIndex >= 0 && focusedInvoiceIndex < invoices.length) {
      const invoice = invoices[focusedInvoiceIndex]
      if (invoice.status !== 'paid') {
        if (!isSelectMode) {
          setIsSelectMode(true)
        }
        toggleSelectInvoice(invoice.id)
      }
    }
  }

  const openCurrentInvoice = () => {
    if (focusedInvoiceIndex >= 0 && focusedInvoiceIndex < invoices.length) {
      const invoice = invoices[focusedInvoiceIndex]
      navigate(`/app/invoices/${invoice.id}`)
    }
  }

  const markCurrentAsPaid = async () => {
    if (focusedInvoiceIndex >= 0 && focusedInvoiceIndex < invoices.length) {
      const invoice = invoices[focusedInvoiceIndex]
      if (invoice.status !== 'paid') {
        const paidDate = new Date().toISOString()
        await updateInvoiceStatus.mutateAsync({
          invoiceId: invoice.id,
          status: 'paid',
          paidDate
        })
      }
    }
  }

  // Handle mobile refresh
  const handleMobileRefresh = async () => {
    await refetchInvoices()
  }
  
  // Preset management functions
  const saveCurrentFiltersAsPreset = () => {
    if (!presetName.trim()) return
    
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString()
    }
    
    const updatedPresets = [...savedPresets, newPreset]
    setSavedPresets(updatedPresets)
    localStorage.setItem('invoiceFilterPresets', JSON.stringify(updatedPresets))
    
    setPresetName('')
    setShowSaveDialog(false)
  }
  
  const loadPreset = (preset: FilterPreset) => {
    setFilters(preset.filters)
    if (!showFilters) setShowFilters(true)
  }
  
  const deletePreset = (presetId: string) => {
    const updatedPresets = savedPresets.filter(p => p.id !== presetId)
    setSavedPresets(updatedPresets)
    localStorage.setItem('invoiceFilterPresets', JSON.stringify(updatedPresets))
    
    // If we're deleting the default preset, clear the default
    if (defaultPresetId === presetId) {
      setDefaultPresetId(null)
      localStorage.removeItem('invoiceDefaultPresetId')
    }
  }
  
  const setAsDefaultPreset = (presetId: string) => {
    setDefaultPresetId(presetId)
    localStorage.setItem('invoiceDefaultPresetId', presetId)
  }
  
  const clearDefaultPreset = () => {
    setDefaultPresetId(null)
    localStorage.removeItem('invoiceDefaultPresetId')
  }

  // Define keyboard shortcuts for invoice navigation
  const invoiceShortcuts: KeyboardShortcut[] = [
    {
      keys: ['j'],
      description: 'Navigate down in invoice list',
      action: navigateDown,
      global: false
    },
    {
      keys: ['k'],
      description: 'Navigate up in invoice list',
      action: navigateUp,
      global: false
    },
    {
      keys: ['space'],
      description: 'Select/deselect current invoice',
      action: selectCurrentInvoice,
      global: false,
      preventDefault: true
    },
    {
      keys: ['enter'],
      description: 'Open current invoice',
      action: openCurrentInvoice,
      global: false
    },
    {
      keys: ['m'],
      description: 'Mark current invoice as paid',
      action: markCurrentAsPaid,
      global: false
    },
    {
      keys: ['r'],
      description: 'Send reminder for current invoice',
      action: () => {
        // TODO: Implement reminder sending for current invoice
        console.log('Send reminder for current invoice')
      },
      global: false
    },
    {
      keys: ['escape'],
      description: 'Clear navigation focus',
      action: () => {
        setIsNavigationActive(false)
        setFocusedInvoiceIndex(-1)
      },
      global: false
    }
  ]

  // Register keyboard shortcuts (only when not in mobile and not focused on input)
  useKeyboardShortcuts({
    shortcuts: invoiceShortcuts,
    enabled: !isMobile && !isLoading
  })

  // Reset navigation when invoices change
  React.useEffect(() => {
    if (isNavigationActive && focusedInvoiceIndex >= invoices.length) {
      setFocusedInvoiceIndex(-1)
      setIsNavigationActive(false)
    }
  }, [invoices.length, focusedInvoiceIndex, isNavigationActive])

  // Scroll focused invoice into view
  React.useEffect(() => {
    if (isNavigationActive && focusedInvoiceIndex >= 0) {
      const invoiceElement = document.querySelector(`[data-invoice-index="${focusedInvoiceIndex}"]`)
      if (invoiceElement) {
        invoiceElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [focusedInvoiceIndex, isNavigationActive])
  
  const getPresetDisplayName = (preset: FilterPreset) => {
    const parts = []
    if (preset.filters.client_id) {
      const client = clients.find(c => c.id.toString() === preset.filters.client_id)
      parts.push(client?.name || `Client #${preset.filters.client_id}`)
    }
    if (preset.filters.status) parts.push(preset.filters.status.charAt(0).toUpperCase() + preset.filters.status.slice(1))
    if (preset.filters.date_from) parts.push(`From: ${preset.filters.date_from}`)
    if (preset.filters.date_to) parts.push(`To: ${preset.filters.date_to}`)
    return parts.length > 0 ? parts.join(' • ') : 'Custom filter'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="loading-shimmer h-8 w-32" />
          <div className="loading-shimmer h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="loading-shimmer h-16 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="px-6 pt-2 pb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {filteredClientName ? `${filteredClientName} Invoices` : 'Invoices'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {filteredClientName
              ? `Showing invoices for ${filteredClientName}`
              : 'Manage your invoices and track payments'
            }
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Sort Dropdown */}
          <SortDropdown
            value={filters.sortBy}
            onChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
            options={sortOptions}
            className="w-full sm:w-auto"
          />

          <Button
            className="w-full sm:w-auto shadow-lg shadow-primary-500/30"
            onClick={() => navigate('/app/invoices/new')}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Invoice
          </Button>
        </div>
      </section>

      {/* Quick Filters */}
      <div className="px-6">
        <QuickFilters
          onFilterSelect={handleQuickFilter}
          activeFilters={filters}
        />
      </div>

      {/* Filters Button */}
      <div className="px-6">
        <Button
          variant={showFilters ? 'secondary' : 'ghost'}
          onClick={() => setShowFilters(!showFilters)}
          className="backdrop-blur hover:bg-white/20 dark:hover:bg-white/10"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-primary-500"></span>
          )}
        </Button>
      </div>

      {/* Filter Chips */}
      {filterChips.length > 0 && (
        <div className="px-6">
          <FilterChips
            filters={filterChips}
            onClearAll={clearFilters}
          />
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Invoices
              </CardTitle>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSaveDialog(true)}
                      className="text-sm"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Basic Filters */}
              <CollapsibleSection
                title="Basic Filters"
                icon={<Filter className="h-4 w-4" />}
                defaultOpen={true}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Client Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client
                    </label>
                    <select
                      value={filters.client_id}
                      onChange={(e) => setFilters(prev => ({ ...prev, client_id: e.target.value }))}
                      className="input"
                    >
                      <option value="">All Clients</option>
                      {sortedClients.map((client) => (
                        <option key={client.id} value={client.id.toString()}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="input"
                    >
                      <option value="">All Statuses</option>
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Advanced Filters */}
              <CollapsibleSection
                title="Advanced Filters"
                icon={<Settings className="h-4 w-4" />}
                defaultOpen={false}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date From Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={filters.date_from}
                      onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                      className="input"
                    />
                  </div>

                  {/* Date To Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={filters.date_to}
                      onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">Date Range Tips:</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>Leave both dates empty to see all invoices</li>
                        <li>Set only "From Date" to see invoices from that date onwards</li>
                        <li>Set only "To Date" to see invoices up to that date</li>
                        <li>Set both dates to filter invoices within a specific range</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            {/* Saved Presets */}
            {savedPresets.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Saved Filter Presets
                  </h4>
                  {defaultPresetId && (
                    <button
                      onClick={clearDefaultPreset}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
                      title="Clear default preset"
                    >
                      <X className="h-3 w-3" />
                      Clear Default
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {savedPresets.map((preset) => {
                    const isDefault = defaultPresetId === preset.id
                    return (
                      <div
                        key={preset.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                          isDefault
                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        {isDefault && (
                          <Home className="h-3 w-3 text-primary-600 dark:text-primary-400" aria-label="Default preset" />
                        )}
                        <button
                          onClick={() => loadPreset(preset)}
                          className={`text-sm font-medium ${
                            isDefault
                              ? 'text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200'
                              : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                          }`}
                          title={getPresetDisplayName(preset)}
                        >
                          {preset.name}
                        </button>
                        <div className="flex items-center gap-1 ml-1">
                          {!isDefault && (
                            <button
                              onClick={() => setAsDefaultPreset(preset.id)}
                              className="text-gray-400 hover:text-primary-500 p-1"
                              title="Set as startup default"
                            >
                              <Home className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => deletePreset(preset.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                            title="Delete preset"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {defaultPresetId && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Default preset will be applied automatically when you visit this page
                  </p>
                )}
              </div>
            )}

            {/* Save Preset Dialog */}
            {showSaveDialog && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg border border-primary-200 dark:border-primary-800">
                  <h4 className="text-sm font-medium text-primary-900 dark:text-primary-100 mb-3">
                    Save Current Filter Combination
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="Enter preset name..."
                      className="input flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveCurrentFiltersAsPreset()
                        } else if (e.key === 'Escape') {
                          setShowSaveDialog(false)
                          setPresetName('')
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      onClick={saveCurrentFiltersAsPreset}
                      disabled={!presetName.trim()}
                      size="sm"
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowSaveDialog(false)
                        setPresetName('')
                      }}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {hasActiveFilters ? 'Filtered' : 'All'} Invoices ({invoices.length})
                {hasActiveFilters && (
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    - filters applied
                  </span>
                )}
              </CardTitle>
              {!isMobile && invoices.length > 0 && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">J</kbd>
                    /
                    <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">K</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">Space</kbd>
                    select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">Enter</kbd>
                    open
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">M</kbd>
                    mark paid
                  </span>
                </div>
              )}
            </div>

            {/* Bulk Actions - Desktop Only */}
            {!isMobile && (
              <div className="flex items-center gap-3">
                {!isSelectMode && invoices.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectMode}
                    className="text-sm"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Select
                  </Button>
                )}

                {isSelectMode && (
                  <>
                    {/* Select All Checkbox */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          invoices.filter(invoice => invoice.status !== 'paid').length > 0 &&
                          invoices.filter(invoice => invoice.status !== 'paid').every(invoice =>
                            selectedInvoices.has(invoice.id)
                          )
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAllInvoices()
                          } else {
                            clearSelection()
                          }
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Select All Unpaid
                      </span>
                    </div>

                    {/* Selected Count */}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedInvoices.size} selected
                    </span>

                    {/* Mark as Paid Button */}
                    {selectedUnpaidInvoices.length > 0 && (
                      <Button
                        onClick={bulkMarkAsPaid}
                        disabled={updateInvoiceStatus.isPending}
                        size="sm"
                        className="bg-success-600 hover:bg-success-700 text-white"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark as Paid ({selectedUnpaidInvoices.length})
                      </Button>
                    )}

                    {/* Cancel Selection */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      className="text-sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            isMobile ? (
              // Mobile view using MobileInvoiceList
              <MobileInvoiceList
                invoices={invoices.map(invoice => ({
                  id: invoice.id,
                  client_name: getClientName(invoice),
                  amount_cents: invoice.amount_cents,
                  currency: invoice.currency,
                  due_date: invoice.due_date,
                  status: invoice.status as 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled',
                  created_at: invoice.created_at || new Date().toISOString(),
                  days_past_due: invoice.status === 'overdue' ? Math.max(0, Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))) : undefined
                }))}
                onMarkPaid={async (invoiceId: number) => {
                  const paidDate = new Date().toISOString()
                  await updateInvoiceStatus.mutateAsync({
                    invoiceId,
                    status: 'paid',
                    paidDate
                  })
                }}
                onRefresh={handleMobileRefresh}
                loading={isLoading}
              />
            ) : (
              // Desktop view
              <div className="space-y-4">
                {invoices.length > 0 && !isMobile && (
                  <div className="text-center py-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      💡 Use <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 border rounded">J</kbd> and <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 border rounded">K</kbd> to navigate, <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 border rounded">Space</kbd> to select
                    </p>
                  </div>
                )}
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    data-invoice-index={invoices.indexOf(invoice)}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-all duration-200 ${
                      isNavigationActive && focusedInvoiceIndex === invoices.indexOf(invoice)
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-200 dark:border-primary-800 shadow-lg'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-2 border-transparent'
                    }`}
                    tabIndex={isNavigationActive && focusedInvoiceIndex === invoices.indexOf(invoice) ? 0 : -1}
                  >
                    {/* Checkbox */}
                    {isSelectMode && (
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.has(invoice.id)}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleSelectInvoice(invoice.id)
                          }}
                          disabled={invoice.status === 'paid'}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    )}

                    {/* Invoice content */}
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/app/invoices/${invoice.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                              Invoice #{invoice.id}
                            </h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              • {getClientName(invoice)}
                            </span>
                            <StatusBadge status={invoice.status} />
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Due: {formatDate(invoice.due_date)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(invoice.amount_cents, invoice.currency)}
                          </div>
                          {invoice.paid_at && (
                            <div className="text-xs text-success-600 dark:text-success-400">
                              Paid {formatDate(invoice.paid_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No invoices yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by creating your first invoice.
              </p>
              <Button onClick={() => navigate('/app/invoices/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
