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
          flex h-10 w-full bg-surface py-2 px-3 text-sm text-primary 
          border border-border-base
          placeholder:text-muted 
          focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:border-amber-500
          disabled:cursor-not-allowed disabled:opacity-50
          rounded-2xl
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
