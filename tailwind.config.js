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
                primary: {
                    DEFAULT: colors.primary.cardinal,
                    hover: colors.primary.cardinalHover,
                    ...colors.primary,
                },
                secondary: {
                    DEFAULT: colors.primary.gold,
                    gold: colors.primary.gold,
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
                'card': '0px', // Brand identity says 0px radius or clean cards? "clean cards"
                // Checking design-tokens.json: "border_radius": "0px"
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                heading: ['"Libre Baskerville"', 'Georgia', 'serif'],
            },
            backgroundImage: {
                'primary-gradient': `linear-gradient(to right, ${colors.primary.cardinal}, ${colors.primary.gold})`,
            },
            boxShadow: {
                'sm': 'var(--shadow-sm)',
                'md': 'var(--shadow-md)',
                'lg': 'var(--shadow-lg)',
            },
        },
    },
    plugins: [],
}
