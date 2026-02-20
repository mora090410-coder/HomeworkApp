/**
 * generate-tokens.js
 *
 * Reads `.agent/skill/brand-identity/resources/design-tokens.json` (the single
 * source of truth for all brand values) and writes:
 *
 *   1. `src/generated/design-tokens.css`  — CSS custom properties for light & dark
 *   2. `src/generated/tokens.js`          — ESM export consumed by tailwind.config.js
 *
 * Run:  node scripts/generate-tokens.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Inlined Tailwind slate scale — no runtime dependency on tailwindcss package.
// Source: tailwindcss/colors (slate palette, v3/v4 stable values).
const slateScale = {
  '50': '#f8fafc', '100': '#f1f5f9', '200': '#e2e8f0', '300': '#cbd5e1',
  '400': '#94a3b8', '500': '#64748b', '600': '#475569', '700': '#334155',
  '800': '#1e293b', '900': '#0f172a', '950': '#020617',
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── 1. Load source of truth ──────────────────────────────────────────────────
const tokens = JSON.parse(
  readFileSync(resolve(ROOT, '.agent/skill/brand-identity/resources/design-tokens.json'), 'utf8')
);

const { brand, semantic } = tokens.colors;
const { gradients } = tokens;

// ── 2. Derive semantic surface / text / border values ───────────────────────
// Light mode
const light = {
  '--bg-app': brand.cream,
  '--bg-elev-1': brand.cream_mid,
  '--bg-surface': brand.cream,
  '--bg-surface-2': '#E5DFD3', // slightly darker cream for secondary surface
  '--border-base': 'rgba(139, 26, 26, 0.1)', // subtle crimson hint
  '--border-highlight': 'rgba(201, 168, 76, 0.4)', // subtle gold highlight
  '--text-primary': brand.charcoal,
  '--text-muted': tokens.colors.text.secondary,
  '--text-subtle': tokens.colors.text.light,
  '--glass-surface': 'rgba(245, 240, 232, 0.7)',
  '--glass-border': 'rgba(201, 168, 76, 0.20)', // subtle gold border
  '--glass-shadow': '0 4px 6px -1px rgba(139, 26, 26, 0.05), 0 2px 4px -1px rgba(139, 26, 26, 0.03)',
  '--shadow-sm': '0 1px 2px 0 rgba(0,0,0,0.05)',
  '--shadow-md': '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
  '--shadow-lg': '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.025)',
  '--shadow-soft-ambient': tokens.ui.shadows.ambient,
  '--accent-wash': `linear-gradient(135deg, ${brand.crimson}08 0%, ${brand.gold}08 100%)`,
  '--gradient-ascendant': gradients.ascendant.value,
  '--gradient-ascendant-hover': gradients.ascendant_hover.value,
};

// Dark mode
const dark = {
  '--bg-app': brand.charcoal,
  '--bg-elev-1': brand.charcoal_mid,
  '--bg-surface': brand.charcoal,
  '--bg-surface-2': '#262631',
  '--border-base': 'rgba(201, 168, 76, 0.15)', // subtle gold border
  '--border-highlight': 'rgba(201, 168, 76, 0.3)',
  '--text-primary': tokens.colors.text.on_dark,
  '--text-muted': tokens.colors.text.on_dark_muted,
  '--text-subtle': '#6B6B7A',
  '--glass-surface': 'rgba(15, 15, 20, 0.7)',
  '--glass-border': 'rgba(201, 168, 76, 0.15)',
  '--glass-shadow': '0 8px 32px 0 rgba(0,0,0,0.5)',
  '--shadow-sm': '0 1px 2px 0 rgba(0,0,0,0.3)',
  '--shadow-md': '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.2)',
  '--shadow-lg': '0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -2px rgba(0,0,0,0.3)',
  '--shadow-soft-ambient': tokens.ui.shadows.ambient,
  '--accent-wash': `linear-gradient(135deg, ${brand.crimson}0D 0%, ${brand.gold}0A 100%)`,
  '--gradient-ascendant': gradients.ascendant.value,
  '--gradient-ascendant-hover': gradients.ascendant_hover.value,
};


const toVars = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `    ${k}: ${v};`)
    .join('\n');

// ── 3. Write CSS ─────────────────────────────────────────────────────────────
const css = `/* AUTO-GENERATED — DO NOT EDIT
 * Source of truth: .agent/skill/brand-identity/resources/design-tokens.json
 * Regenerate: node scripts/generate-tokens.js
 */

:root {
${toVars(light)}
}

.dark {
${toVars(dark)}
}
`;

mkdirSync(resolve(ROOT, 'src/generated'), { recursive: true });
writeFileSync(resolve(ROOT, 'src/generated/design-tokens.css'), css, 'utf8');
console.log('✅  Wrote src/generated/design-tokens.css');

// ── 4. Write tokens.js (consumed by tailwind.config.js) ──────────────────────
// Serialize the slate scale so the generated file has no runtime import.
const slateEntries = Object.entries(slateScale)
  .map(([k, v]) => `  '${k}': '${v}',`)
  .join('\n');

const tokensJs = `/* AUTO-GENERATED — DO NOT EDIT
 * Source of truth: .agent/skill/brand-identity/resources/design-tokens.json
 * Regenerate: node scripts/generate-tokens.js
 */

export const colors = {
  brand: {
    cream: '${brand.cream}',
    charcoal: '${brand.charcoal}',
    crimson: '${brand.crimson}',
    gold: '${brand.gold}',
    neutralText: '${tokens.colors.text.secondary}',
  },
  neutral: {
    // Tailwind slate scale — keeps neutral-50 … neutral-950 working
${slateEntries}
  },
  semantic: {
    success: '${semantic.success}',
    destructive: '${semantic.destructive}',
  },
  gradients: {
    ascendant: '${gradients.ascendant.value}',
    ascendantHover: '${gradients.ascendant_hover.value}',
    creamToCharcoal: '${gradients.cream_to_charcoal.value}',
  },
};
`;

writeFileSync(resolve(ROOT, 'src/generated/tokens.js'), tokensJs, 'utf8');
console.log('✅  Wrote src/generated/tokens.js');
