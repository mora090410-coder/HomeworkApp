import React from 'react';

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, ...props }, ref) => {
        return (
            <input
                type={type}
                className={`
          flex h-10 w-full bg-white px-3 py-2 text-sm text-neutral-black 
          border border-neutral-200 
          placeholder:text-neutral-darkGray/60 
          focus:outline-none focus:ring-2 focus:ring-primary-gold focus:ring-offset-2 focus:border-primary-gold
          disabled:cursor-not-allowed disabled:opacity-50
          rounded-none
          transition-colors duration-200
          ${error ? 'border-semantic-destructive focus:ring-semantic-destructive' : ''}
          ${className}
        `}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = 'Input';

export { Input };
