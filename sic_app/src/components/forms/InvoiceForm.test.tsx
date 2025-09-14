import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InvoiceForm } from './InvoiceForm'
import { CreateInvoiceRequest } from '@/types/api'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  User: () => <div data-testid="user-icon" />,
  CalendarDays: () => <div data-testid="calendar-icon" />,
}))

describe('InvoiceForm', () => {
  const mockClients = [
    { id: 1, name: 'Acme Corporation', email: 'billing@acme.com', contact_name: 'John Smith', contact_phone: '+1 (555) 123-4567' },
    { id: 2, name: 'Tech Solutions Inc', email: 'accounts@techsolutions.com', contact_name: 'Sarah Johnson', contact_phone: '+1 (555) 987-6543' },
  ]

  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(
      <InvoiceForm
        clients={mockClients}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getByLabelText(/client/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/initial status/i)).toBeInTheDocument()
  })

  it('displays client options correctly', () => {
    render(
      <InvoiceForm
        clients={mockClients}
        onSubmit={mockOnSubmit}
      />
    )

    const clientSelect = screen.getByLabelText(/client/i)
    expect(clientSelect).toBeInTheDocument()
    expect(screen.getByText('Acme Corporation (billing@acme.com)')).toBeInTheDocument()
    expect(screen.getByText('Tech Solutions Inc (accounts@techsolutions.com)')).toBeInTheDocument()
  })

  it('shows validation errors for required fields', async () => {
    render(
      <InvoiceForm
        clients={mockClients}
        onSubmit={mockOnSubmit}
      />
    )

    const submitButton = screen.getByRole('button', { name: /create invoice/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Please select a client/)).toBeInTheDocument()
      expect(screen.getByText(/Amount must be greater than \$0\.01/)).toBeInTheDocument()
      expect(screen.getByText(/Due date is required/)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates amount field correctly', async () => {
    render(
      <InvoiceForm
        clients={mockClients}
        onSubmit={mockOnSubmit}
      />
    )

    const amountInput = screen.getByLabelText(/amount/i)
    
    // Test with 0 amount
    fireEvent.change(amountInput, { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }))

    await waitFor(() => {
      expect(screen.getByText(/Amount must be greater than \$0\.01/)).toBeInTheDocument()
    })

    // Test with negative amount
    fireEvent.change(amountInput, { target: { value: '-10' } })
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }))

    await waitFor(() => {
      expect(screen.getByText(/Amount must be greater than \$0\.01/)).toBeInTheDocument()
    })
  })

  it('shows amount formatting preview', async () => {
    render(
      <InvoiceForm
        clients={mockClients}
        onSubmit={mockOnSubmit}
      />
    )

    const amountInput = screen.getByLabelText(/amount/i)
    fireEvent.change(amountInput, { target: { value: '123.45' } })

    await waitFor(() => {
      expect(screen.getByText('Invoice total: $123.45')).toBeInTheDocument()
    })
  })

  it('shows selected client preview', async () => {
    render(
      <InvoiceForm
        clients={mockClients}
        onSubmit={mockOnSubmit}
      />
    )

    const clientSelect = screen.getByLabelText(/client/i)
    fireEvent.change(clientSelect, { target: { value: '1' } })

    await waitFor(() => {
      expect(screen.getByText(/Invoice will be created for:/)).toBeInTheDocument()
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
    })
  })

  it('submits form with correct data format', async () => {
    const { container } = render(
      <InvoiceForm
        clients={mockClients}
        onSubmit={mockOnSubmit}
      />
    )

    // Fill out the form with all required fields
    await waitFor(async () => {
      fireEvent.change(screen.getByLabelText(/client/i), { target: { value: '1' } })
      fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '100.50' } })
      fireEvent.change(screen.getByLabelText(/currency/i), { target: { value: 'USD' } })
      fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2025-12-31' } })
      fireEvent.change(screen.getByLabelText(/initial status/i), { target: { value: 'pending' } })
    })

    // Check form validation is satisfied
    const clientSelect = screen.getByLabelText(/client/i)
    const amountInput = screen.getByLabelText(/amount/i)
    const dueDateInput = screen.getByLabelText(/due date/i)

    await waitFor(() => {
      expect(clientSelect).toHaveValue('1')
      expect(amountInput).toHaveValue(100.50)
      expect(dueDateInput).toHaveValue('2025-12-31')
    })

    // Submit form by finding and submitting the form element directly
    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        client_id: 1,
        amount_cents: 10050, // $100.50 converted to cents
        currency: 'USD',
        due_date: '2025-12-31',
        status: 'pending'
      } as CreateInvoiceRequest)
    }, { timeout: 3000 })
  })

  it('handles currency selection', () => {
    render(
      <InvoiceForm
        clients={mockClients}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getByText('USD - US Dollar')).toBeInTheDocument()
    expect(screen.getByText('EUR - Euro')).toBeInTheDocument()
    expect(screen.getByText('GBP - British Pound')).toBeInTheDocument()
    expect(screen.getByText('CAD - Canadian Dollar')).toBeInTheDocument()
  })

  it('handles status selection', () => {
    render(
      <InvoiceForm
        clients={mockClients}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('resets form when reset button is clicked', async () => {
    render(
      <InvoiceForm
        clients={mockClients}
        onSubmit={mockOnSubmit}
      />
    )

    // Fill out some fields
    const clientSelect = screen.getByLabelText(/client/i)
    const amountInput = screen.getByLabelText(/amount/i)

    fireEvent.change(clientSelect, { target: { value: '1' } })
    fireEvent.change(amountInput, { target: { value: '100' } })

    // Verify fields have values
    await waitFor(() => {
      expect(clientSelect).toHaveValue('1')
      expect(amountInput).toHaveValue(100)
    })

    // Reset the form
    fireEvent.click(screen.getByRole('button', { name: /reset form/i }))

    // Check that fields are reset to default values
    await waitFor(() => {
      expect(clientSelect).toHaveValue('')
      expect(amountInput).toHaveValue(null) // number input resets to null
    }, { timeout: 2000 })
  })

  it('disables form when loading', () => {
    render(
      <InvoiceForm
        clients={mockClients}
        onSubmit={mockOnSubmit}
        isLoading={true}
      />
    )

    expect(screen.getByRole('button', { name: /creating.../i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /reset form/i })).toBeDisabled()
  })

  it('applies default values when provided', () => {
    const defaultValues = {
      client_id: 1,
      amount: 50,
      currency: 'EUR',
      due_date: '2024-01-15',
      status: 'pending' as const
    }

    render(
      <InvoiceForm
        clients={mockClients}
        onSubmit={mockOnSubmit}
        defaultValues={defaultValues}
      />
    )

    expect(screen.getByLabelText(/client/i)).toHaveValue('1')
    expect(screen.getByLabelText(/amount/i)).toHaveValue(50)
    expect(screen.getByLabelText(/currency/i)).toHaveValue('EUR')
    expect(screen.getByLabelText(/due date/i)).toHaveValue('2024-01-15')
    expect(screen.getByLabelText(/initial status/i)).toHaveValue('pending')
  })
})