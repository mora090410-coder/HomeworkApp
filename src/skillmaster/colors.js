/**
 * Design Token Source of Truth
 *
 * Every color used in the application MUST originate from this file.
 * Tailwind config imports these directly, and a Tailwind plugin generates
 * CSS custom properties for both light and dark themes from `semanticTokens`.
 */

export const colors = {
    primary: {
        cardinal: "#990000",
        gold: "#FFCC00",
        cardinalHover: "#7A0000",
    },
    neutral: {
        black: "#000000",
        white: "#FFFFFF",
        lightGray: "#CCCCCC",
        darkGray: "#767676",
        mutedBg: "#F7F7F7",
    },
    semantic: {
        success: "#10B981",
        destructive: "#EF4444",
    },
    tertiary: [
        "#F2C6A7",
        "#F26178",
        "#2B5597",
        "#908C13",
        "#FDE021",
        "#DAE343",
        "#FF9015",
        "#E43D30",
    ],
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
        '--bg-app': colors.neutral.mutedBg,
        '--bg-elev-1': colors.neutral.white,
        '--bg-surface': colors.neutral.white,
        '--bg-surface-2': colors.neutral.mutedBg,

        // Borders
        '--border-base': colors.neutral.lightGray,
        '--border-highlight': colors.primary.gold,

        // Text Hierarchy
        '--text-primary': colors.neutral.black,
        '--text-muted': colors.neutral.darkGray,
        '--text-subtle': colors.neutral.lightGray,
        
        // Brand
        '--brand-primary': colors.primary.cardinal,
        '--brand-secondary': colors.primary.gold,

        // Effects
        '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    dark: {
         // Dark mode isn't explicitly defined in the new brand guidelines ("White space + neutral structure"). 
         // Mapping to sensible dark defaults or keeping light mode structure if dark mode is deprecated?
         // The prompt says "all other north star stylings are now irrelevant". 
         // "UI Foundation: White space + neutral structure".
         // Use a neutral dark palette for now to prevent breaking, but align with neutral tones.
        '--bg-app': '#121212',
        '--bg-elev-1': '#1E1E1E',
        '--bg-surface': '#1E1E1E',
        '--bg-surface-2': '#2C2C2C',

        '--border-base': '#333333',
        '--border-highlight': colors.primary.gold,

        '--text-primary': '#FFFFFF',
        '--text-muted': '#A3A3A3',
        '--text-subtle': '#525252',
        
        '--brand-primary': colors.primary.cardinal,
        '--brand-secondary': colors.primary.gold,

        '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    },
};
