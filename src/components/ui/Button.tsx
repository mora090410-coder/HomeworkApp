import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass';
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
        const baseStyles =
            'inline-flex items-center justify-center font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

        const variants = {
            primary:
                'bg-primary-gradient hover:bg-primary-gradient-hover text-white shadow-btn-primary hover:shadow-btn-primary-hover border border-transparent hover:-translate-y-0.5',
            secondary:
                'bg-secondary-gradient hover:bg-secondary-gradient-hover text-white shadow-btn-secondary hover:shadow-lg border border-transparent hover:-translate-y-0.5 text-shadow-sm',
            outline:
                'border-2 border-primary-500 text-primary-400 hover:bg-primary-500/10 hover:text-primary-300', // Adjusted specifically for dark bg usage
            ghost:
                'text-gray-400 hover:text-white hover:bg-white/10',
            glass:
                'bg-white/5 border border-white/10 text-white backdrop-blur-md hover:bg-white/10 hover:border-white/20 shadow-lg',
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
            md: 'h-10 px-5 text-sm rounded-xl gap-2',
            lg: 'h-12 px-8 text-base rounded-2xl gap-2.5',
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
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
