import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── 1. Load source of truth ──────────────────────────────────────────────────
const tokens = JSON.parse(
  readFileSync(resolve(ROOT, 'design-tokens.json'), 'utf8')
);

const { colors, gradients, typography, radius, shadow } = tokens;

// ── 2. Derive CSS variables for design-tokens.css ────────────────────────────
const light = {
  '--bg-app': colors.background,
  '--bg-surface': colors.cream,
  '--bg-surface-elevated': colors.creamMid,
  '--text-primary': colors.charcoal,
  '--text-muted': typeof colors.charcoal === 'string' ? `${colors.charcoal}99` : colors.charcoal, // 60% opacity
  '--border-base': typeof colors.gold === 'string' ? `${colors.gold}33` : colors.gold, // 20% opacity
  '--gradient-ascendant': gradients.ascendant,
};

// Simple helper to generate dark mode variables (mostly reversing cream/charcoal)
const dark = {
  '--bg-app': colors.charcoal,
  '--bg-surface': colors.charcoalMid,
  '--bg-surface-elevated': '#16161E',
  '--text-primary': colors.background,
  '--text-muted': `${colors.background}99`,
  '--border-base': `${colors.gold}33`,
  '--gradient-ascendant': gradients.ascendant,
};

const toVars = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `    ${k}: ${v};`)
    .join('\n');

// ── 3. Write CSS ─────────────────────────────────────────────────────────────
const css = `/* AUTO-GENERATED — DO NOT EDIT
 * Source of truth: design-tokens.json
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
const tokensJs = `/* AUTO-GENERATED — DO NOT EDIT
 * Source of truth: design-tokens.json
 * Regenerate: node scripts/generate-tokens.js
 */

export default {
  colors: ${JSON.stringify(colors, null, 2)},
  gradients: ${JSON.stringify(gradients, null, 2)},
  typography: ${JSON.stringify(typography, null, 2)},
  radius: ${JSON.stringify(radius, null, 2)},
  shadow: ${JSON.stringify(shadow, null, 2)},
};
`;

writeFileSync(resolve(ROOT, 'src/generated/tokens.js'), tokensJs, 'utf8');
console.log('✅  Wrote src/generated/tokens.js');
