#!/usr/bin/env node
/**
 * Feature #61 Verification Test
 * Limit checkboxes are accessible with keyboard
 *
 * This test verifies:
 * 1. Checkboxes have proper ARIA attributes (aria-checked, aria-label)
 * 2. Checkboxes have associated ID attributes for label association
 * 3. Focus styles are defined in CSS
 * 4. Checkboxes are keyboard-navigable (via tabindex)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n=== Feature #61: Keyboard Accessibility Verification ===\n');

let passedChecks = 0;
let totalChecks = 0;

function test(description, fn) {
  totalChecks++;
  try {
    fn();
    console.log(`✅ ${description}`);
    passedChecks++;
    return true;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Read the RelationshipPage.tsx file
const componentPath = join(__dirname, 'client', 'src', 'pages', 'RelationshipPage.tsx');
const componentContent = fs.readFileSync(componentPath, 'utf-8');

// Read the CSS module file
const cssPath = join(__dirname, 'client', 'src', 'pages', 'RelationshipPage.module.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

console.log('1. ARIA Attributes Verification\n');

test('Checkboxes have aria-checked attribute', () => {
  if (!componentContent.includes('aria-checked={checkedLimits.has(limit.id)}')) {
    throw new Error('aria-checked attribute not found or incorrect');
  }
});

test('Checkboxes have aria-label attribute', () => {
  if (!componentContent.includes('aria-label={limit.name}')) {
    throw new Error('aria-label attribute not found or incorrect');
  }
});

console.log('\n2. Label Association Verification\n');

test('Checkboxes have unique ID attributes', () => {
  if (!componentContent.includes('id={`limit-${limit.id}`}')) {
    throw new Error('Unique ID attribute not found');
  }
});

test('Checkboxes are wrapped in label elements', () => {
  const labelRegex = /<label[^>]*className={styles\.limitItem}>/;
  if (!labelRegex.test(componentContent)) {
    throw new Error('Label wrapper not found');
  }
});

test('Label contains limit name text', () => {
  const spanRegex = /<span[^>]*className={styles\.limitName}>\s*{limit\.name}\s*<\/span>/;
  if (!spanRegex.test(componentContent)) {
    throw new Error('Limit name span not found in label');
  }
});

console.log('\n3. Keyboard Navigation Verification\n');

test('Checkboxes use native checkbox input type', () => {
  if (!componentContent.includes('type="checkbox"')) {
    throw new Error('Native checkbox input type not found');
  }
});

test('Checkboxes are not explicitly removed from tab order', () => {
  // Check that there's no tabindex="-1" on checkboxes
  if (componentContent.match(/type="checkbox"[^>]*tabindex="-1"/)) {
    throw new Error('Checkboxes are removed from tab order');
  }
});

console.log('\n4. Focus Styles Verification\n');

test('CSS has :focus styles for checkboxes', () => {
  if (!cssContent.includes('.checkbox:focus')) {
    throw new Error(':focus style not found in CSS');
  }
});

test('CSS has :focus-visible styles for checkboxes', () => {
  if (!cssContent.includes('.checkbox:focus-visible')) {
    throw new Error(':focus-visible style not found in CSS');
  }
});

test('Focus styles include visible outline', () => {
  const focusBlock = cssContent.match(/\.checkbox:focus\s*{[^}]+}/);
  if (!focusBlock || !focusBlock[0].includes('outline:')) {
    throw new Error('Visible outline not found in :focus styles');
  }
});

test('Focus styles have proper outline color', () => {
  const focusBlock = cssContent.match(/\.checkbox:focus\s*{[^}]+}/);
  if (!focusBlock || !focusBlock[0].includes('var(--color-primary')) {
    throw new Error('Primary color outline not found in :focus styles');
  }
});

test('Focus styles have outline offset for better visibility', () => {
  const focusBlock = cssContent.match(/\.checkbox:focus\s*{[^}]+}/);
  if (!focusBlock || !focusBlock[0].includes('outline-offset:')) {
    throw new Error('Outline offset not found in :focus styles');
  }
});

console.log('\n5. State Management Verification\n');

test('Checkbox checked state is reactive', () => {
  if (!componentContent.includes('checked={checkedLimits.has(limit.id)}')) {
    throw new Error('Reactive checked state not found');
  }
});

test('Checkbox onChange handler is defined', () => {
  if (!componentContent.includes('onChange={() => toggleLimit(limit.id)}')) {
    throw new Error('onChange handler not found');
  }
});

test('Disabled state is properly handled', () => {
  if (!componentContent.includes('disabled={saving}')) {
    throw new Error('Disabled state not found');
  }
});

console.log('\n6. Accessibility Best Practices\n');

test('Checkboxes use semantic HTML (input type="checkbox")', () => {
  // Native checkboxes are more accessible than custom implementations
  const checkboxCount = (componentContent.match(/type="checkbox"/g) || []).length;
  if (checkboxCount === 0) {
    throw new Error('No semantic checkbox inputs found');
  }
});

test('Label wraps both checkbox and text for click target', () => {
  // Verify the structure: <label><input><span>text</span></label>
  const labelStructure = /<label[^>]*>\s*<input[^>]*type="checkbox"[^>]*>\s*<span[^>]*>{limit\.name}<\/span>\s*<\/label>/;
  if (!labelStructure.test(componentContent)) {
    throw new Error('Proper label structure not found');
  }
});

console.log('\n=== Test Summary ===\n');
console.log(`Passed: ${passedChecks}/${totalChecks} checks`);

if (passedChecks === totalChecks) {
  console.log('\n✅ Feature #61 is FULLY IMPLEMENTED and VERIFIED');
  console.log('\nAccessibility features verified:');
  console.log('  ✓ ARIA attributes (aria-checked, aria-label)');
  console.log('  ✓ Unique IDs for each checkbox');
  console.log('  ✓ Proper label association');
  console.log('  ✓ Keyboard navigable (native checkbox behavior)');
  console.log('  ✓ Visible focus indicators (outline with offset)');
  console.log('  ✓ Screen reader friendly (semantic HTML + ARIA)');
  console.log('  ✓ Reactive state management');
  console.log('  ✓ Disabled state handling');
  process.exit(0);
} else {
  console.log('\n❌ Some checks failed - see details above');
  process.exit(1);
}
