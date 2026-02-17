import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/Button';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <Button
                variant="glass"
                size="md"
                onClick={toggleTheme}
                className="rounded-full w-12 h-12 p-0 shadow-glow-primary hover:shadow-glow-secondary bg-black/40 border-white/10 dark:text-white text-black dark:bg-black/40 bg-white/40"
                aria-label="Toggle theme"
            >
                {theme === 'dark' ? (
                    <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                    <Moon className="w-5 h-5 text-primary-600" />
                )}
            </Button>
        </div>
    );
}
