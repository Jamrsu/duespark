import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ClientCreateView } from './ClientCreateView'

// Mock the hooks
const mockNavigate = vi.fn()
const mockCreateClient = {
  mutateAsync: vi.fn(),
  isPending: false
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

vi.mock('@/api/hooks', () => ({
  useCreateClient: () => mockCreateClient
}))

// Mock the form component
vi.mock('@/components/forms/ClientForm', () => ({
  ClientForm: ({ onSubmit, isLoading }: any) => (
    <div data-testid="client-form">
      <button 
        onClick={() => onSubmit({
          name: 'Test Client',
          email: 'test@example.com',
          timezone: 'America/New_York'
        })}
        disabled={isLoading}
      >
        {isLoading ? 'Creating...' : 'Submit Test'}
      </button>
    </div>
  )
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />
}))

const renderWithProviders = (component: React.ReactElement) => {
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

describe('ClientCreateView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page title and description', () => {
    renderWithProviders(<ClientCreateView />)

    expect(screen.getByText('Add New Client')).toBeInTheDocument()
    expect(screen.getByText('Create a new client for your business')).toBeInTheDocument()
  })

  it('renders back button with correct navigation', () => {
    renderWithProviders(<ClientCreateView />)

    const backButton = screen.getByLabelText('Back to clients')
    expect(backButton).toBeInTheDocument()

    fireEvent.click(backButton)
    expect(mockNavigate).toHaveBeenCalledWith('/clients')
  })

  it('renders the client form', () => {
    renderWithProviders(<ClientCreateView />)

    expect(screen.getByTestId('client-form')).toBeInTheDocument()
  })

  it('renders quick actions sidebar', () => {
    renderWithProviders(<ClientCreateView />)

    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('Create Invoice')).toBeInTheDocument()
    expect(screen.getByText('View All Clients')).toBeInTheDocument()
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
  })

  it('renders tips section', () => {
    renderWithProviders(<ClientCreateView />)

    expect(screen.getByText('Tips')).toBeInTheDocument()
    expect(screen.getByText(/Use the client's business email/)).toBeInTheDocument()
    expect(screen.getByText(/Setting timezone helps/)).toBeInTheDocument()
    expect(screen.getByText(/All client information can be updated/)).toBeInTheDocument()
  })

  it('handles client creation successfully', async () => {
    const mockClient = { id: 123, name: 'Test Client', email: 'test@example.com' }
    mockCreateClient.mutateAsync.mockResolvedValue(mockClient)

    renderWithProviders(<ClientCreateView />)

    const submitButton = screen.getByText('Submit Test')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockCreateClient.mutateAsync).toHaveBeenCalledWith({
        name: 'Test Client',
        email: 'test@example.com',
        timezone: 'America/New_York'
      })
    })

    expect(mockNavigate).toHaveBeenCalledWith('/clients/123')
  })

  it('handles client creation error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCreateClient.mutateAsync.mockRejectedValue(new Error('Creation failed'))

    renderWithProviders(<ClientCreateView />)

    const submitButton = screen.getByText('Submit Test')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockCreateClient.mutateAsync).toHaveBeenCalled()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Failed to create client:', expect.any(Error))
    expect(mockNavigate).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('quick action buttons navigate correctly', () => {
    renderWithProviders(<ClientCreateView />)

    fireEvent.click(screen.getByText('Create Invoice'))
    expect(mockNavigate).toHaveBeenCalledWith('/invoices/new')

    fireEvent.click(screen.getByText('View All Clients'))
    expect(mockNavigate).toHaveBeenCalledWith('/clients')

    fireEvent.click(screen.getByText('Back to Dashboard'))
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('passes loading state to form component', () => {
    mockCreateClient.isPending = true

    renderWithProviders(<ClientCreateView />)

    // The form should show loading state
    expect(screen.getByText('Creating...')).toBeInTheDocument()
  })
})