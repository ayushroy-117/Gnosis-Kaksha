import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-base font-medium text-[#4A5568] mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1295D8] focus:ring-2 focus:ring-[rgba(18,149,216,0.15)] transition-all bg-white ${
            error ? 'border-red-500 focus:border-red-500' : ''
          } ${className || ''}`}
          {...props}
        >
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
