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

const { brand, semantic, gradients } = tokens.colors;

// ── 2. Derive semantic surface / text / border values ───────────────────────
// Light mode
const light = {
  '--bg-app': brand.photon_white,
  '--bg-elev-1': brand.photon_white,
  '--bg-surface': brand.photon_white,
  '--bg-surface-2': brand.vapor_grey,
  '--border-base': 'rgba(0, 0, 0, 0.08)',
  '--border-highlight': 'rgba(255, 255, 255, 0.6)',
  '--text-primary': brand.obsidian,
  '--text-muted': brand.neutral_text,
  '--text-subtle': '#9CA3AF',
  '--glass-surface': 'rgba(255, 255, 255, 0.7)',
  '--glass-border': 'rgba(255, 255, 255, 0.5)',
  '--glass-shadow': '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
  '--shadow-sm': '0 1px 2px 0 rgba(0,0,0,0.05)',
  '--shadow-md': '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
  '--shadow-lg': '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.025)',
  '--shadow-soft-ambient': tokens.ui.shadows.soft_ambient,
  '--accent-wash': `linear-gradient(135deg, ${gradients.momentum_start}08 0%, ${gradients.momentum_end}08 100%)`,
  '--momentum-start': gradients.momentum_start,
  '--momentum-end': gradients.momentum_end,
};

// Dark mode
const dark = {
  '--bg-app': brand.obsidian,
  '--bg-elev-1': '#1F2937',
  '--bg-surface': '#111827',
  '--bg-surface-2': '#374151',
  '--border-base': 'rgba(255, 255, 255, 0.08)',
  '--border-highlight': 'rgba(255, 255, 255, 0.15)',
  '--text-primary': brand.photon_white,
  '--text-muted': brand.vapor_grey,
  '--text-subtle': '#9CA3AF',
  '--glass-surface': 'rgba(17, 24, 39, 0.7)',
  '--glass-border': 'rgba(255, 255, 255, 0.08)',
  '--glass-shadow': '0 8px 32px 0 rgba(0,0,0,0.5)',
  '--shadow-sm': '0 1px 2px 0 rgba(0,0,0,0.3)',
  '--shadow-md': '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.2)',
  '--shadow-lg': '0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -2px rgba(0,0,0,0.3)',
  '--shadow-soft-ambient': tokens.ui.shadows.soft_ambient,
  '--accent-wash': `linear-gradient(135deg, ${gradients.momentum_start}0D 0%, ${gradients.momentum_end}0A 100%)`,
  '--momentum-start': gradients.momentum_start,
  '--momentum-end': gradients.momentum_end,
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
    photonWhite: '${brand.photon_white}',
    vaporGrey: '${brand.vapor_grey}',
    obsidian: '${brand.obsidian}',
    neutralText: '${brand.neutral_text}',
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
    momentumStart: '${gradients.momentum_start}',
    momentumEnd: '${gradients.momentum_end}',
  },
};
`;

writeFileSync(resolve(ROOT, 'src/generated/tokens.js'), tokensJs, 'utf8');
console.log('✅  Wrote src/generated/tokens.js');
