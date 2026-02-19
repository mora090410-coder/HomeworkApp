// Colors are auto-generated from .agent/skill/brand-identity/resources/design-tokens.json
// Run `node scripts/generate-tokens.js` after editing design-tokens.json.
import { colors } from './src/generated/tokens.js';

/**
 * Tailwind Configuration
 *
 * Color palette values are auto-generated from:
 *   .agent/skill/brand-identity/resources/design-tokens.json
 *
 * To update colors: edit design-tokens.json, then run `npm run tokens`.
 * Semantic CSS variables (:root / .dark) are written to src/generated/design-tokens.css.
 */

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'photon-white': colors.brand.photonWhite,
                'obsidian': colors.brand.obsidian,
                brand: {
                    DEFAULT: colors.brand.obsidian,
                    white: colors.brand.photonWhite,
                    grey: colors.brand.vaporGrey,
                    text: colors.brand.neutralText,
                    ...colors.brand,
                },
                neutral: colors.neutral,
                semantic: colors.semantic,

                // Semantic Tokens (CSS var-based, theme-aware)
                surface: {
                    app: 'var(--bg-app)',
                    base: 'var(--bg-surface)',
                    2: 'var(--bg-surface-2)',
                    elev: 'var(--bg-elev-1)',
                },
                content: {
                    primary: 'var(--text-primary)',
                    muted: 'var(--text-muted)',
                    subtle: 'var(--text-subtle)',
                },
                stroke: {
                    base: 'var(--border-base)',
                    highlight: 'var(--border-highlight)',
                }
            },
            borderRadius: {
                'card': '12px',
            },
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro"', '"Helvetica Neue"', 'sans-serif'],
                heading: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro"', '"Helvetica Neue"', 'sans-serif'],
            },
            backgroundImage: {
                'momentum-gradient': `linear-gradient(to right, var(--momentum-start), var(--momentum-end))`,
            },
            boxShadow: {
                'sm': 'var(--shadow-sm)',
                'md': 'var(--shadow-md)',
                'lg': 'var(--shadow-lg)',
                'soft-ambient': 'var(--shadow-soft-ambient)',
            },
        },
    },
    plugins: [],
}
