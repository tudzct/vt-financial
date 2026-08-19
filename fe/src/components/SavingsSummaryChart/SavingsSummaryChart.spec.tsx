import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SavingsSummaryChart from './SavingsSummaryChart'

const { getSummary } = vi.hoisted(() => ({
  getSummary: vi.fn(),
}))

vi.mock('../../api/savings.service', () => ({
  savingsService: { getSummary },
}))

const createSeries = (firstAmount: number) =>
  Array.from({ length: 12 }, (_, index) => ({
    month: String(index + 1).padStart(2, '0'),
    amount: index === 0 ? firstAmount : 0,
  }))

describe('BR-SAV-09 savings chart point value tooltip', () => {
  beforeEach(() => {
    getSummary.mockResolvedValue({
      user_id: 1,
      year: 2026,
      summary: {
        this_year: createSeries(1234.56),
        last_year: createSeries(-78.9),
      },
    })
  })

  it.each([
    ['selected-year', '2026 Jan: $1,234.56', 'Jan · $1,234.56'],
    ['previous-year', '2025 Jan: -$78.90', 'Jan · -$78.90'],
  ])('shows and hides the exact %s point value', async (_, pointName, tooltipText) => {
    render(<SavingsSummaryChart />)

    const point = await screen.findByRole('graphics-symbol', { name: pointName })

    fireEvent.mouseEnter(point)
    expect(screen.getByRole('tooltip')).toHaveTextContent(tooltipText)

    fireEvent.mouseLeave(point)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
