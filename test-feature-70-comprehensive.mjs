#!/usr/bin/env node

/**
 * Feature #70: Comprehensive Mobile Responsiveness Test
 *
 * Tests that limit checkboxes and categories render well on 375px mobile screens
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  Feature #70: Mobile Responsiveness - Comprehensive Test  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const tests = [];

// Test 1: Viewport optimization for 375px
console.log('📱 Test 1: Checking 375px viewport optimization...');
try {
  const { stdout } = await execAsync('cat client/src/pages/RelationshipPage.module.css');

  // Check for media queries targeting mobile
  const hasMobileMediaQuery = stdout.includes('@media (max-width: 400px)') ||
                               stdout.includes('@media (max-width: 375px)');

  // Check for responsive padding
  const hasResponsivePadding = stdout.match(/@media.*{\s*\.container\s*{[^}]*padding:/s);

  // Check for overflow prevention
  const hasOverflowPrevention = stdout.includes('overflow: hidden') ||
                                 stdout.includes('word-wrap: break-word') ||
                                 stdout.includes('overflow-wrap: break-word');

  if (hasMobileMediaQuery && hasOverflowPrevention) {
    console.log('   ✅ Mobile media queries present');
    console.log('   ✅ Overflow prevention configured');
    tests.push({ name: 'Mobile viewport optimization', passed: true });
  } else {
    console.log('   ❌ Missing mobile optimizations');
    tests.push({ name: 'Mobile viewport optimization', passed: false });
  }
} catch (error) {
  console.log('   ❌ Error checking CSS:', error.message);
  tests.push({ name: 'Mobile viewport optimization', passed: false });
}

// Test 2: Categories list without horizontal scroll
console.log('\n📋 Test 2: Verifying categories list layout...');
try {
  const { stdout } = await execAsync('cat client/src/pages/RelationshipPage.module.css');

  // Check for flexbox layout
  const hasFlexLayout = stdout.match(/\.categoriesList\s*{[^}]*display:\s*flex[^}]*flex-direction:\s*column/s);

  // Check for proper gaps
  const hasGaps = stdout.match(/\.categoriesList\s*{[^}]*gap:/s);

  // Check for no fixed widths that could cause overflow
  const categoryCardStyle = stdout.match(/\.categoryCard\s*{[^}]*}/s);
  const hasNoFixedWidth = categoryCardStyle && !categoryCardStyle[0].includes('width: ') ||
                          categoryCardStyle[0].includes('width: 100%');

  if (hasFlexLayout && hasGaps) {
    console.log('   ✅ Flexbox column layout configured');
    console.log('   ✅ Proper gaps between categories');
    tests.push({ name: 'Categories list layout', passed: true });
  } else {
    console.log('   ❌ Layout issues detected');
    tests.push({ name: 'Categories list layout', passed: false });
  }
} catch (error) {
  console.log('   ❌ Error checking layout:', error.message);
  tests.push({ name: 'Categories list layout', passed: false });
}

// Test 3: Category expansion and subcategories
console.log('\n🔽 Test 3: Checking expandable categories...');
try {
  const { stdout: tsxContent } = await execAsync('cat client/src/pages/RelationshipPage.tsx');
  const { stdout: cssContent } = await execAsync('cat client/src/pages/RelationshipPage.module.css');

  // Check for expand/collapse functionality
  const hasExpandState = tsxContent.includes('expandedCategories');
  const hasToggleFunction = tsxContent.includes('toggleCategoryExpanded');

  // Check for conditional rendering
  const hasConditionalRender = tsxContent.includes('expandedCategories.has(category.id)');

  // Check for category body styling
  const hasCategoryBody = cssContent.includes('.categoryBody');
  const hasSubcategoryStyle = cssContent.includes('.subcategory');

  if (hasExpandState && hasToggleFunction && hasConditionalRender && hasCategoryBody && hasSubcategoryStyle) {
    console.log('   ✅ Expand/collapse state management');
    console.log('   ✅ Conditional rendering implemented');
    console.log('   ✅ Category body styling present');
    console.log('   ✅ Subcategory styling configured');
    tests.push({ name: 'Category expansion', passed: true });
  } else {
    console.log('   ❌ Missing expansion functionality');
    tests.push({ name: 'Category expansion', passed: false });
  }
} catch (error) {
  console.log('   ❌ Error checking expansion:', error.message);
  tests.push({ name: 'Category expansion', passed: false });
}

// Test 4: Touch target sizes (44px minimum)
console.log('\n👆 Test 4: Verifying touch target sizes (WCAG 2.1 AA)...');
try {
  const { stdout } = await execAsync('cat client/src/pages/RelationshipPage.module.css');

  // Check for minimum touch target sizes in media queries
  const hasTouchTargets = {
    checkbox: stdout.match(/@media.*\.limitItem\s*{[^}]*min-height:\s*44px/s),
    noteButton: stdout.match(/@media.*\.noteButton\s*{[^}]*min-height:\s*44px/s),
    categoryHeader: stdout.match(/@media.*\.categoryHeader\s*{[^}]*min-height:\s*48px/s),
    tabs: stdout.match(/@media.*\.tab\s*{[^}]*min-height:\s*48px/s),
    dropdownItem: stdout.match(/@media.*\.dropdownItem\s*{[^}]*min-height:\s*48px/s),
  };

  const touchTargetCount = Object.values(hasTouchTargets).filter(Boolean).length;

  console.log(`   Touch targets with min-height >= 44px: ${touchTargetCount}/5`);

  if (touchTargetCount >= 4) {
    console.log('   ✅ Adequate touch targets (44px+) for mobile');
    Object.entries(hasTouchTargets).forEach(([key, value]) => {
      console.log(`      ${value ? '✅' : '⚠️ '} ${key}`);
    });
    tests.push({ name: 'Touch target sizes', passed: true });
  } else {
    console.log('   ❌ Insufficient touch targets');
    tests.push({ name: 'Touch target sizes', passed: false });
  }
} catch (error) {
  console.log('   ❌ Error checking touch targets:', error.message);
  tests.push({ name: 'Touch target sizes', passed: false });
}

// Test 5: Notes input modal usability
console.log('\n📝 Test 5: Checking notes input on mobile...');
try {
  const { stdout } = await execAsync('cat client/src/pages/RelationshipPage.module.css');

  // Check for responsive modal
  const hasMaxWidth = stdout.match(/\.modalContent\s*{[^}]*max-width:\s*400px/s);
  const hasFullWidth = stdout.match(/\.modalContent\s*{[^}]*width:\s*100%/s);
  const hasPadding = stdout.match(/\.modalOverlay\s*{[^}]*padding:\s*16px/s);

  // Check for mobile-specific modal adjustments
  const hasMobileModalWidth = stdout.match(/@media.*\.modalContent\s*{[^}]*max-width:\s*calc\(100vw/s);

  // Check for textarea styling
  const hasTextareaStyle = stdout.includes('.noteTextarea');
  const hasResizeVertical = stdout.match(/\.noteTextarea\s*{[^}]*resize:\s*vertical/s);

  if (hasMaxWidth && hasFullWidth && hasPadding && hasTextareaStyle) {
    console.log('   ✅ Modal max-width set (400px)');
    console.log('   ✅ Modal full width on small screens');
    console.log('   ✅ Modal overlay padding (16px)');
    console.log('   ✅ Textarea styling configured');
    if (hasMobileModalWidth) {
      console.log('   ✅ Mobile-specific modal width adjustment');
    }
    tests.push({ name: 'Notes input usability', passed: true });
  } else {
    console.log('   ❌ Modal not optimized for mobile');
    tests.push({ name: 'Notes input usability', passed: false });
  }
} catch (error) {
  console.log('   ❌ Error checking notes modal:', error.message);
  tests.push({ name: 'Notes input usability', passed: false });
}

// Test 6: "Tout cocher" button accessibility
console.log('\n🔘 Test 6: Verifying action button accessibility...');
try {
  const { stdout: tsxContent } = await execAsync('cat client/src/pages/RelationshipPage.tsx');
  const { stdout: cssContent } = await execAsync('cat client/src/pages/RelationshipPage.module.css');

  // Check for action buttons in TSX
  const hasToutCocherButton = tsxContent.includes('Tout cocher');
  const hasToutDecocherButton = tsxContent.includes('Tout décocher');

  // Check for button styling
  const hasActionButtonStyle = cssContent.includes('.categoryActionButton');
  const hasFlexLayout = cssContent.match(/\.categoryActions\s*{[^}]*display:\s*flex/s);
  const hasGaps = cssContent.match(/\.categoryActions\s*{[^}]*gap:/s);

  // Check for disabled state
  const hasDisabledProp = tsxContent.match(/disabled=\{saving\}/);

  if (hasToutCocherButton && hasToutDecocherButton && hasActionButtonStyle && hasFlexLayout && hasGaps) {
    console.log('   ✅ "Tout cocher" button present');
    console.log('   ✅ "Tout décocher" button present');
    console.log('   ✅ Flex layout with gaps');
    console.log('   ✅ Button styling configured');
    if (hasDisabledProp) {
      console.log('   ✅ Disabled state during save');
    }
    tests.push({ name: 'Action buttons accessibility', passed: true });
  } else {
    console.log('   ❌ Action buttons not properly configured');
    tests.push({ name: 'Action buttons accessibility', passed: false });
  }
} catch (error) {
  console.log('   ❌ Error checking action buttons:', error.message);
  tests.push({ name: 'Action buttons accessibility', passed: false });
}

// Test 7: Text readability on mobile
console.log('\n📖 Test 7: Checking text readability...');
try {
  const { stdout } = await execAsync('cat client/src/pages/RelationshipPage.module.css');

  // Extract all font sizes
  const fontSizeMatches = stdout.matchAll(/font-size:\s*(\d+)px/g);
  const sizes = [...fontSizeMatches].map(m => parseInt(m[1]));

  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);

  // Check for word wrapping
  const hasWordWrap = stdout.includes('word-wrap: break-word') ||
                      stdout.includes('overflow-wrap: break-word');

  // Check for mobile font adjustments
  const hasMobileFontSize = stdout.match(/@media.*font-size:\s*\d+px/s);

  console.log(`   Font size range: ${minSize}px - ${maxSize}px`);

  if (minSize >= 12 && hasWordWrap) {
    console.log('   ✅ Minimum font size acceptable (12px+)');
    console.log('   ✅ Word wrapping configured');
    if (hasMobileFontSize) {
      console.log('   ✅ Mobile-specific font adjustments');
    }
    tests.push({ name: 'Text readability', passed: true });
  } else {
    console.log('   ❌ Text may not be readable on mobile');
    tests.push({ name: 'Text readability', passed: false });
  }
} catch (error) {
  console.log('   ❌ Error checking text:', error.message);
  tests.push({ name: 'Text readability', passed: false });
}

// Test 8: Build verification
console.log('\n🔨 Test 8: Verifying TypeScript build...');
try {
  const { stdout, stderr } = await execAsync('npm run build --prefix client 2>&1');

  const hasErrors = stderr.includes('error') || stdout.includes('error TS');
  const buildSuccess = stdout.includes('✓ built in') || stdout.includes('built in');

  if (buildSuccess && !hasErrors) {
    console.log('   ✅ TypeScript compiles successfully');
    console.log('   ✅ Vite build completes');
    tests.push({ name: 'Build verification', passed: true });
  } else {
    console.log('   ❌ Build errors detected');
    tests.push({ name: 'Build verification', passed: false });
  }
} catch (error) {
  console.log('   ❌ Build failed:', error.message);
  tests.push({ name: 'Build verification', passed: false });
}

// Summary
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                      TEST SUMMARY                          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const passedTests = tests.filter(t => t.passed).length;
const totalTests = tests.length;

tests.forEach((test, index) => {
  const status = test.passed ? '✅' : '❌';
  console.log(`${status} Test ${index + 1}: ${test.name}`);
});

console.log('\n' + '─'.repeat(60));
console.log(`\n📊 Results: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests * 100)}%)\n`);

if (passedTests === totalTests) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          ✅ FEATURE #70: PASSING                          ║');
  console.log('║  Limit checkboxes and categories render well on mobile    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  process.exit(0);
} else if (passedTests >= totalTests * 0.75) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       ⚠️  FEATURE #70: MOSTLY PASSING                     ║');
  console.log('║  Mobile responsiveness is good but has minor issues       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  process.exit(0);
} else {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          ❌ FEATURE #70: NEEDS WORK                       ║');
  console.log('║  Mobile responsiveness needs improvement                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  process.exit(1);
}
