import tokens from './src/generated/tokens.js'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ─── COLORS ───────────────────────────────────────────
      colors: {
        crimson:     tokens.colors.crimson,
        burgundy:    tokens.colors.burgundy,
        gold:        tokens.colors.gold,
        goldLight:   tokens.colors.goldLight,
        cream:       tokens.colors.cream,
        creamMid:    tokens.colors.creamMid,
        background:  tokens.colors.background,
        charcoal:    tokens.colors.charcoal,
        charcoalMid: tokens.colors.charcoalMid,
      },

      // ─── TYPOGRAPHY ───────────────────────────────────────
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans:  ['Inter', 'sans-serif'],
      },

      // ─── BORDER RADIUS ────────────────────────────────────
      borderRadius: {
        sm:   tokens.radius.sm,
        md:   tokens.radius.md,
        lg:   tokens.radius.lg,
        full: tokens.radius.full,
      },

      // ─── BOX SHADOW ───────────────────────────────────────
      boxShadow: {
        sm: tokens.shadow.sm,
        md: tokens.shadow.md,
        lg: tokens.shadow.lg,
      },

      // ─── BACKGROUND IMAGES (gradients) ────────────────────
      backgroundImage: {
        'ascendant-gradient': tokens.gradients.ascendant,
      },
    },
  },
  plugins: [],
}
