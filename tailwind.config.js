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
                    50: "#FFF1F2",
                    100: "#FFE4E6",
                    200: "#FECDD3",
                    300: "#FDA4AF",
                    400: "#FB7185",
                    500: "#F43F5E",
                    600: "#E11D48",
                    700: "#BE123C",
                    800: "#9F1239",
                    900: "#881337",
                },
                secondary: {
                    50: "#FBF8F2",
                    100: "#F7F1E6",
                    200: "#EEE2CC",
                    300: "#E5D3B3",
                    400: "#DEC499",
                    500: "#D9C08D",
                    600: "#B89E6B",
                    700: "#967C4A",
                    800: "#755B28",
                    900: "#543906",
                },
                gray: {
                    100: "#E9ECF3",
                    200: "#CBD2E1",
                    300: "#A2ABC0",
                    400: "#77839A",
                    500: "#55627A",
                    600: "#39465E",
                    700: "#24314A",
                    750: "#1A2740",
                    800: "#162033",
                    850: "#101826",
                    900: "#0B1220",
                    925: "#0A0F18",
                    950: "#070A0F",
                }
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
