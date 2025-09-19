import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders draft status correctly', () => {
    render(<StatusBadge status="draft" />)
    
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toHaveClass('status-draft')
  })

  it('renders sent status correctly', () => {
    render(<StatusBadge status="sent" />)
    
    expect(screen.getByText('Sent')).toBeInTheDocument()
    expect(screen.getByText('Sent')).toHaveClass('status-paid')
  })

  it('renders paid status correctly', () => {
    render(<StatusBadge status="paid" />)
    
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toHaveClass('status-paid')
  })

  it('renders overdue status correctly', () => {
    render(<StatusBadge status="overdue" />)
    
    expect(screen.getByText('Overdue')).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toHaveClass('status-overdue')
  })

  it('renders cancelled status correctly', () => {
    render(<StatusBadge status="cancelled" />)
    
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toHaveClass('status-cancelled')
  })

  it('applies small size correctly', () => {
    render(<StatusBadge status="paid" size="sm" />)
    
    expect(screen.getByText('Paid')).toHaveClass('px-2', 'py-0.5', 'text-xs')
  })

  it('applies large size correctly', () => {
    render(<StatusBadge status="paid" size="lg" />)
    
    expect(screen.getByText('Paid')).toHaveClass('px-3', 'py-1', 'text-sm')
  })
})