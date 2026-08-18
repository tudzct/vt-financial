import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import chevronRightIcon from '../../assets/add-account/chevron-right.svg'
import chevronsRightIcon from '../../assets/add-account/chevrons-right.svg'
import notificationIcon from '../../assets/add-account/notification.svg'
import searchCircleIcon from '../../assets/add-account/search-circle.svg'
import searchHandleIcon from '../../assets/add-account/search-handle.svg'
import AddAccountForm from '../../components/AddAccountForm/AddAccountForm'
import { useAuth } from '../../context/AuthContext'

const NAVIGATION_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: '▦' },
  { path: '/accounts', label: 'Balances', icon: '▱' },
  { path: '/transactions', label: 'Transactions', icon: '↹' },
  { path: '/bills', label: 'Bills', icon: '▧' },
  { path: '/expenses', label: 'Expenses', icon: '▣' },
  { path: '/goals', label: 'Goals', icon: '◉' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

/** Renders the three Figma-scoped UC-06 account creation states. */
const AddAccountPage: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const profileName = user?.full_name || user?.username || 'User'
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'U'

  /** Ends the authenticated session from the page shell. */
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#191919] lg:flex">
      <aside className="hidden min-h-screen w-[280px] shrink-0 flex-col bg-[#171717] px-7 py-12 text-[#b8b8b8] lg:flex">
        <NavLink
          to="/dashboard"
          className="mb-12 px-7 text-[24px] font-extrabold tracking-[1.2px] text-white"
        >
          FINE<span className="font-medium">bank.IO</span>
        </NavLink>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Primary navigation">
          {NAVIGATION_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex h-12 items-center gap-3 rounded px-4 text-[16px] transition-colors ${
                item.path === '/accounts'
                  ? 'bg-[#299d91] font-semibold text-white'
                  : 'hover:bg-[#252525] hover:text-white'
              }`}
            >
              <span className="w-6 text-center text-[21px]" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mb-11 flex h-12 items-center gap-3 rounded bg-[#252525] px-4 text-left text-[16px] font-semibold text-[#c8c8c8]"
        >
          <span className="w-6 text-center text-[22px]" aria-hidden="true">
            ↪
          </span>
          Logout
        </button>

        <div className="flex items-center border-t border-[#303030] pt-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4c4c4c] text-sm font-semibold text-white">
            {profileInitial}
          </div>
          <div className="ml-4 min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold text-white">
              {profileName}
            </p>
            <p className="text-xs text-[#9c9c9c]">View profile</p>
          </div>
          <span className="text-xl text-white" aria-hidden="true">
            ⋮
          </span>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex min-h-[88px] items-center justify-between border-b border-[#e8e8e8] px-5 py-5 sm:px-8">
          <div className="flex items-center gap-6">
            <h1 className="text-[24px] font-bold leading-7 text-[#191919]">
              Add Account
            </h1>
            <div className="hidden items-center gap-1 text-[14px] leading-5 text-[#9f9f9f] sm:flex">
              <img src={chevronsRightIcon} alt="" className="h-6 w-6" />
              <span>May 19, 2023</span>
            </div>
          </div>

          <div className="ml-5 flex items-center gap-6 sm:gap-10">
            <button type="button" aria-label="Notifications">
              <img src={notificationIcon} alt="" className="h-6 w-6" />
            </button>
            <label className="hidden h-12 w-[350px] items-center rounded-xl bg-white pl-8 pr-6 shadow-[0_26px_13px_rgba(106,22,58,0.04)] md:flex">
              <span className="sr-only">Search</span>
              <input
                type="search"
                placeholder="Search here"
                className="min-w-0 flex-1 bg-transparent text-[16px] leading-6 outline-none placeholder:text-[#9f9f9f]"
              />
              <span className="relative h-6 w-6 shrink-0" aria-hidden="true">
                <img
                  src={searchCircleIcon}
                  alt=""
                  className="absolute inset-0 h-6 w-6"
                />
                <img
                  src={searchHandleIcon}
                  alt=""
                  className="absolute inset-0 h-6 w-6"
                />
              </span>
            </label>
          </div>
        </header>

        <main className="min-h-[calc(100vh-88px)] px-5 py-8 sm:px-10">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-[14px] leading-5"
          >
            <NavLink to="/accounts" className="text-[#666]">
              Balances
            </NavLink>
            <img src={chevronRightIcon} alt="" className="h-3 w-3" />
            <span className="font-medium capitalize text-[#299d91]">
              Add Account
            </span>
          </nav>

          <section className="mt-6 flex justify-center">
            <AddAccountForm />
          </section>
        </main>
      </div>
    </div>
  )
}

export default AddAccountPage
