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
                'cream': colors.brand.cream,
                'charcoal': colors.brand.charcoal,
                'crimson': colors.brand.crimson,
                'gold': colors.brand.gold,
                'momentum-start': colors.brand.momentumStart,
                'momentum-end': colors.brand.momentumEnd,
                'photon-white': colors.brand.photonWhite,
                'vapor-grey': colors.brand.vaporGrey,
                brand: {
                    DEFAULT: colors.brand.charcoal,
                    white: colors.brand.cream,
                    grey: colors.brand.neutralText,
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
                sans: ['"SF Pro Display"', '"-apple-system"', '"BlinkMacSystemFont"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"'],
                heading: ['"SF Pro Display"', '"-apple-system"', '"BlinkMacSystemFont"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"'],
            },
            backgroundImage: {
                'ascendant-gradient': `linear-gradient(135deg, ${colors.brand.crimson} 0%, ${colors.brand.gold} 100%)`,
                'cream-to-charcoal': `linear-gradient(180deg, ${colors.brand.cream} 0%, ${colors.brand.charcoal} 100%)`,
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
