import { colors } from './src/skillmaster/colors.js';

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
                primary: colors.primary,
                secondary: colors.secondary,
                gray: colors.grays,

                // Semantic Tokens
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
                'card': '20px',
                'phoneMock': '24px',
            },
            fontFamily: {
                sans: ['Manrope', 'sans-serif'],
                heading: ['Sora', 'system-ui', 'sans-serif'],
            },
            fontSize: {
                'hero-base': ['32px', { lineHeight: '1.05', fontWeight: '800', letterSpacing: '-0.02em' }],
                'hero-sm': ['40px', { lineHeight: '1.05', fontWeight: '800', letterSpacing: '-0.02em' }],
                'hero-md': ['48px', { lineHeight: '1.05', fontWeight: '800', letterSpacing: '-0.02em' }],
                'hero-lg': ['56px', { lineHeight: '1.05', fontWeight: '800', letterSpacing: '-0.02em' }],
                'section-label': ['12px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '0.08em' }],
                'card-title': ['13px', { lineHeight: '1.3', fontWeight: '700' }],
                'card-body': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
                'footer-sm': ['11px', { lineHeight: '1.4', fontWeight: '400' }],
            },
            boxShadow: {
                'sm': 'var(--shadow-sm)',
                'md': 'var(--shadow-md)',
                'lg': 'var(--shadow-lg)',
                'glass': 'var(--glass-shadow)',
                'hero-media': '0 20px 60px -5px rgba(0,0,0,0.5), 0 10px 30px -5px rgba(244,63,94,0.3)',
                'card-soft': 'var(--shadow-sm)',
                'card-hover': 'var(--shadow-md)',
                'btn-primary': '0 4px 14px 0 rgba(225, 29, 72, 0.5)',
                'btn-primary-hover': '0 6px 20px rgba(225, 29, 72, 0.4)',
                'btn-secondary': '0 4px 14px 0 rgba(241, 176, 78, 0.4)',
                'glow-primary': '0 0 20px rgba(225, 29, 72, 0.6)',
                'glow-secondary': '0 0 20px rgba(241, 176, 78, 0.5)',
            },
            backgroundImage: {
                'primary-gradient': 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
                'primary-gradient-hover': 'linear-gradient(135deg, #FB7185 0%, #F43F5E 100%)',
                'secondary-gradient': 'linear-gradient(135deg, #F1B04E 0%, #D99330 100%)',
                'secondary-gradient-hover': 'linear-gradient(135deg, #F4C474 0%, #F1B04E 100%)',
                'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',

                // Premium Depth Gradients
                'app-gradient-light': 'radial-gradient(circle at 50% 0%, rgba(244, 63, 94, 0.03) 0%, transparent 50%), radial-gradient(circle at 100% 0%, rgba(241, 176, 78, 0.05) 0%, transparent 40%)',
                'app-gradient-dark': 'radial-gradient(circle at 50% 0%, rgba(244, 63, 94, 0.08) 0%, transparent 50%), radial-gradient(circle at 100% 0%, rgba(241, 176, 78, 0.06) 0%, transparent 40%)',

                'accent-wash': 'var(--accent-wash)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            }
        },
    },
    plugins: [],
}
