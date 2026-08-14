import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import AddTransactionForm from '../../components/AddTransactionForm/AddTransactionForm'
import { useAuth } from '../../context/AuthContext'

const NAVIGATION_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: '◫' },
  { path: '/account', label: 'Balances', icon: '▣' },
  { path: '/transactions', label: 'Transactions', icon: '↔' },
  { path: '/bills', label: 'Bills', icon: '▧' },
  { path: '/expenses', label: 'Expenses', icon: '▤' },
  { path: '/goals', label: 'Goals', icon: '◉' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

const TRANSACTION_FILTERS = [
  { label: 'All', value: 'All' },
  { label: 'Revenue', value: 'Revenue' },
  { label: 'Expenses', value: 'Expense' },
] as const

/** Renders the Figma-scoped 107.1 Add Transactions page shell. */
const AddTransactionPage: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const profileName = user?.full_name || user?.username || 'Tanzir Rahman'
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'T'

  /** Ends the authenticated session from the page shell. */
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#1f1f1f] lg:flex">
      <aside className="hidden min-h-screen w-[272px] shrink-0 flex-col bg-[#171717] px-7 py-12 text-[#b8b8b8] lg:flex">
        <NavLink to="/dashboard" className="mb-12 pl-7 text-[25px] font-extrabold tracking-[1.2px] text-white">
          FINE<span className="font-medium">bank.IO</span>
        </NavLink>

        <nav className="flex flex-1 flex-col gap-3" aria-label="Primary navigation">
          {NAVIGATION_ITEMS.map((item) => {
            const active = item.path === '/transactions'
            return (
              <NavLink key={item.path} to={item.path} className={`flex h-12 items-center gap-4 rounded px-5 text-base font-medium ${active ? 'bg-[#2fa096] text-white' : 'hover:bg-[#252525] hover:text-white'}`}>
                <span className="w-5 text-center text-[23px] leading-none" aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <button type="button" onClick={handleLogout} className="mb-11 flex h-12 items-center gap-4 rounded bg-[#252525] px-5 text-left text-base font-semibold text-[#c8c8c8] hover:text-white">
          <span className="w-5 text-center text-[23px]" aria-hidden="true">↪</span>
          Logout
        </button>

        <div className="flex items-center border-t border-[#303030] pt-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4c4c4c] text-sm font-semibold text-white">{profileInitial}</div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-white">{profileName}</p>
            <p className="text-xs text-[#9c9c9c]">View profile</p>
          </div>
          <span className="text-base text-white" aria-hidden="true">⋮</span>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-[86px] items-center justify-between border-b border-[#e4e5e7] px-5 sm:px-8">
          <div className="flex items-center gap-3 text-[15px] text-[#a1a1a1]">
            <span className="text-[27px] leading-none" aria-hidden="true">»</span>
            <span>May 19, 2023</span>
          </div>
          <div className="flex items-center gap-7">
            <button type="button" className="relative hidden h-5 w-5 sm:block" aria-label="Notifications">
              <span className="absolute left-1 top-1 h-3 w-3 rounded-t-full rounded-b-sm bg-[#555]" />
              <span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-[#2fa096]" />
            </button>
            <label className="flex h-12 w-[250px] items-center rounded-[14px] bg-white px-8 shadow-[0_10px_30px_rgba(33,33,33,0.04)] sm:w-[346px]">
              <span className="sr-only">Search</span>
              <input type="search" placeholder="Search here" className="min-w-0 flex-1 bg-transparent text-[15px] text-[#555] outline-none placeholder:text-[#aaa]" />
              <span className="ml-3 h-4 w-4 rounded-full border-2 border-[#4d4d4d]" aria-hidden="true" />
            </label>
          </div>
        </header>

        <main className="px-5 pb-16 pt-5 sm:px-8">
          <h1 className="text-[23px] font-normal leading-[28px] text-[#8e8e8e]">Recent Transaction</h1>
          <div className="mt-[6px] flex h-11 items-end">
            <div className="flex h-11 gap-7 text-base font-semibold" role="tablist" aria-label="Transaction type">
              {TRANSACTION_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  role="tab"
                  aria-selected={false}
                  onClick={() => navigate(`/transactions?type=${filter.value}`)}
                  className="border-b-2 border-transparent px-1 text-[#4d4d4d] transition-colors hover:border-[#2fa096] hover:text-[#2fa096]"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <section id="add-transaction-form" className="mt-6">
            <AddTransactionForm />
          </section>
        </main>
      </div>
    </div>
  )
}

export default AddTransactionPage
