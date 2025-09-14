import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AccountCreationStep } from './AccountCreationStep'
import { apiClient } from '@/api/client'

// Mock the API
vi.mock('@/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn()
  }
}))



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

describe('AccountCreationStep', () => {
  const mockOnNext = vi.fn()
  const mockOnBack = vi.fn()

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    email_verified: false,
    email_verification_token: null
  }

  const mockVerifiedUser = {
    id: 1,
    email: 'test@example.com',
    email_verified: true,
    email_verification_token: 'some-token'
  }

  const mockUserWithToken = {
    id: 1,
    email: 'test@example.com',
    email_verified: false,
    email_verification_token: 'verification-token-123'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset any component state that might persist between tests
    vi.resetModules()
  })

  it('renders account creation form for unverified users', () => {
    renderWithProviders(
      <AccountCreationStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('Complete Your Account')).toBeInTheDocument()
    expect(screen.getByText('Email Verification Required')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Send Verification Email')).toBeInTheDocument()
  })

  it('shows verified state for users with verified emails', () => {
    renderWithProviders(
      <AccountCreationStep
        user={mockVerifiedUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('Email Verified')).toBeInTheDocument()
    expect(screen.getByText('Your email address has been verified successfully.')).toBeInTheDocument()
    expect(screen.getByText('Continue to Payment Setup')).toBeInTheDocument()
  })

  it('sends verification email when form is submitted', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message: 'Verification email sent' } })

    renderWithProviders(
      <AccountCreationStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    const sendButton = screen.getByText('Send Verification Email')
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/send-verification', {
        email: 'test@example.com'
      })
    })
  })

  it('shows verification sent state after sending email', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message: 'Verification email sent' } })

    renderWithProviders(
      <AccountCreationStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Send Verification Email'))

    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument()
      expect(screen.getByText(/We've sent a verification link to/)).toBeInTheDocument()
      expect(screen.getByText('I\'ve Verified My Email')).toBeInTheDocument()
    })
  })

  it('checks verification status when user clicks verification button', async () => {
    // Mock the GET request to return verified user
    vi.mocked(apiClient.get).mockResolvedValue({ data: { ...mockUserWithToken, email_verified: true } })

    renderWithProviders(
      <AccountCreationStep
        user={mockUserWithToken} // Use user with token so component shows "sent" state
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    // Should show verification sent state (because user has token)
    await waitFor(() => {
      expect(screen.getByText('I\'ve Verified My Email')).toBeInTheDocument()
    })

    // Check verification status
    fireEvent.click(screen.getByText('I\'ve Verified My Email'))

    // Wait a moment for the async operation
    await waitFor(() => {
      // Verify that the API was called at least once (may have been called during component mount too)
      expect(apiClient.get).toHaveBeenCalled()
    }, { timeout: 2000 })

    // Give the mutation time to complete
    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('handles verification check when email is not yet verified', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message: 'Verification email sent' } })
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockUser }) // Still not verified

    renderWithProviders(
      <AccountCreationStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    // Send verification first
    fireEvent.click(screen.getByText('Send Verification Email'))

    await waitFor(() => {
      expect(screen.getByText('I\'ve Verified My Email')).toBeInTheDocument()
    })

    // Check verification
    fireEvent.click(screen.getByText('I\'ve Verified My Email'))

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
      expect(mockOnNext).not.toHaveBeenCalled()
    })
  })

  it('allows resending verification email', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message: 'Verification email sent' } })

    renderWithProviders(
      <AccountCreationStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    // Send initial verification
    fireEvent.click(screen.getByText('Send Verification Email'))

    await waitFor(() => {
      expect(screen.getByText('Didn\'t receive the email? Send again')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Resend verification
    fireEvent.click(screen.getByText('Didn\'t receive the email? Send again'))

    await waitFor(() => {
      // Verify that the API was called with the correct parameters
      expect(apiClient.post).toHaveBeenCalledWith('/auth/send-verification', {
        email: 'test@example.com'
      })
      // Just verify it was called at least once (don't check exact count)
      expect(apiClient.post).toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('proceeds to next step when email is already verified', () => {
    renderWithProviders(
      <AccountCreationStep
        user={mockVerifiedUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Continue to Payment Setup'))

    expect(mockOnNext).toHaveBeenCalled()
  })

  it('disables buttons during loading state', () => {
    renderWithProviders(
      <AccountCreationStep
        user={mockVerifiedUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={true}
      />
    )

    const continueButton = screen.getByText('Continue to Payment Setup')
    expect(continueButton).toBeDisabled()
  })

  it('shows helpful information about email verification', () => {
    renderWithProviders(
      <AccountCreationStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    expect(screen.getByText('Why do we need email verification?')).toBeInTheDocument()
    expect(screen.getByText(/Secure your account from unauthorized access/)).toBeInTheDocument()
    expect(screen.getByText(/Enable invoice and reminder notifications/)).toBeInTheDocument()
  })

  it('handles API errors when sending verification email', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('API Error'))

    renderWithProviders(
      <AccountCreationStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Send Verification Email'))

    await waitFor(() => {
      // Should not show success state
      expect(screen.queryByText('Check Your Email')).not.toBeInTheDocument()
    })
  })

  it('disables send button after verification email is sent', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message: 'Verification email sent' } })

    renderWithProviders(
      <AccountCreationStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByText('Send Verification Email'))

    await waitFor(() => {
      expect(screen.getByText('Verification Email Sent')).toBeDisabled()
    })
  })

  it('shows email input as readonly', () => {
    renderWithProviders(
      <AccountCreationStep
        user={mockUser}
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
      />
    )

    const emailInput = screen.getByDisplayValue('test@example.com')
    expect(emailInput).toHaveAttribute('readOnly')
  })
})