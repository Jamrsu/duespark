import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClientForm } from './ClientForm'
import { CreateClientRequest } from '@/types/api'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
}))

describe('ClientForm', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<ClientForm onSubmit={mockOnSubmit} />)

    expect(screen.getByLabelText(/client name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contact person/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument()
  })

  it('shows validation errors for required fields', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} />)

    const submitButton = screen.getByRole('button', { name: /create client/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Client name is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('prevents submission with invalid email format', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const nameInput = screen.getByLabelText(/client name/i)

    // Fill in name (required field) and invalid email
    fireEvent.change(nameInput, { target: { value: 'Test Company' } })
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    const submitButton = screen.getByRole('button', { name: /create client/i })
    fireEvent.click(submitButton)

    // Wait to ensure form processing completes
    await waitFor(() => {
      // The key test: form should not submit with invalid data
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    // Verify the form still has the invalid email value
    expect(emailInput).toHaveValue('invalid-email')
  })

  it('prevents submission with invalid name length', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} />)

    const nameInput = screen.getByLabelText(/client name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const longName = 'a'.repeat(101) // More than 100 characters

    // Fill both name and email (email must be valid for name validation to show)
    fireEvent.change(nameInput, { target: { value: longName } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    const submitButton = screen.getByRole('button', { name: /create client/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      // The key test: form should not submit with invalid data
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    // Verify the form still has the long name value
    expect(nameInput).toHaveValue(longName)
  })

  it('shows client preview when fields are filled', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} />)

    const nameInput = screen.getByLabelText(/client name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const contactInput = screen.getByLabelText(/contact person/i)
    const phoneInput = screen.getByLabelText(/phone number/i)

    fireEvent.change(nameInput, { target: { value: 'Demo Company' } })
    fireEvent.change(emailInput, { target: { value: 'demo@company.com' } })
    fireEvent.change(contactInput, { target: { value: 'John Doe' } })
    fireEvent.change(phoneInput, { target: { value: '+1 (555) 123-4567' } })

    await waitFor(() => {
      expect(screen.getByText('Preview:')).toBeInTheDocument()
      expect(screen.getByText('Demo Company')).toBeInTheDocument()
      expect(screen.getByText('demo@company.com')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('+1 (555) 123-4567')).toBeInTheDocument()
    })
  })

  it('displays common timezone options', () => {
    render(<ClientForm onSubmit={mockOnSubmit} />)

    expect(screen.getByText('Select timezone (optional)')).toBeInTheDocument()
    expect(screen.getByText('Eastern Time (ET)')).toBeInTheDocument()
    expect(screen.getByText('Pacific Time (PT)')).toBeInTheDocument()
    expect(screen.getByText('London (GMT/BST)')).toBeInTheDocument()
    expect(screen.getByText('Tokyo (JST)')).toBeInTheDocument()
  })

  it('accepts valid form data and enables submit button', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} />)

    // Fill out the form with valid data
    fireEvent.change(screen.getByLabelText(/client name/i), {
      target: { value: 'Demo Company' }
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'billing@democorp.com' }
    })
    fireEvent.change(screen.getByLabelText(/contact person/i), {
      target: { value: 'Mike Brown' }
    })
    fireEvent.change(screen.getByLabelText(/phone number/i), {
      target: { value: '+1 (555) 456-7890' }
    })
    fireEvent.change(screen.getByLabelText(/timezone/i), {
      target: { value: 'America/New_York' }
    })

    // Verify form fields contain the expected values
    expect(screen.getByLabelText(/client name/i)).toHaveValue('Demo Company')
    expect(screen.getByLabelText(/email address/i)).toHaveValue('billing@democorp.com')
    expect(screen.getByLabelText(/contact person/i)).toHaveValue('Mike Brown')
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('+1 (555) 456-7890')
    expect(screen.getByLabelText(/timezone/i)).toHaveValue('America/New_York')

    // Verify submit button is enabled
    const submitButton = screen.getByRole('button', { name: /create client/i })
    expect(submitButton).not.toBeDisabled()
  })

  it('submits form without optional contact fields when not provided', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} />)

    // Fill out required fields only
    fireEvent.change(screen.getByLabelText(/client name/i), { 
      target: { value: 'Simple Corp' } 
    })
    fireEvent.change(screen.getByLabelText(/email address/i), { 
      target: { value: 'info@simplecorp.com' } 
    })

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create client/i }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Simple Corp',
        email: 'info@simplecorp.com',
        contact_name: undefined,
        contact_phone: undefined,
        timezone: undefined
      } as CreateClientRequest)
    })
  })

  it('resets form when reset button is clicked', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} />)

    // Fill out some fields
    fireEvent.change(screen.getByLabelText(/client name/i), { 
      target: { value: 'Reset Test Co' } 
    })
    fireEvent.change(screen.getByLabelText(/email address/i), { 
      target: { value: 'reset@testco.com' } 
    })
    fireEvent.change(screen.getByLabelText(/contact person/i), { 
      target: { value: 'Jane Smith' } 
    })
    fireEvent.change(screen.getByLabelText(/phone number/i), { 
      target: { value: '+1 (555) 999-8888' } 
    })

    // Reset the form
    fireEvent.click(screen.getByRole('button', { name: /reset form/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/client name/i)).toHaveValue('')
      expect(screen.getByLabelText(/email address/i)).toHaveValue('')
      expect(screen.getByLabelText(/contact person/i)).toHaveValue('')
      expect(screen.getByLabelText(/phone number/i)).toHaveValue('')
      expect(screen.getByLabelText(/timezone/i)).toHaveValue('')
    })
  })

  it('disables form when loading', () => {
    render(<ClientForm onSubmit={mockOnSubmit} isLoading={true} />)

    expect(screen.getByRole('button', { name: /creating.../i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /reset form/i })).toBeDisabled()
  })

  it('applies default values when provided', () => {
    const defaultValues = {
      name: 'Global Enterprise Ltd',
      email: 'contact@globalent.com',
      contact_name: 'Emma Wilson',
      contact_phone: '+44 20 1234 5678',
      timezone: 'Europe/London'
    }

    render(<ClientForm onSubmit={mockOnSubmit} defaultValues={defaultValues} />)

    expect(screen.getByLabelText(/client name/i)).toHaveValue('Global Enterprise Ltd')
    expect(screen.getByLabelText(/email address/i)).toHaveValue('contact@globalent.com')
    expect(screen.getByLabelText(/contact person/i)).toHaveValue('Emma Wilson')
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('+44 20 1234 5678')
    expect(screen.getByLabelText(/timezone/i)).toHaveValue('Europe/London')
  })

  it('shows helpful text for form fields', () => {
    render(<ClientForm onSubmit={mockOnSubmit} />)

    expect(screen.getByText('This email will be used for sending invoices and reminders')).toBeInTheDocument()
    expect(screen.getByText('The primary contact person for this client')).toBeInTheDocument()
    expect(screen.getByText('Phone number for the primary contact person')).toBeInTheDocument()
    expect(screen.getByText('Used for scheduling reminders at appropriate times')).toBeInTheDocument()
  })

  it('converts email to lowercase in preview', async () => {
    render(<ClientForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    fireEvent.change(emailInput, { target: { value: 'TEST@EXAMPLE.COM' } })

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })
})