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
                gray: colors.grays, // Note: Tailwind uses 'gray', colors.js uses 'grays'
            },
            borderRadius: {
                'card': '14px',
                'phoneMock': '24px',
            },
            fontFamily: {
                sans: ['Inter', 'Manrope', 'sans-serif'],
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
                'hero-media': '0 20px 60px rgba(0,0,0,0.45), 0 10px 30px rgba(244,63,94,0.15)',
                'card-soft': '0 10px 30px rgba(0,0,0,0.25)',
                'btn-primary': '0 10px 24px rgba(244,63,94,0.25)',
            },
            backgroundImage: {
                'primary-gradient': 'linear-gradient(180deg, #E11D48 0%, #BE123C 100%)',
            }
        },
    },
    plugins: [],
}
