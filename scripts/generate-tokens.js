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

const { primary, neutral, semantic } = tokens.colors;

// ── 2. Derive semantic surface / text / border values ───────────────────────
// Light mode
const light = {
    '--bg-app': '#F5F7FA',
    '--bg-elev-1': neutral.white,
    '--bg-surface': neutral.white,
    '--bg-surface-2': neutral.muted_bg,
    '--border-base': 'rgba(0, 0, 0, 0.08)',
    '--border-highlight': 'rgba(255, 255, 255, 0.6)',
    '--text-primary': '#0B1220',
    '--text-muted': '#55627A',
    '--text-subtle': '#77839A',
    '--glass-surface': 'rgba(255, 255, 255, 0.7)',
    '--glass-border': 'rgba(255, 255, 255, 0.5)',
    '--glass-shadow': '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
    '--shadow-sm': '0 1px 2px 0 rgba(0,0,0,0.05)',
    '--shadow-md': '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
    '--shadow-lg': '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.025)',
    '--accent-wash': `linear-gradient(135deg, ${primary.cardinal}08 0%, ${primary.gold}08 100%)`,
};

// Dark mode
const dark = {
    '--bg-app': '#070A0F',
    '--bg-elev-1': '#0A0F18',
    '--bg-surface': '#0B1220',
    '--bg-surface-2': '#101826',
    '--border-base': 'rgba(255, 255, 255, 0.08)',
    '--border-highlight': 'rgba(255, 255, 255, 0.15)',
    '--text-primary': '#E9ECF3',
    '--text-muted': '#77839A',
    '--text-subtle': '#39465E',
    '--glass-surface': 'rgba(20, 20, 20, 0.6)',
    '--glass-border': 'rgba(255, 255, 255, 0.08)',
    '--glass-shadow': '0 8px 32px 0 rgba(0,0,0,0.5)',
    '--shadow-sm': '0 1px 2px 0 rgba(0,0,0,0.3)',
    '--shadow-md': '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.2)',
    '--shadow-lg': '0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -2px rgba(0,0,0,0.3)',
    '--accent-wash': `linear-gradient(135deg, ${primary.cardinal}0D 0%, ${primary.gold}0A 100%)`,
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
  primary: {
    cardinal:      '${primary.cardinal}',
    cardinalHover: '${primary.cardinal_hover}',
    gold:          '${primary.gold}',
  },
  neutral: {
    // Tailwind slate scale — keeps neutral-50 … neutral-950 working
${slateEntries}
    // Brand-named tokens
    black:    '${neutral.black}',
    white:    '${neutral.white}',
    lightGray:'${neutral.light_gray}',
    darkGray: '${neutral.dark_gray}',
    mutedBg:  '${neutral.muted_bg}',
  },
  semantic: {
    success:     '${semantic.success}',
    destructive: '${semantic.destructive}',
  },
};
`;

writeFileSync(resolve(ROOT, 'src/generated/tokens.js'), tokensJs, 'utf8');
console.log('✅  Wrote src/generated/tokens.js');
