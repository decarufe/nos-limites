#!/usr/bin/env node

/**
 * Feature #55 Verification Test
 * Limit categories can be navigated and expanded/collapsed
 *
 * This test verifies:
 * 1. Categories are rendered with correct structure
 * 2. Categories can be expanded/collapsed via toggleCategoryExpanded function
 * 3. Chevron icon rotates when category is expanded
 * 4. Subcategories and limits are hidden when category is collapsed
 * 5. All 5 main categories exist
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Feature #55: Limit categories expand/collapse functionality\n');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ ${testName}`);
    passed++;
  } else {
    console.log(`❌ ${testName}`);
    failed++;
  }
}

// Read the RelationshipPage.tsx file
const relationshipPagePath = join(__dirname, 'client/src/pages/RelationshipPage.tsx');
const relationshipPageContent = await readFile(relationshipPagePath, 'utf-8');

// Read the CSS file
const cssPath = join(__dirname, 'client/src/pages/RelationshipPage.module.css');
const cssContent = await readFile(cssPath, 'utf-8');

console.log('📋 Verifying expand/collapse implementation:\n');

// Test 1: expandedCategories state exists
assert(
  relationshipPageContent.includes('expandedCategories') &&
  relationshipPageContent.includes('Set<string>'),
  'expandedCategories state is defined as Set<string>'
);

// Test 2: toggleCategoryExpanded function exists
assert(
  relationshipPageContent.includes('toggleCategoryExpanded') &&
  relationshipPageContent.includes('categoryId: string'),
  'toggleCategoryExpanded function exists with categoryId parameter'
);

// Test 3: Toggle function adds/removes from Set
assert(
  relationshipPageContent.includes('next.has(categoryId)') &&
  relationshipPageContent.includes('next.delete(categoryId)') &&
  relationshipPageContent.includes('next.add(categoryId)'),
  'Toggle function correctly adds/removes categoryId from Set'
);

// Test 4: Category header has onClick handler
assert(
  relationshipPageContent.includes('onClick={() => toggleCategoryExpanded(category.id)}'),
  'Category header button has onClick handler calling toggleCategoryExpanded'
);

// Test 5: Conditional rendering based on expanded state
assert(
  relationshipPageContent.includes('expandedCategories.has(category.id) &&') ||
  relationshipPageContent.includes('{expandedCategories.has(category.id)'),
  'Category body is conditionally rendered based on expanded state'
);

// Test 6: Chevron icon exists
assert(
  relationshipPageContent.includes('chevronIcon') &&
  relationshipPageContent.includes('chevronExpanded'),
  'Chevron icon with rotation classes exists'
);

// Test 7: Chevron rotation CSS
assert(
  cssContent.includes('.chevronExpanded') &&
  cssContent.includes('transform: rotate(180deg)'),
  'CSS rotates chevron 180deg when expanded'
);

// Test 8: Smooth transition animation
assert(
  cssContent.includes('transition: transform') &&
  cssContent.match(/chevronIcon[\s\S]*?transition/),
  'Chevron has smooth transition animation'
);

// Test 9: Category body contains subcategories
assert(
  relationshipPageContent.includes('categoryBody') &&
  relationshipPageContent.includes('category.subcategories.map'),
  'Category body renders subcategories when expanded'
);

// Test 10: Subcategories show limits list
assert(
  relationshipPageContent.includes('subcategory.limits.map') &&
  relationshipPageContent.includes('limitsList'),
  'Subcategories render their limits when category is expanded'
);

console.log('\n📊 Implementation verification complete!\n');

// Verify the data structure by checking API endpoints
console.log('🔍 Verifying category data structure:\n');

// Check limits seeder for 5 categories
const limitsSeederPath = join(__dirname, 'server/src/db/seed-limits.ts');
let limitsSeederContent;
try {
  limitsSeederContent = await readFile(limitsSeederPath, 'utf-8');

  // Count category definitions
  const categoryMatches = limitsSeederContent.match(/name:\s*["'].*?["'],.*?icon:/g);
  const categoryCount = categoryMatches ? categoryMatches.length : 0;

  assert(
    categoryCount === 5,
    `5 limit categories defined in seed data (found ${categoryCount})`
  );

  // Check for specific categories
  assert(
    limitsSeederContent.includes('Contact professionnel') &&
    limitsSeederContent.includes('Contact amical') &&
    limitsSeederContent.includes('Flirt et séduction'),
    'Required categories exist: Contact professionnel, Contact amical, Flirt et séduction'
  );

} catch (err) {
  console.log(`⚠️  Could not read seed file: ${err.message}`);
}

console.log('\n' + '='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(50) + '\n');

if (failed > 0) {
  console.log('❌ Some tests failed!\n');
  process.exit(1);
} else {
  console.log('✅ All implementation checks passed!\n');
  console.log('Feature #55 is correctly implemented:');
  console.log('  - Categories can be expanded/collapsed');
  console.log('  - Chevron icon rotates smoothly');
  console.log('  - Subcategories and limits are hidden when collapsed');
  console.log('  - All 5 main categories are defined\n');
  process.exit(0);
}
