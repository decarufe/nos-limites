#!/usr/bin/env node
/**
 * Feature #62: Design system colors match specification
 *
 * Verification steps:
 * 1. Read global.css and verify CSS variables match spec
 * 2. Primary color: #7C3AED (violet)
 * 3. Secondary color: #EC4899 (rose)
 * 4. Accent color: #06B6D4 (turquoise)
 * 5. Background: #FAFAF9 (off-white)
 * 6. Text: #1C1917 (dark gray)
 * 7. Success: #10B981 (green)
 * 8. Error: #EF4444 (red)
 * 9. Warning: #F59E0B (orange)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color specifications from app_spec.txt
const SPEC_COLORS = {
  primary: '#7C3AED',      // Violet doux
  secondary: '#EC4899',    // Rose chaleureux
  accent: '#06B6D4',       // Turquoise
  background: '#FAFAF9',   // Blanc cassé
  text: '#1C1917',         // Gris foncé
  success: '#10B981',      // Vert
  warning: '#F59E0B',      // Orange
  error: '#EF4444',        // Rouge
};

console.log('='.repeat(60));
console.log('Feature #62: Design System Colors Match Specification');
console.log('='.repeat(60));
console.log();

let passed = 0;
let failed = 0;

function normalizeColor(color) {
  return color.toUpperCase().replace(/\s+/g, '');
}

function testColor(name, expected) {
  const globalCssPath = path.join(__dirname, 'client/src/styles/global.css');
  const content = fs.readFileSync(globalCssPath, 'utf8');

  // Extract CSS variable definition
  const varName = `--color-${name}`;
  const regex = new RegExp(`${varName}:\\s*([#0-9A-Fa-f]{6,7})`, 'i');
  const match = content.match(regex);

  if (!match) {
    console.log(`❌ FAIL: ${name} - CSS variable not found`);
    failed++;
    return false;
  }

  const actual = normalizeColor(match[1]);
  const expectedNorm = normalizeColor(expected);

  if (actual === expectedNorm) {
    console.log(`✅ PASS: ${name.padEnd(12)} - ${actual} matches spec`);
    passed++;
    return true;
  } else {
    console.log(`❌ FAIL: ${name.padEnd(12)} - Expected ${expectedNorm}, got ${actual}`);
    failed++;
    return false;
  }
}

// Test each color
console.log('Testing CSS color variables in global.css:');
console.log('-'.repeat(60));

testColor('primary', SPEC_COLORS.primary);
testColor('secondary', SPEC_COLORS.secondary);
testColor('accent', SPEC_COLORS.accent);
testColor('background', SPEC_COLORS.background);
testColor('text', SPEC_COLORS.text);
testColor('success', SPEC_COLORS.success);
testColor('warning', SPEC_COLORS.warning);
testColor('error', SPEC_COLORS.error);

console.log();
console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.error('\n❌ Feature #62 verification FAILED');
  process.exit(1);
} else {
  console.log('\n✅ Feature #62 verification PASSED');
  console.log('All design system colors match specification!');
  process.exit(0);
}
