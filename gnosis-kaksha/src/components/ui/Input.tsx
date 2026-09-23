import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', id: explicitId, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = explicitId || (label ? `input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${autoId}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-base font-medium text-[#4A5568] mb-2">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={`w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1295D8] focus:ring-2 focus:ring-[rgba(18,149,216,0.15)] transition-all bg-white text-[#0F172A] placeholder:text-slate-500 placeholder:opacity-100 font-medium ${
            error ? 'border-red-500 focus:border-red-500' : ''
          } ${className || ''}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
