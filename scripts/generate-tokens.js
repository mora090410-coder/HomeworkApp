#!/usr/bin/env node
/**
 * Design Token CSS Generator
 *
 * Reads semanticTokens from colors.js and writes design-tokens.css
 * with :root (light) and .dark CSS custom properties.
 *
 * Run: node scripts/generate-tokens.js
 * Called automatically via the "prebuild" npm script.
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { semanticTokens } from '../src/skillmaster/colors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '..', 'src', 'generated', 'design-tokens.css');

/** Convert token map to CSS variable declarations. */
function toCSSBlock(tokens, indent = '    ') {
    return Object.entries(tokens)
        .map(([key, value]) => `${indent}${key}: ${value};`)
        .join('\n');
}

const css = `/* AUTO-GENERATED — DO NOT EDIT
 * Source of truth: src/skillmaster/colors.js
 * Regenerate: node scripts/generate-tokens.js
 */

:root {
${toCSSBlock(semanticTokens.light)}
}

.dark {
${toCSSBlock(semanticTokens.dark)}
}
`;

// Ensure output directory exists
import { mkdirSync } from 'fs';
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, css, 'utf-8');

console.log(`✓ Design tokens written to ${outputPath}`);
