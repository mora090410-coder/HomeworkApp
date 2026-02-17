/**
 * Design Token Source of Truth
 *
 * Every color used in the application MUST originate from this file.
 * Tailwind config imports these directly, and a Tailwind plugin generates
 * CSS custom properties for both light and dark themes from `semanticTokens`.
 */

export const colors = {
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
        50: "#FFFAF0",
        100: "#FDF4E3",
        200: "#FAE6C5",
        300: "#F6D296",
        400: "#F4C474",
        500: "#F1B04E",
        600: "#D99330",
        700: "#B5731F",
        800: "#945B19",
        900: "#7A4915",
    },
    grays: {
        white: "#FFFFFF",
        black: "#000000",
        950: "#070A0F",
        925: "#0A0F18",
        900: "#0B1220",
        850: "#101826",
        800: "#162033",
        750: "#1A2740",
        700: "#24314A",
        600: "#39465E",
        500: "#55627A",
        400: "#77839A",
        300: "#A2ABC0",
        200: "#CBD2E1",
        100: "#E9ECF3",
        50: "#F5F7FA",
    },
    accents: {
        heroRadialGlowTop: "rgba(244,63,94,0.20)",
        heroRadialGlowBottom: "rgba(244,63,94,0.10)",
        cardBorderLight: "rgba(255,255,255,0.10)",
        cardBorderDark: "rgba(0,0,0,0.10)",
        shadowSoft: "rgba(0,0,0,0.35)",
        shadowCrimson: "rgba(244,63,94,0.25)",
        iconNeutral: "rgba(255,255,255,0.70)",
        mutedTextOnDark: "rgba(255,255,255,0.65)",
        mutedTextOnLight: "rgba(15,23,42,0.65)",
    },
};

/**
 * Semantic Design Tokens
 *
 * The Tailwind plugin in tailwind.config.js reads these and generates
 * :root / .dark CSS custom properties automatically. Never hardcode
 * hex values in index.css or component files — reference these tokens
 * through Tailwind classes (bg-surface-app, text-content-primary, etc.).
 */
export const semanticTokens = {
    light: {
        // Backgrounds / Surfaces
        '--bg-app': colors.grays[50],
        '--bg-elev-1': colors.grays.white,
        '--bg-surface': colors.grays.white,
        '--bg-surface-2': colors.grays[100],

        // Borders
        '--border-base': 'rgba(0, 0, 0, 0.08)',
        '--border-highlight': 'rgba(255, 255, 255, 0.6)',

        // Text Hierarchy
        '--text-primary': colors.grays[900],
        '--text-muted': colors.grays[500],
        '--text-subtle': colors.grays[400],

        // Effects
        '--glass-surface': 'rgba(255, 255, 255, 0.7)',
        '--glass-border': 'rgba(255, 255, 255, 0.5)',
        '--glass-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',

        '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',

        '--accent-wash': `linear-gradient(135deg, ${colors.primary[500]}08 0%, ${colors.secondary[500]}08 100%)`,
    },
    dark: {
        // Backgrounds / Surfaces
        '--bg-app': colors.grays[950],
        '--bg-elev-1': colors.grays[925],
        '--bg-surface': colors.grays[900],
        '--bg-surface-2': colors.grays[850],

        // Borders
        '--border-base': 'rgba(255, 255, 255, 0.08)',
        '--border-highlight': 'rgba(255, 255, 255, 0.15)',

        // Text Hierarchy
        '--text-primary': colors.grays[100],
        '--text-muted': colors.grays[400],
        '--text-subtle': colors.grays[600],

        // Effects
        '--glass-surface': 'rgba(20, 20, 20, 0.6)',
        '--glass-border': 'rgba(255, 255, 255, 0.08)',
        '--glass-shadow': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',

        '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',

        '--accent-wash': `linear-gradient(135deg, ${colors.primary[500]}0D 0%, ${colors.secondary[500]}0A 100%)`,
    },
};
