import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KPICard } from './KPICard'

describe('KPICard', () => {
  it('renders title and value correctly', () => {
    render(
      <KPICard
        title="Total Revenue"
        value="$12,345"
      />
    )

    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('$12,345')).toBeInTheDocument()
  })

  it('shows positive trend when change is positive', () => {
    render(
      <KPICard
        title="Revenue"
        value="$1,000"
        change={+15.5}
      />
    )

    const trendElement = screen.getByText('+15.5%')
    expect(trendElement).toBeInTheDocument()
    expect(trendElement).toHaveClass('text-success-600')
  })

  it('shows negative trend when change is negative', () => {
    render(
      <KPICard
        title="Revenue"
        value="$1,000"
        change={-8.2}
      />
    )

    const trendElement = screen.getByText('-8.2%')
    expect(trendElement).toBeInTheDocument()
    expect(trendElement).toHaveClass('text-red-600')
  })

  it('renders without trend when change is not provided', () => {
    render(
      <KPICard
        title="Revenue"
        value="$1,000"
      />
    )

    expect(screen.queryByText('%')).not.toBeInTheDocument()
  })

  it('applies loading state correctly', () => {
    render(
      <KPICard
        title="Revenue"
        value="$1,000"
        loading={true}
      />
    )

    expect(screen.getByTestId('loading-shimmer')).toBeInTheDocument()
  })
})