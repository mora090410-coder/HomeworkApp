import React, { forwardRef } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    error?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, error, ...props }, ref) => {
        return (
            <div className="relative">
                <select
                    className={`
            flex h-10 w-full bg-white px-3 py-2 text-sm text-neutral-black 
            border border-neutral-200 
            focus:outline-none focus:ring-2 focus:ring-primary-gold focus:ring-offset-2:border-primary-gold
            disabled:cursor-not-allowed disabled:opacity-50
            rounded-none
            appearance-none
            transition-colors duration-200
            ${error ? 'border-semantic-destructive focus:ring-semantic-destructive' : ''}
            ${className}
          `}
                    ref={ref}
                    {...props}
                >
                    {children}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
                    <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                </div>
            </div>
        );
    }
);

Select.displayName = 'Select';

export { Select };
