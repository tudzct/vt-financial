import axios from 'axios'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { goalService } from '../../api/goal.service'
import { ExpenseGoal, GoalListData, SavingGoal, UpdatedGoalData } from '../../api/types'
import AdjustGoalModal from '../../components/AdjustGoalModal/AdjustGoalModal'
import CreateGoalModal from '../../components/CreateGoalModal/CreateGoalModal'
import ErrorComponent from '../../components/Error/Error'
import Loading from '../../components/Loading/Loading'

const SYSTEM_ERROR_MESSAGE =
  'Đã xảy ra lỗi hệ thống khi tải mục tiêu, vui lòng thử lại sau.'

/** Formats money in the currency style used by the target Figma frame. */
const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)

/** Formats an API calendar date without applying a browser timezone shift. */
const formatDate = (value: string, options: Intl.DateTimeFormatOptions): string => {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date)
}

/** Keeps progress meters within their visual bounds while preserving source values. */
const getProgress = (current: number, target: number): number => {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0
  return Math.min(100, Math.max(0, (current / target) * 100))
}

/** Displays the saving goal values and target progress. */
const SavingsGoalCard: React.FC<{
  goal: SavingGoal
  onAdjust: (goal: SavingGoal) => void
}> = ({ goal, onAdjust }) => {
  const progress = getProgress(goal.target_achieved, goal.target_amount)
  const startDate = formatDate(goal.start_date, { month: 'short', day: '2-digit' })
  const endDate = formatDate(goal.end_date, { month: 'short', day: '2-digit' })

  return (
    <section className="h-[294px] rounded-lg bg-white p-6 shadow-[0_14px_28px_rgba(28,39,49,0.08)]">
      <div className="flex items-center justify-between border-b border-[#ececec] pb-5">
        <h2 className="text-base font-semibold text-[#444]">Savings Goal</h2>
        <div className="rounded border border-[#e3e3e3] bg-[#fafafa] px-4 py-2 text-[11px] text-[#666]">
          {startDate} ~ {endDate}⌄
        </div>
      </div>

      <div className="grid grid-cols-[1fr_140px] gap-4 pt-5">
        <div className="space-y-5">
          <div>
            <p className="text-xs text-[#999]">♙&nbsp;&nbsp;Target Achieved</p>
            <p className="mt-1 pl-6 text-lg font-semibold text-[#1f1f1f]">
              {formatMoney(goal.target_achieved)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#999]">◎&nbsp;&nbsp;This month Target</p>
            <p className="mt-1 pl-6 text-lg font-semibold text-[#1f1f1f]">
              {formatMoney(goal.target_amount)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative mt-1 h-[72px] w-[128px] overflow-hidden">
            <div className="absolute left-1 top-1 h-[116px] w-[116px] rounded-full border-[12px] border-[#e8e8e8]" />
            <div
              className="absolute left-1 top-1 h-[116px] w-[116px] rounded-full border-[12px] border-[#2fa69b]"
              style={{
                clipPath: `polygon(0 0, ${Math.max(8, progress)}% 0, ${Math.max(8, progress)}% 100%, 0 100%)`,
              }}
            />
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-lg font-semibold text-[#333]">
              {Math.round(progress)}%
            </span>
          </div>
          <p className="mt-2 text-center text-[11px] font-medium text-[#444]">
            Target vs Achievement
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => onAdjust(goal)}
          className="rounded border border-[#2fa69b] px-5 py-2 text-xs font-medium text-[#269b91] transition hover:bg-[#edf9f8]"
        >
          Adjust Goal&nbsp;&nbsp;⌕
        </button>
      </div>
    </section>
  )
}

/** Renders a source-grounded progress line ending at the achieved amount. */
const SavingSummaryCard: React.FC<{ goal: SavingGoal }> = ({ goal }) => {
  const progress = getProgress(goal.target_achieved, goal.target_amount)
  const endY = 162 - (progress / 100) * 112
  const linePoints = Array.from({ length: 7 }, (_, index) => {
    const x = 58 + index * 84
    const y = 162 - ((162 - endY) * index) / 6
    return `${x},${y}`
  }).join(' ')
  const monthLabel = formatDate(goal.end_date, { month: 'short', year: 'numeric' })

  return (
    <section className="h-[294px] min-w-0 rounded-lg bg-white p-6 shadow-[0_14px_28px_rgba(28,39,49,0.08)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-12">
          <h2 className="text-base font-semibold text-[#444]">Saving Summary</h2>
          <button type="button" className="text-xs text-[#666]">
            {monthLabel}&nbsp;&nbsp;⌄
          </button>
        </div>
        <div className="flex items-center gap-8 text-[11px] text-[#666]">
          <span className="flex items-center gap-2">
            <i className="h-1.5 w-4 rounded-sm bg-[#2fa69b]" /> This month
          </span>
          <span className="flex items-center gap-2">
            <i className="h-1.5 w-4 rounded-sm bg-[#cfcfcf]" /> Same period last month
          </span>
        </div>
      </div>

      <svg
        className="mt-5 h-[205px] w-full"
        viewBox="0 0 590 205"
        role="img"
        aria-label={`Saving progress is ${Math.round(progress)} percent`}
      >
        <defs>
          <linearGradient id="saving-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2fa69b" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#2fa69b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[24, 70, 116, 162].map((y) => (
          <line key={y} x1="58" x2="562" y1={y} y2={y} stroke="#f0f0f0" />
        ))}
        {[58, 142, 226, 310, 394, 478, 562].map((x) => (
          <line key={x} x1={x} x2={x} y1="18" y2="162" stroke="#ececec" />
        ))}
        <line
          x1="58"
          x2="562"
          y1="162"
          y2="162"
          stroke="#cfcfcf"
          strokeDasharray="4 4"
        />
        <polygon points={`58,162 ${linePoints} 562,162`} fill="url(#saving-area)" />
        <polyline points={linePoints} fill="none" stroke="#2fa69b" strokeWidth="2" />
        <circle cx="562" cy={endY} r="4" fill="#2fa69b" />
        <text x="0" y="28" fill="#aaa" fontSize="11">{formatMoney(goal.target_amount)}</text>
        <text x="8" y="166" fill="#aaa" fontSize="11">$0</text>
        {['01', '05', '10', '15', '20', '25', '30'].map((day, index) => (
          <text key={day} x={54 + index * 84} y="190" fill="#999" fontSize="11">
            {index === 0 ? `${monthLabel.split(' ')[0]} ${day}` : day}
          </text>
        ))}
      </svg>
    </section>
  )
}

/** Displays current category spending against its active expense limit. */
const ExpenseGoalCard: React.FC<{
  goal: ExpenseGoal
  onAdjust: (goal: ExpenseGoal) => void
}> = ({ goal, onAdjust }) => {
  const progress = getProgress(goal.current_expense, goal.target_amount)

  return (
    <article className="rounded-lg bg-white px-6 py-5 shadow-[0_10px_22px_rgba(28,39,49,0.06)]">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f5] text-xl text-[#666]">
          ◫
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-[#999]">{goal.category}</p>
          <p className="mt-1 text-lg font-semibold text-[#222]">
            {formatMoney(goal.current_expense)}
          </p>
          <p className="mt-0.5 text-[10px] text-[#aaa]">
            of {formatMoney(goal.target_amount)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAdjust(goal)}
          className="rounded border border-[#2fa69b] px-4 py-2 text-xs font-medium text-[#269b91] transition hover:bg-[#edf9f8]"
        >
          Adjust&nbsp;&nbsp;⌕
        </button>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e8e8e8]">
        <div className="h-full rounded-full bg-[#2fa69b]" style={{ width: `${progress}%` }} />
      </div>
    </article>
  )
}

/** Implements the protected UC-13 financial-goals page. */
const Goals: React.FC = () => {
  const [goalData, setGoalData] = useState<GoalListData>({
    savingGoal: null,
    expenseGoals: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<SavingGoal | ExpenseGoal | null>(null)
  const [successToast, setSuccessToast] = useState('')
  const requestInFlight = useRef(false)

  /** Fetches the idempotent goal list without changing authentication state. */
  const fetchGoals = useCallback(async () => {
    if (requestInFlight.current) return

    requestInFlight.current = true
    setIsLoading(true)
    setError('')

    try {
      const response = await goalService.getGoals()

      if (!response.success || !response.data || !Array.isArray(response.data.expenseGoals)) {
        throw new globalThis.Error(SYSTEM_ERROR_MESSAGE)
      }

      setGoalData({
        savingGoal: response.data.savingGoal ?? null,
        expenseGoals: response.data.expenseGoals,
      })
      setError('')
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) return
      setError(SYSTEM_ERROR_MESSAGE)
    } finally {
      requestInFlight.current = false
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchGoals()
  }, [fetchGoals])

  useEffect(() => {
    if (!successToast) return

    const timeoutId = window.setTimeout(() => setSuccessToast(''), 3500)
    return () => window.clearTimeout(timeoutId)
  }, [successToast])

  /** Closes the modal, confirms success, and refreshes the goal collection. */
  const handleGoalCreated = useCallback(async () => {
    setSuccessToast('Goal created successfully')
    setIsCreateModalOpen(false)
    await fetchGoals()
  }, [fetchGoals])

  /** Opens UC-15 for the selected saving or expense-limit goal. */
  const openAdjustment = useCallback((goal: SavingGoal | ExpenseGoal) => {
    setSelectedGoal(goal)
    setIsAdjustModalOpen(true)
  }, [])

  /** Applies the successful update locally, then refreshes canonical progress data. */
  const handleGoalUpdated = useCallback(async (updatedGoal: UpdatedGoalData) => {
    setGoalData((current) => ({
      savingGoal:
        current.savingGoal?.goal_id === updatedGoal.goal_id
          ? { ...current.savingGoal, target_amount: updatedGoal.target_amount }
          : current.savingGoal,
      expenseGoals: current.expenseGoals.map((goal) =>
        goal.goal_id === updatedGoal.goal_id
          ? { ...goal, target_amount: updatedGoal.target_amount }
          : goal
      ),
    }))
    setSuccessToast('Goal updated successfully')
    setIsAdjustModalOpen(false)
    setSelectedGoal(null)
    await fetchGoals()
  }, [fetchGoals])

  const hasNoGoals = !goalData.savingGoal && goalData.expenseGoals.length === 0

  return (
    <div className="min-h-[calc(100vh-104px)] min-w-[1080px] text-[#333]">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[22px] font-normal text-[#888]">Goals</h1>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded bg-[#2fa69b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#278f86]"
        >
          Create Goal
        </button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[520px] items-center justify-center rounded-lg bg-white">
          <Loading message="Đang tải mục tiêu..." />
        </div>
      ) : error ? (
        <ErrorComponent message={error} onRetry={isLoading ? undefined : fetchGoals} />
      ) : hasNoGoals ? (
        <section className="flex min-h-[520px] flex-col items-center justify-center rounded-lg bg-white px-8 text-center shadow-[0_14px_28px_rgba(28,39,49,0.08)]">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#edf9f8] text-3xl text-[#2fa69b]">
            ◉
          </span>
          <h2 className="mt-5 text-xl font-semibold text-[#333]">No goals yet</h2>
          <p className="mt-2 max-w-md text-sm text-[#888]">
            Create a saving or expense goal to start tracking your financial progress.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-6 rounded bg-[#2fa69b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#278f86]"
          >
            Create Goal
          </button>
        </section>
      ) : (
        <>
          {goalData.savingGoal && (
            <div className="grid grid-cols-[368px_minmax(0,1fr)] gap-6">
              <SavingsGoalCard goal={goalData.savingGoal} onAdjust={openAdjustment} />
              <SavingSummaryCard goal={goalData.savingGoal} />
            </div>
          )}

          {goalData.expenseGoals.length > 0 && (
            <section className={goalData.savingGoal ? 'mt-8' : ''}>
              <h2 className="mb-5 text-[22px] font-normal text-[#888]">
                Expenses Goals by Category
              </h2>
              <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                {goalData.expenseGoals.map((goal) => (
                  <ExpenseGoalCard key={goal.goal_id} goal={goal} onAdjust={openAdjustment} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <CreateGoalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleGoalCreated}
      />

      <AdjustGoalModal
        isOpen={isAdjustModalOpen}
        goal={selectedGoal}
        onClose={() => {
          setIsAdjustModalOpen(false)
          setSelectedGoal(null)
        }}
        onUpdated={handleGoalUpdated}
      />

      {successToast && (
        <div
          role="status"
          className="fixed right-6 top-6 z-[60] rounded-lg bg-[#2fa69b] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(35,123,116,0.28)]"
        >
          {successToast}
        </div>
      )}
    </div>
  )
}

export default Goals
