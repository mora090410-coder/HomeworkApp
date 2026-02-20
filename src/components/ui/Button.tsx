import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className = '',
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            children,
            disabled,
            ...props
        },
        ref
    ) => {
        const isPrimary = variant === 'primary';

        const baseStyles = isPrimary
            ? 'disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2'
            : 'inline-flex items-center justify-center font-sans font-medium transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 rounded-full';

        const variants = {
            primary:
                'tactile-button',
            secondary:
                'bg-white/10 border border-white/20 shadow-sm backdrop-blur-md text-blue-500 hover:bg-white/20 dark:bg-black/10 dark:border-white/10 dark:hover:bg-black/20',
            outline:
                'bg-transparent border border-white/20 shadow-sm backdrop-blur-md text-primary hover:bg-surface',
            ghost:
                'bg-transparent text-muted hover:bg-surface-2 hover:text-primary',
            destructive:
                'bg-white text-semantic-destructive border border-semantic-destructive hover:bg-semantic-destructive/5',
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs gap-1.5',
            md: 'h-10 px-5 text-sm gap-2',
            lg: 'h-12 px-8 text-base gap-2.5',
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant] || variants.primary} ${isPrimary ? '' : sizes[size]} ${className}`}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
                <span>{children}</span>
                {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = 'Button';
