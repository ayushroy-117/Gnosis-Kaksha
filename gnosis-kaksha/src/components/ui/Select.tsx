import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id: explicitId, ...props }, ref) => {
    const autoId = React.useId();
    const selectId = explicitId || (label ? `select-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${autoId}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-base font-medium text-[#4A5568] mb-2">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1295D8] focus:ring-2 focus:ring-[rgba(18,149,216,0.15)] transition-all bg-white text-[#0F172A] font-medium ${
            error ? 'border-red-500 focus:border-red-500' : ''
          } ${className || ''}`}
          {...props}
        >
          {!options.some((o) => o.value === '') && (
            <option value="">Select an option</option>
          )}
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
