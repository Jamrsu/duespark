import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { OnboardingView } from '../OnboardingView'
import { useAuth, apiClient } from '@/api/client'

// Mock the auth client
vi.mock('@/api/client', () => ({
  useAuth: vi.fn(),
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock components that might not be relevant for this test
vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading">Loading...</div>
}))

const mockUseAuth = vi.mocked(useAuth)
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
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OnboardingView', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    onboarding_status: 'account_created',
    email_verified: false,
    payment_method: null,
    stripe_account_id: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      isAuthenticated: () => true,
      logout: vi.fn(),
      getToken: () => 'mock-token',
      clearAllAuthData: vi.fn(),
    })
  })

  it('renders onboarding welcome screen', async () => {
    mockApiClient.get.mockResolvedValue({
      success: true,
      data: mockUser,
      meta: {}
    })

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Welcome to DueSpark!')).toBeInTheDocument()
      expect(screen.getByText('Let\'s get your account set up in just a few steps.')).toBeInTheDocument()
    })
  })

  it('shows step 1 (Account Setup) initially', async () => {
    mockApiClient.get.mockResolvedValue({
      success: true,
      data: mockUser,
      meta: {}
    })

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Account Setup')).toBeInTheDocument()
      expect(screen.getByText('Verify your email address')).toBeInTheDocument()
    })
  })

  it('progresses through steps correctly', async () => {
    const user = userEvent.setup()
    mockApiClient.get.mockResolvedValue({
      success: true,
      data: mockUser,
      meta: {}
    })
    mockApiClient.post.mockResolvedValue({
      data: { message: 'Verification email sent', demo_auto_verified: true }
    })
    mockApiClient.patch.mockResolvedValue({
      data: { ...mockUser, email_verified: true, onboarding_status: 'email_verified' }
    })

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Verify Email')).toBeInTheDocument()
    })

    // Click verify email button
    const verifyButton = screen.getByText('Verify Email')
    await user.click(verifyButton)

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/send-verification', {
        email: mockUser.email
      })
    })
  })

  it('handles email verification error', async () => {
    const user = userEvent.setup()
    mockApiClient.get.mockResolvedValue({
      success: true,
      data: mockUser,
      meta: {}
    })
    mockApiClient.post.mockRejectedValue({
      response: { data: { detail: 'Email verification failed' } }
    })

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Verify Email')).toBeInTheDocument()
    })

    const verifyButton = screen.getByText('Verify Email')
    await user.click(verifyButton)

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalled()
    })
  })

  it('shows step 2 (Payment Configuration) when email is verified', async () => {
    const verifiedUser = {
      ...mockUser,
      email_verified: true,
      onboarding_status: 'email_verified'
    }
    mockApiClient.get.mockResolvedValue({ data: verifiedUser })

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Configure Payment Processing')).toBeInTheDocument()
      expect(screen.getByText('Connect Stripe')).toBeInTheDocument()
      expect(screen.getByText('Use Manual Invoicing')).toBeInTheDocument()
    })
  })

  it('handles Stripe connection', async () => {
    const user = userEvent.setup()
    const verifiedUser = {
      ...mockUser,
      email_verified: true,
      onboarding_status: 'email_verified'
    }
    mockApiClient.get.mockResolvedValue({ data: verifiedUser })
    mockApiClient.get.mockResolvedValueOnce({ data: { url: 'https://connect.stripe.com/oauth/authorize' } })

    // Mock window.location.href
    delete (window as any).location
    window.location = { href: '' } as any

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Connect Stripe')).toBeInTheDocument()
    })

    const stripeButton = screen.getByText('Connect Stripe')
    await user.click(stripeButton)

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith('/integrations/stripe/connect')
    })
  })

  it('handles manual payment selection', async () => {
    const user = userEvent.setup()
    const verifiedUser = {
      ...mockUser,
      email_verified: true,
      onboarding_status: 'email_verified'
    }
    mockApiClient.get.mockResolvedValue({ data: verifiedUser })
    mockApiClient.patch.mockResolvedValue({
      data: { ...verifiedUser, payment_method: 'manual' }
    })

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Use Manual Invoicing')).toBeInTheDocument()
    })

    const manualButton = screen.getByText('Use Manual Invoicing')
    await user.click(manualButton)

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith('/auth/me', {
        payment_method: 'manual'
      })
    })
  })

  it('shows step 3 (Invoice Import) when payment is configured', async () => {
    const paymentConfiguredUser = {
      ...mockUser,
      email_verified: true,
      onboarding_status: 'payment_configured',
      payment_method: 'manual'
    }
    mockApiClient.get.mockResolvedValue({ data: paymentConfiguredUser })

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Import Your Data')).toBeInTheDocument()
      expect(screen.getByText('Create Sample Data')).toBeInTheDocument()
      expect(screen.getByText('Start Fresh')).toBeInTheDocument()
    })
  })

  it('handles sample data creation', async () => {
    const user = userEvent.setup()
    const paymentConfiguredUser = {
      ...mockUser,
      email_verified: true,
      onboarding_status: 'payment_configured',
      payment_method: 'manual'
    }
    mockApiClient.get.mockResolvedValue({ data: paymentConfiguredUser })
    mockApiClient.post.mockResolvedValue({
      data: {
        clients_created: 3,
        invoices_created: 6,
        message: 'Sample data created successfully'
      }
    })

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Create Sample Data')).toBeInTheDocument()
    })

    const sampleDataButton = screen.getByText('Create Sample Data')
    await user.click(sampleDataButton)

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/onboarding/sample-data')
    })
  })

  it('allows skipping to completion', async () => {
    const user = userEvent.setup()
    const paymentConfiguredUser = {
      ...mockUser,
      email_verified: true,
      onboarding_status: 'payment_configured',
      payment_method: 'manual'
    }
    mockApiClient.get.mockResolvedValue({ data: paymentConfiguredUser })
    mockApiClient.patch.mockResolvedValue({
      data: { ...paymentConfiguredUser, onboarding_status: 'completed' }
    })

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Start Fresh')).toBeInTheDocument()
    })

    const skipButton = screen.getByText('Start Fresh')
    await user.click(skipButton)

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith('/auth/me', {
        onboarding_status: 'completed'
      })
    })
  })

  it('shows completion screen', async () => {
    const completedUser = {
      ...mockUser,
      email_verified: true,
      onboarding_status: 'completed',
      payment_method: 'manual'
    }
    mockApiClient.get.mockResolvedValue({ data: completedUser })

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Welcome to DueSpark!')).toBeInTheDocument()
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    })
  })

  it('handles navigation between steps', async () => {
    const user = userEvent.setup()
    const verifiedUser = {
      ...mockUser,
      email_verified: true,
      onboarding_status: 'email_verified'
    }
    mockApiClient.get.mockResolvedValue({ data: verifiedUser })

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Configure Payment Processing')).toBeInTheDocument()
    })

    // Should be able to go back to previous step
    const backButton = screen.getByText('Back')
    expect(backButton).toBeInTheDocument()

    await user.click(backButton)

    await waitFor(() => {
      expect(screen.getByText('Account Setup')).toBeInTheDocument()
    })
  })

  it('displays progress correctly', async () => {
    mockApiClient.get.mockResolvedValue({
      success: true,
      data: mockUser,
      meta: {}
    })

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      // Should show step indicators
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    // Step 1 should be active
    const step1 = screen.getByText('1').closest('div')
    expect(step1).toHaveClass('bg-primary-600')
  })

  it('handles loading states properly', async () => {
    // Mock a slow API response
    mockApiClient.get.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<OnboardingView />, { wrapper: createWrapper() })

    expect(screen.getByTestId('loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })
  })

  it('prevents double submission', async () => {
    const user = userEvent.setup()
    const verifiedUser = {
      ...mockUser,
      email_verified: true,
      onboarding_status: 'email_verified'
    }
    mockApiClient.get.mockResolvedValue({ data: verifiedUser })
    mockApiClient.patch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<OnboardingView />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Use Manual Invoicing')).toBeInTheDocument()
    })

    const manualButton = screen.getByText('Use Manual Invoicing')

    // Click multiple times rapidly
    await user.click(manualButton)
    await user.click(manualButton)
    await user.click(manualButton)

    // Should only call the API once
    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledTimes(1)
    })
  })
})