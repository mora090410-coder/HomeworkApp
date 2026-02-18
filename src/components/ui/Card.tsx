import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    noPadding?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, noPadding = false, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`
          bg-white border border-neutral-lightGray shadow-sm
          rounded-none
          transition-shadow duration-200
          ${noPadding ? '' : 'p-6'}
          ${className}
        `}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Card.displayName = 'Card';

export { Card };
