import React from 'react'
import { NavLink } from 'react-router-dom'

interface NavigationBarProps {
  variant?: 'header' | 'sidebar'
}

/** Renders the application navigation in its header or Figma sidebar form. */
const NavigationBar: React.FC<NavigationBarProps> = ({
  variant = 'header',
}) => {
  const navItems =
    variant === 'sidebar'
      ? [
          { path: '/dashboard', label: 'Overview', icon: '▦' },
          { path: '/accounts', label: 'Balances', icon: '▣' },
          { path: '/transactions', label: 'Transactions', icon: '⇄' },
          { path: '/bills', label: 'Bills', icon: '▧' },
          { path: '/expenses', label: 'Expenses', icon: '▤' },
          { path: '/goals', label: 'Goals', icon: '◉' },
        ]
      : [
          { path: '/bills', label: 'Hóa đơn', icon: '📄' },
          { path: '/transactions', label: 'Giao dịch', icon: '💳' },
          { path: '/accounts', label: 'Tài khoản', icon: '🏦' },
          { path: '/goals', label: 'Mục tiêu', icon: '🎯' },
          { path: '/expenses', label: 'Chi tiêu', icon: '💰' },
        ]

  if (variant === 'sidebar') {
    return (
      <nav aria-label="Primary navigation" className="space-y-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex h-12 items-center gap-4 rounded px-4 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#2fa69b] text-white'
                  : 'text-[#a7a7a7] hover:bg-[#242424] hover:text-white'
              }`
            }
          >
            <span
              aria-hidden="true"
              className="w-5 text-center text-xl leading-none"
            >
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
        <div className="flex h-12 items-center gap-4 rounded px-4 text-xs font-medium text-[#a7a7a7]">
          <span
            aria-hidden="true"
            className="w-5 text-center text-xl leading-none"
          >
            ⚙
          </span>
          Settings
        </div>
      </nav>
    )
  }

  return (
    <div className="flex items-center space-x-1 overflow-x-auto">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`
          }
        >
          <span aria-hidden="true" className="mr-1">
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}

export default NavigationBar
