import React, { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import NavigationBar from '../NavigationBar/NavigationBar'

interface LayoutProps {
  children: ReactNode
}

/** Formats the current date for the dashboard header without mutating app state. */
const getDisplayedDate = (): string =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

/** Provides the shared application frame and the Figma bills shell. */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (location.pathname === '/bills' || location.pathname === '/goals') {
    const profileName = user?.full_name || user?.username || 'User'
    const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'U'

    return (
      <div className="min-h-screen min-w-[1024px] bg-[#f4f5f7] text-[#191919]">
        <aside className="fixed inset-y-0 left-0 z-20 flex w-[280px] flex-col bg-[#171717] px-7 py-9 text-white">
          <Link
            to="/dashboard"
            className="px-3 font-['Poppins'] text-2xl font-extrabold tracking-[0.04em]"
          >
            FINEbank.IO
          </Link>

          <div className="mt-14">
            <NavigationBar variant="sidebar" />
          </div>

          <div className="mt-auto">
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-12 w-full items-center gap-4 rounded bg-[#242424] px-4 text-xs font-medium text-[#d2d2d2] transition hover:bg-[#2d2d2d]"
            >
              <span aria-hidden="true" className="w-5 text-center text-xl">
                ↪
              </span>
              Logout
            </button>

            <div className="mt-8 border-t border-[#292929] pt-8">
              <div className="flex items-center gap-3">
                {user?.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#303030] text-sm font-semibold">
                    {profileInitial}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">
                    {profileName}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#a7a7a7]">
                    View profile
                  </p>
                </div>
                <span aria-hidden="true" className="text-xl leading-none">
                  ⋮
                </span>
              </div>
            </div>
          </div>
        </aside>

        <div className="ml-[280px] min-h-screen">
          <header className="flex h-[88px] items-center justify-between border-b border-[#e4e4e4] px-7">
            <p className="flex items-center gap-2 text-xs text-[#9b9b9b]">
              <span aria-hidden="true" className="text-xl leading-none">
                »
              </span>
              {getDisplayedDate()}
            </p>

            <div className="flex items-center gap-7">
              <button
                type="button"
                aria-label="Notifications"
                className="relative flex h-10 w-10 items-center justify-center text-xl text-[#626262]"
              >
                🔔
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#2fa69b]" />
              </button>
              <label className="flex h-12 w-[352px] items-center rounded-xl bg-white px-6 shadow-[0_12px_24px_rgba(25,25,25,0.06)]">
                <span className="sr-only">Search</span>
                <input
                  type="search"
                  placeholder="Search here"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#565656] outline-none placeholder:text-[#a4a4a4]"
                />
                <span
                  aria-hidden="true"
                  className="ml-4 text-2xl leading-none text-[#383838]"
                >
                  ⌕
                </span>
              </label>
            </div>
          </header>

          <main className="pb-14 pl-6 pr-10 pt-4">{children}</main>
        </div>
      </div>
    )
  }

  if (
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/transactions' ||
    location.pathname === '/transactions/add' ||
    location.pathname === '/expenses' ||
    location.pathname === '/accounts' ||
    location.pathname === '/account'
  ) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
                Financial App
              </Link>
            </div>

            <nav className="flex items-center space-x-4">
              {isAuthenticated && (
                <Link
                  to="/dashboard"
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Dashboard
                </Link>
              )}
              <NavigationBar />
              {isAuthenticated ? (
                <>
                  <span className="text-gray-700 dark:text-gray-300">
                    {user?.full_name || user?.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Đăng ký
                  </Link>
                </>
              )}

              <button
                onClick={toggleTheme}
                className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
            © 2024 Financial Management App. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Layout
