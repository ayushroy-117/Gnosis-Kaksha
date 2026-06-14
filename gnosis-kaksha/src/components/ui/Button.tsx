import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, ...props }, ref) => {
    const baseClasses = 'font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2';

    const variants = {
      primary: 'bg-gradient-to-r from-[#1295D8] to-[#50B4F2] text-white hover:shadow-lg disabled:opacity-50',
      secondary: 'bg-[#CDE6F7] text-[#1295D8] hover:bg-[#50B4F2] hover:text-white disabled:opacity-50',
      outline: 'border-2 border-[#1295D8] text-[#1295D8] hover:bg-[#CDE6F7] disabled:opacity-50',
      ghost: 'text-[#1295D8] hover:bg-[#CDE6F7] disabled:opacity-50',
    };

    const sizes = {
      sm: 'px-3 py-1 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className || ''}`}
        {...props}
      >
        {isLoading && <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
        {props.children}
      </button>
    );
  }
);

Button.displayName = 'Button';
