import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvoiceImportStep } from './InvoiceImportStep'
import { apiClient } from '@/api/client'
import { createMockUser } from '@/test/mockUtils'

// Mock the API
vi.mock('@/api/client', () => ({
  apiClient: {
    post: vi.fn()
  }
}))


function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('InvoiceImportStep', () => {
  const mockOnNext = vi.fn()
  const mockOnBack = vi.fn()

  const mockUser = createMockUser({
    email_verified: true,
    onboarding_status: 'data_import_pending'
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders import data options', () => {
    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('Import Your Data')).toBeInTheDocument()
    expect(screen.getByText('Start with Sample Data')).toBeInTheDocument()
    expect(screen.getAllByText('Start Fresh')).toHaveLength(2) // Header and button
    expect(screen.getByText('Import Sample Data')).toBeInTheDocument()
  })

  it('displays sample data features', () => {
    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('3 demo clients with contact information')).toBeInTheDocument()
    expect(screen.getByText('6 sample invoices with various statuses')).toBeInTheDocument()
    expect(screen.getByText('Pre-configured reminder schedules')).toBeInTheDocument()
    expect(screen.getByText('Experience all features immediately')).toBeInTheDocument()
  })

  it('displays manual setup features', () => {
    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('Clean slate for your actual data')).toBeInTheDocument()
    expect(screen.getByText('Add clients and invoices manually')).toBeInTheDocument()
    expect(screen.getByText('No demo data to clean up later')).toBeInTheDocument()
    expect(screen.getByText('Professional setup from day one')).toBeInTheDocument()
  })

  it('handles sample data import', async () => {
    const sampleDataResponse = {
      clients_created: 3,
      invoices_created: 6,
      message: 'Sample data created successfully'
    }
    vi.mocked(apiClient.post).mockResolvedValue({ data: sampleDataResponse })

    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Import Sample Data'))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/onboarding/sample-data')
    }, { timeout: 2000 })

    // Check for success state
    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalled()
    }, { timeout: 2500 }) // Account for 2 second delay
  })

  it('shows loading state during sample data import', async () => {
    vi.mocked(apiClient.post).mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Import Sample Data'))

    await waitFor(() => {
      expect(screen.getByText('Creating Sample Data...')).toBeInTheDocument()
      expect(screen.getByText('Creating Your Sample Data')).toBeInTheDocument()
      expect(screen.getByText('Setting up demo clients, invoices, and reminders...')).toBeInTheDocument()
    })
  })

  it('handles skip import (start fresh)', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: true })

    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    // Click the Start Fresh button (outline variant)
    const startFreshButtons = screen.getAllByText('Start Fresh')
    fireEvent.click(startFreshButtons[1]) // Second button is the actual action button

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/events', {
        entity_type: 'user',
        entity_id: 1,
        event_type: 'import_skipped',
        payload: { reason: 'manual_setup_preferred' }
      })
    }, { timeout: 2000 })

    // Check for success state
    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalled()
    }, { timeout: 1500 })
  })

  it('shows loading state during skip import', async () => {
    vi.mocked(apiClient.post).mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    const startFreshButtons = screen.getAllByText('Start Fresh')
    fireEvent.click(startFreshButtons[1])

    await waitFor(() => {
      expect(screen.getByText('Setting Up...')).toBeInTheDocument()
    })
  })

  it('displays reminder preview', () => {
    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('Reminder Preview')).toBeInTheDocument()
    expect(screen.getByText('Subject: Payment Reminder - Invoice #INV-001')).toBeInTheDocument()
    expect(screen.getByText(/Hi \[Client Name\]/)).toBeInTheDocument()
    expect(screen.getByText(/Invoice #: INV-001/)).toBeInTheDocument()
  })

  it('shows getting started tips', () => {
    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('💡 Getting Started Tips')).toBeInTheDocument()
    expect(screen.getByText('Sample Data:')).toBeInTheDocument()
    expect(screen.getByText('Start Fresh:')).toBeInTheDocument()
    expect(screen.getByText('Reminders:')).toBeInTheDocument()
    expect(screen.getByText('Templates:')).toBeInTheDocument()
  })

  it('handles API errors during sample data import', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Sample data creation failed'))

    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Import Sample Data'))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled()
      expect(mockOnNext).not.toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('handles API errors during skip import', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Skip tracking failed'))

    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    const startFreshButtons = screen.getAllByText('Start Fresh')
    fireEvent.click(startFreshButtons[1])

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled()
      expect(mockOnNext).not.toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('tracks sample data import event', async () => {
    const sampleDataResponse = {
      clients_created: 3,
      invoices_created: 6
    }
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: sampleDataResponse })
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} }) // For event tracking

    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Import Sample Data'))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/onboarding/sample-data')
    }, { timeout: 2000 })

    // Wait for event tracking call
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/events', {
        entity_type: 'user',
        entity_id: 1,
        event_type: 'sample_data_imported',
        payload: {
          clients_created: 3,
          invoices_created: 6
        }
      })
    }, { timeout: 2000 })
  })

  it('disables buttons during loading', () => {
    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={true}
      />
    )

    // Both main action buttons should be disabled
    expect(screen.getByText('Import Sample Data')).toBeInTheDocument()
    const startFreshButtons = screen.getAllByText('Start Fresh')
    expect(startFreshButtons[1]).toBeInTheDocument()
  })

  it('shows correct preview content structure', () => {
    renderWithProviders(
      <InvoiceImportStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    // Check for reminder preview structure
    expect(screen.getByText('Here\'s what your clients will receive when invoices become overdue:')).toBeInTheDocument()
    expect(screen.getByText(/We hope this message finds you well/)).toBeInTheDocument()
    expect(screen.getByText(/Amount: \$250\.00/)).toBeInTheDocument()
    expect(screen.getByText(/Thank you for your business!/)).toBeInTheDocument()
  })
})
