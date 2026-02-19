import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../src/context/ThemeContext';

export default function ThemeSwitch() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-none bg-surface-2 border border-stroke-base text-content-primary transition-all hover:bg-surface-elev active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-400"
            aria-label="Toggle dark mode"
        >
            {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-primary-400" />
            ) : (
                <Moon className="w-5 h-5 text-content-muted" />
            )}
        </button>
    );
}
