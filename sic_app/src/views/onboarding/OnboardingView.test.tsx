import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { OnboardingView } from './OnboardingView'
import { apiClient } from '@/api/client'

// Mock the API
vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn()
  }
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))


const mockUser = {
  id: 1,
  email: 'test@example.com',
  onboarding_status: 'not_started',
  email_verified: false,
  stripe_account_id: null,
  payment_method: null
}

function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('OnboardingView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful user fetch
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockUser })
  })

  it('renders onboarding header and progress steps', async () => {
    renderWithProviders(<OnboardingView />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to SIC')).toBeInTheDocument()
      expect(screen.getByText('Let\'s get your invoice management system set up in just a few steps')).toBeInTheDocument()
    })

    expect(screen.getByText('Account Setup')).toBeInTheDocument()
    expect(screen.getByText('Payment Configuration')).toBeInTheDocument()
    expect(screen.getByText('Import & Preview')).toBeInTheDocument()
  })

  it('shows loading state while fetching user data', () => {
    vi.mocked(apiClient.get).mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithProviders(<OnboardingView />)

    expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
  })

  it('redirects to dashboard if onboarding is already completed', async () => {
    const completedUser = { ...mockUser, onboarding_status: 'completed' }
    vi.mocked(apiClient.get).mockResolvedValue({ data: completedUser })

    renderWithProviders(<OnboardingView />)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('starts at correct step based on onboarding status', async () => {
    const emailVerifiedUser = { ...mockUser, onboarding_status: 'email_verified' }
    vi.mocked(apiClient.get).mockResolvedValue({ data: emailVerifiedUser })

    renderWithProviders(<OnboardingView />)

    await waitFor(() => {
      expect(screen.getByText('Step 2: Payment Configuration')).toBeInTheDocument()
    })
  })

  it('tracks onboarding start event for new users', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: mockUser })

    renderWithProviders(<OnboardingView />)

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/events', {
        entity_type: 'user',
        entity_id: 1,
        event_type: 'onboarding_started',
        payload: { step: 0 }
      })
    })

    expect(apiClient.patch).toHaveBeenCalledWith('/auth/me', {
      onboarding_status: 'account_created'
    })
  })

  it('handles skip onboarding functionality', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { ...mockUser, onboarding_status: 'completed' } })

    renderWithProviders(<OnboardingView />)

    await waitFor(() => {
      expect(screen.getByText('Skip for now')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Skip Setup'))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/events', {
        entity_type: 'user',
        entity_id: 1,
        event_type: 'onboarding_skipped',
        payload: { step: 0 }
      })

      expect(apiClient.patch).toHaveBeenCalledWith('/auth/me', {
        onboarding_status: 'completed'
      })

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('updates progress when moving between steps', async () => {
    const emailVerifiedUser = { ...mockUser, onboarding_status: 'email_verified', email_verified: true }
    vi.mocked(apiClient.get).mockResolvedValue({ data: emailVerifiedUser })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { ...emailVerifiedUser, onboarding_status: 'payment_configured' } })

    renderWithProviders(<OnboardingView />)

    await waitFor(() => {
      expect(screen.getByText('Step 2: Payment Configuration')).toBeInTheDocument()
    })

    // Mock next step progression
    fireEvent.click(screen.getByText('Next Step'))

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/auth/me', {
        onboarding_status: 'payment_configured'
      })
    })
  })

  it('completes onboarding on final step', async () => {
    const finalStepUser = {
      ...mockUser,
      onboarding_status: 'payment_configured',
      email_verified: true,
      payment_method: 'stripe'
    }
    vi.mocked(apiClient.get).mockResolvedValue({ data: finalStepUser })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { ...finalStepUser, onboarding_status: 'completed' } })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })

    renderWithProviders(<OnboardingView />)

    await waitFor(() => {
      expect(screen.getByText('Step 3: Import & Preview')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Complete Setup'))

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/auth/me', {
        onboarding_status: 'completed'
      })

      expect(apiClient.post).toHaveBeenCalledWith('/events', {
        entity_type: 'user',
        entity_id: 1,
        event_type: 'onboarding_completed',
        payload: { step: 2 }
      })

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('handles back navigation between steps', async () => {
    const emailVerifiedUser = { ...mockUser, onboarding_status: 'email_verified', email_verified: true }
    vi.mocked(apiClient.get).mockResolvedValue({ data: emailVerifiedUser })

    renderWithProviders(<OnboardingView />)

    await waitFor(() => {
      expect(screen.getByText('Step 2: Payment Configuration')).toBeInTheDocument()
    })

    // Back button should be enabled
    const backButton = screen.getByText('Back')
    expect(backButton).not.toBeDisabled()

    fireEvent.click(backButton)

    await waitFor(() => {
      expect(screen.getByText('Step 1: Account Setup')).toBeInTheDocument()
    })
  })

  it('disables back button on first step', async () => {
    renderWithProviders(<OnboardingView />)

    await waitFor(() => {
      expect(screen.getByText('Step 1: Account Setup')).toBeInTheDocument()
    })

    const backButton = screen.getByText('Back')
    expect(backButton).toBeDisabled()
  })

  it('handles API errors gracefully', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('API Error'))

    renderWithProviders(<OnboardingView />)

    // Should still render basic structure even with API errors
    await waitFor(() => {
      expect(screen.getByText('Welcome to SIC')).toBeInTheDocument()
    })
  })
})