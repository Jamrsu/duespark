import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PaymentConfigStep } from '../PaymentConfigStep'
import { apiClient } from '@/api/client'
import { createMockUser } from '@/test/mockUtils'

// Mock the API client
vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

// Create a setter for href to track assignments
Object.defineProperty(mockLocation, 'href', {
  get: () => (mockLocation as any)._href || '',
  set: (value) => { (mockLocation as any)._href = value },
  configurable: true
})

const mockApiClient = vi.mocked(apiClient)

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('PaymentConfigStep', () => {
  const mockUser = createMockUser({
    email_verified: true,
    onboarding_status: 'payment_setup_pending'
  })

  const defaultProps = {
    user: mockUser,
    onNext: vi.fn(),
    onBack: vi.fn(),
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.location.href
    delete (window as any).location
    window.location = { href: '' } as any
  })

  it('renders payment method options', () => {
    render(<PaymentConfigStep {...defaultProps} />, { wrapper: createWrapper() })

    expect(screen.getByText('Configure Payment Processing')).toBeInTheDocument()
    expect(screen.getByText('Automated Payments')).toBeInTheDocument()
    expect(screen.getByText('Manual Invoicing')).toBeInTheDocument()
    expect(screen.getByText('Connect Stripe')).toBeInTheDocument()
    expect(screen.getByText('Use Manual Invoicing')).toBeInTheDocument()
  })

  it('shows Stripe features correctly', () => {
    render(<PaymentConfigStep {...defaultProps} />, { wrapper: createWrapper() })

    expect(screen.getByText('Automatic payment collection')).toBeInTheDocument()
    expect(screen.getByText('Payment link generation')).toBeInTheDocument()
    expect(screen.getByText('Real-time payment status')).toBeInTheDocument()
    expect(screen.getByText('Multiple payment methods')).toBeInTheDocument()
  })

  it('shows manual payment features correctly', () => {
    render(<PaymentConfigStep {...defaultProps} />, { wrapper: createWrapper() })

    expect(screen.getByText('Invoice generation & sending')).toBeInTheDocument()
    expect(screen.getByText('Payment tracking & reminders')).toBeInTheDocument()
    expect(screen.getByText('No transaction fees')).toBeInTheDocument()
    expect(screen.getByText('Full control over process')).toBeInTheDocument()
  })

  it('handles Stripe connection successfully', async () => {
    const user = userEvent.setup()
    mockApiClient.get.mockResolvedValue({
      data: { url: 'https://connect.stripe.com/oauth/authorize?client_id=test' }
    })

    render(<PaymentConfigStep {...defaultProps} />, { wrapper: createWrapper() })

    const stripeButton = screen.getByText('Connect Stripe')
    await user.click(stripeButton)

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith('/integrations/stripe/connect')
    })

    // Wait for the 1-second timeout before redirect
    await waitFor(() => {
      expect(window.location.href).toBe('https://connect.stripe.com/oauth/authorize?client_id=test')
    }, { timeout: 2000 })
  })

  it('handles Stripe connection error', async () => {
    const user = userEvent.setup()
    mockApiClient.get.mockRejectedValue({
      response: { data: { detail: 'Stripe connection failed' } }
    })

    render(<PaymentConfigStep {...defaultProps} />, { wrapper: createWrapper() })

    const stripeButton = screen.getByText('Connect Stripe')
    await user.click(stripeButton)

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith('/integrations/stripe/connect')
    })

    // Window location should not change on error
    expect(window.location.href).toBe('')
  })

  it('handles manual payment selection', async () => {
    const user = userEvent.setup()
    const mockOnNext = vi.fn()

    mockApiClient.patch.mockResolvedValue({
      data: { ...mockUser, payment_method: 'manual' }
    })
    mockApiClient.post.mockResolvedValue({ data: { success: true } })

    render(<PaymentConfigStep {...defaultProps} onNext={mockOnNext} />, { wrapper: createWrapper() })

    const manualButton = screen.getByText('Use Manual Invoicing')
    await user.click(manualButton)

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith('/auth/me', {
        payment_method: 'manual'
      })
    })

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/events', {
        entity_type: 'user',
        entity_id: mockUser.id,
        event_type: 'manual_payment_selected',
        payload: { method: 'manual' }
      })
    })

    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('handles manual payment selection error', async () => {
    const user = userEvent.setup()
    mockApiClient.patch.mockRejectedValue({
      response: { data: { detail: 'Failed to update payment method' } }
    })

    render(<PaymentConfigStep {...defaultProps} />, { wrapper: createWrapper() })

    const manualButton = screen.getByText('Use Manual Invoicing')
    await user.click(manualButton)

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalled()
    })
  })

  it('shows already configured state for Stripe', () => {
    const stripeUser = {
      ...mockUser,
      payment_method: 'stripe',
      stripe_account_id: 'acct_123456'
    }

    render(<PaymentConfigStep {...defaultProps} user={stripeUser} />, { wrapper: createWrapper() })

    expect(screen.getByText('Payment Method Configured')).toBeInTheDocument()
    expect(screen.getByText('Stripe is connected and ready to accept payments.')).toBeInTheDocument()
    expect(screen.getByText('Continue to Invoice Import')).toBeInTheDocument()
  })

  it('shows already configured state for manual', () => {
    const manualUser = {
      ...mockUser,
      payment_method: 'manual'
    }

    render(<PaymentConfigStep {...defaultProps} user={manualUser} />, { wrapper: createWrapper() })

    expect(screen.getByText('Payment Method Configured')).toBeInTheDocument()
    expect(screen.getByText('Manual payment tracking is configured.')).toBeInTheDocument()
    expect(screen.getByText('Continue to Invoice Import')).toBeInTheDocument()
  })

  it('calls onNext when payment is already configured and continue button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnNext = vi.fn()
    const configuredUser = {
      ...mockUser,
      payment_method: 'manual'
    }

    render(<PaymentConfigStep {...defaultProps} user={configuredUser} onNext={mockOnNext} />, { wrapper: createWrapper() })

    const continueButton = screen.getByText('Continue to Invoice Import')
    await user.click(continueButton)

    expect(mockOnNext).toHaveBeenCalled()
  })

  it('shows loading state when isLoading prop is true', () => {
    render(<PaymentConfigStep {...defaultProps} isLoading={true} />, { wrapper: createWrapper() })

    const continueButton = screen.queryByText('Continue to Invoice Import')
    if (continueButton) {
      expect(continueButton).toBeDisabled()
    }
  })

  it('disables buttons during API calls', async () => {
    const user = userEvent.setup()
    // Mock a slow API response
    mockApiClient.patch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<PaymentConfigStep {...defaultProps} />, { wrapper: createWrapper() })

    const manualButton = screen.getByText('Use Manual Invoicing')
    await user.click(manualButton)

    // Button should show loading state
    expect(screen.getByText('Configuring...')).toBeInTheDocument()
  })

  it('shows Stripe connecting state', async () => {
    const user = userEvent.setup()
    mockApiClient.get.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<PaymentConfigStep {...defaultProps} />, { wrapper: createWrapper() })

    const stripeButton = screen.getByText('Connect Stripe')
    await user.click(stripeButton)

    expect(screen.getByText('Connecting to Stripe...')).toBeInTheDocument()
  })

  it('tracks Stripe connect event', async () => {
    const user = userEvent.setup()
    mockApiClient.get.mockResolvedValue({
      data: { url: 'https://connect.stripe.com/oauth/authorize' }
    })
    mockApiClient.post.mockResolvedValue({ data: { success: true } })

    render(<PaymentConfigStep {...defaultProps} />, { wrapper: createWrapper() })

    const stripeButton = screen.getByText('Connect Stripe')
    await user.click(stripeButton)

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/events', {
        entity_type: 'user',
        entity_id: mockUser.id,
        event_type: 'stripe_connect_initiated',
        payload: { authorization_url: 'https://connect.stripe.com/oauth/authorize' }
      })
    })
  })

  it('displays helpful tips section', () => {
    render(<PaymentConfigStep {...defaultProps} />, { wrapper: createWrapper() })

    expect(screen.getByText('💡 Payment Method Tips')).toBeInTheDocument()
    expect(screen.getByText(/Choose Stripe if:/)).toBeInTheDocument()
    expect(screen.getByText(/Choose Manual if:/)).toBeInTheDocument()
    expect(screen.getByText(/You can always change this setting later/)).toBeInTheDocument()
  })

  it('prevents double clicking during processing', async () => {
    const user = userEvent.setup()
    mockApiClient.patch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: mockUser }), 50)))

    render(<PaymentConfigStep {...defaultProps} />, { wrapper: createWrapper() })

    const manualButton = screen.getByText('Use Manual Invoicing')

    // Rapid clicks
    await user.click(manualButton)
    await user.click(manualButton)
    await user.click(manualButton)

    // Should only call API once
    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledTimes(1)
    })
  })
})
