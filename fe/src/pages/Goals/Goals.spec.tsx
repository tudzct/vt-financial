import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Goals from './Goals'

const { getGoals } = vi.hoisted(() => ({
  getGoals: vi.fn(),
}))

vi.mock('../../api/goal.service', () => ({
  goalService: { getGoals },
}))

vi.mock('../../components/SavingsSummaryChart/SavingsSummaryChart', () => ({
  default: () => <div>Savings summary chart</div>,
}))

vi.mock('../../components/CreateGoalModal/CreateGoalModal', () => ({
  default: () => null,
}))

vi.mock('../../components/AdjustGoalModal/AdjustGoalModal', () => ({
  default: () => null,
}))

describe('UC-16 savings summary placement', () => {
  it('shows the savings chart above expense goals when no saving goal exists', async () => {
    getGoals.mockResolvedValue({
      success: true,
      message: 'OK',
      data: {
        savingGoal: null,
        expenseGoals: [
          {
            goal_id: 12,
            category: 'Housing',
            target_amount: 5000,
            current_expense: 1250,
          },
        ],
      },
    })

    render(<Goals />)

    const chart = await screen.findByText('Savings summary chart')
    const expenseHeading = screen.getByRole('heading', {
      name: 'Expenses Goals by Category',
    })

    expect(
      chart.compareDocumentPosition(expenseHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})
