import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white rounded-[12px] border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 ${
          className || ''
        }`}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
