import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    noPadding?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, noPadding = false, children, variant = 'default', ...props }, ref) => { // Added variant default value
        const baseClasses = `
          transition-shadow duration-200
          rounded-none
          ${noPadding ? '' : 'p-6'}
        `;

        const variantClasses =
            variant === 'default'
                ? `bg-white border border-neutral-200 shadow-sm`
                : `bg-neutral-50 border border-neutral-200`;

        return (
            <div
                ref={ref}
                className={`${baseClasses} ${variantClasses} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Card.displayName = 'Card';

export { Card };
