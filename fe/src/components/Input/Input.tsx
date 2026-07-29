import React, { useId } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  labelClassName?: string
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  labelClassName = '',
  className = '',
  id,
  ...props
}) => {
  const generatedId = useId()
  const inputId = id || `input-${generatedId.replace(/:/g, '')}`
  const errorId = `${inputId}-error`
  const helperTextId = `${inputId}-helper`
  const descriptionId = error ? errorId : helperText ? helperTextId : undefined
  const describedBy = [props['aria-describedby'], descriptionId].filter(Boolean).join(' ') || undefined

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${labelClassName}`}>
          {label}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`
          w-full px-4 py-2 border rounded-md transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          dark:bg-gray-700 dark:border-gray-600 dark:text-white
          ${error ? '!border-[#d92d20] focus:!ring-[#d92d20]' : 'border-gray-300'}
          ${className}
        `}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 flex items-start gap-1.5 text-sm text-[#b42318] dark:text-[#b42318]">
          <span aria-hidden="true" className="font-bold">!</span>
          <span>{error}</span>
        </p>
      )}
      {helperText && !error && (
        <p id={helperTextId} className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  )
}

export default Input
