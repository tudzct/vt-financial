import React, { useId } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  trailingElement?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  className = '',
  id,
  trailingElement,
  ...props
}, ref) => {
  const generatedId = useId()
  const inputId = id || `input-${generatedId}`
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`
  const describedBy = error ? errorId : helperText ? helperId : props['aria-describedby']

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`
            w-full px-4 py-2 border rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            dark:bg-gray-700 dark:border-gray-600 dark:text-white
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
            ${trailingElement ? 'pr-12' : ''}
            ${className}
          `}
          {...props}
        />
        {trailingElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {trailingElement}
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
