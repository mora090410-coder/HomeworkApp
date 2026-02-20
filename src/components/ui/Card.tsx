import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    noPadding?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, noPadding = false, children, ...props }, ref) => {
        const baseClasses = `
          glass-card
          transition-all duration-200
          rounded-3xl
          ${noPadding ? '' : 'p-6'}
        `;

        return (
            <div
                ref={ref}
                className={`${baseClasses} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Card.displayName = 'Card';

export { Card };
