import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PaymentConfigStep } from './PaymentConfigStep'
import { apiClient } from '@/api/client'

// Mock the API
vi.mock('@/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    patch: vi.fn()
  }
}))

// Mock window.location with proper setter
const mockLocation = {
  href: '',
  assign: vi.fn(),
  replace: vi.fn()
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
  configurable: true
})

function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    ),
    queryClient
  }
}

describe('PaymentConfigStep', () => {
  const mockOnNext = vi.fn()
  const mockOnBack = vi.fn()

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    stripe_account_id: null,
    payment_method: null
  }

  const mockStripeUser = {
    id: 1,
    email: 'test@example.com',
    stripe_account_id: 'acct_123',
    payment_method: 'stripe'
  }

  const mockManualUser = {
    id: 1,
    email: 'test@example.com',
    stripe_account_id: null,
    payment_method: 'manual'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockLocation.href = ''
  })

  it('renders payment configuration options for unconfigured users', () => {
    renderWithProviders(
      <PaymentConfigStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('Configure Payment Processing')).toBeInTheDocument()
    expect(screen.getByText('Automated Payments')).toBeInTheDocument()
    expect(screen.getByText('Manual Invoicing')).toBeInTheDocument()
    expect(screen.getByText('Connect Stripe')).toBeInTheDocument()
    expect(screen.getByText('Use Manual Invoicing')).toBeInTheDocument()
  })

  it('shows configured state for Stripe users', () => {
    renderWithProviders(
      <PaymentConfigStep
        user={mockStripeUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('Payment Method Configured')).toBeInTheDocument()
    expect(screen.getByText('Stripe is connected and ready to accept payments.')).toBeInTheDocument()
    expect(screen.getByText('Continue to Invoice Import')).toBeInTheDocument()
  })

  it('shows configured state for manual payment users', () => {
    renderWithProviders(
      <PaymentConfigStep
        user={mockManualUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('Payment Method Configured')).toBeInTheDocument()
    expect(screen.getByText('Manual payment tracking is configured.')).toBeInTheDocument()
    expect(screen.getByText('Continue to Invoice Import')).toBeInTheDocument()
  })

  it('handles Stripe connection process', async () => {
    const stripeConnectResponse = {
      authorization_url: 'https://connect.stripe.com/oauth/authorize?client_id=123'
    }
    vi.mocked(apiClient.post).mockResolvedValue({ data: stripeConnectResponse })

    renderWithProviders(
      <PaymentConfigStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    // Use the correct button text from the component
    fireEvent.click(screen.getByText('Connect Stripe'))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled()
      expect(mockLocation.href).toBe(stripeConnectResponse.authorization_url)
    }, { timeout: 2000 })
  })

  it('handles manual payment configuration', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { ...mockUser, payment_method: 'manual' }
    })

    renderWithProviders(
      <PaymentConfigStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Use Manual Invoicing'))

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/auth/me', {
        payment_method: 'manual'
      })
      expect(mockOnNext).toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('shows loading state during Stripe connection', async () => {
    vi.mocked(apiClient.post).mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithProviders(
      <PaymentConfigStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Connect Stripe'))

    await waitFor(() => {
      expect(screen.getByText('Connecting to Stripe...')).toBeInTheDocument()
    })
  })

  it('shows loading state during manual configuration', async () => {
    vi.mocked(apiClient.patch).mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithProviders(
      <PaymentConfigStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Use Manual Invoicing'))

    await waitFor(() => {
      expect(screen.getByText('Configuring...')).toBeInTheDocument()
    })
  })

  it('proceeds to next step when payment is already configured', () => {
    renderWithProviders(
      <PaymentConfigStep
        user={mockStripeUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Continue to Invoice Import'))

    expect(mockOnNext).toHaveBeenCalled()
  })

  it('disables continue button during loading', () => {
    renderWithProviders(
      <PaymentConfigStep
        user={mockStripeUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={true}
      />
    )

    const continueButton = screen.getByText('Continue to Invoice Import')
    expect(continueButton).toBeDisabled()
  })

  it('displays Stripe payment features', () => {
    renderWithProviders(
      <PaymentConfigStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('Automatic payment collection')).toBeInTheDocument()
    expect(screen.getByText('Payment link generation')).toBeInTheDocument()
    expect(screen.getByText('Real-time payment status')).toBeInTheDocument()
    expect(screen.getByText('Multiple payment methods')).toBeInTheDocument()
  })

  it('displays manual payment features', () => {
    renderWithProviders(
      <PaymentConfigStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('Invoice generation & sending')).toBeInTheDocument()
    expect(screen.getByText('Payment tracking & reminders')).toBeInTheDocument()
    expect(screen.getByText('No transaction fees')).toBeInTheDocument()
    expect(screen.getByText('Full control over process')).toBeInTheDocument()
  })

  it('shows helpful payment method tips', () => {
    renderWithProviders(
      <PaymentConfigStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('💡 Payment Method Tips')).toBeInTheDocument()
    expect(screen.getByText(/Choose Stripe if:/)).toBeInTheDocument()
    expect(screen.getByText(/Choose Manual if:/)).toBeInTheDocument()
    expect(screen.getByText(/You can always change this setting later/)).toBeInTheDocument()
  })

  it('handles API errors during Stripe connection', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Stripe connection failed'))

    renderWithProviders(
      <PaymentConfigStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Connect Stripe'))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled()
      // Should not redirect on error
      expect(mockLocation.href).toBe('')
    }, { timeout: 2000 })
  })

  it('handles API errors during manual configuration', async () => {
    vi.mocked(apiClient.patch).mockRejectedValue(new Error('Manual config failed'))

    renderWithProviders(
      <PaymentConfigStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Use Manual Invoicing'))

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalled()
      expect(mockOnNext).not.toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('tracks events for payment method selection', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { ...mockUser, payment_method: 'manual' }
    })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })

    renderWithProviders(
      <PaymentConfigStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Use Manual Invoicing'))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/events', {
        entity_type: 'user',
        entity_id: 1,
        event_type: 'manual_payment_selected',
        payload: { method: 'manual' }
      })
    }, { timeout: 2000 })
  })
})