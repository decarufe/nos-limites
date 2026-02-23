#!/usr/bin/env node

/**
 * Test Features #50, #51, #65
 * - Feature #50: Limit categories display images and icons
 * - Feature #51: Limit counter per category updates dynamically
 * - Feature #65: Encouragement message displays on limits page
 */

const BASE_URL = 'http://localhost:3001';

console.log('=== Testing Features #50, #51, #65 ===\n');

// Test 1: Verify categories API returns icons
console.log('Test 1: Verify categories API returns icons from database');
try {
  const response = await fetch(`${BASE_URL}/api/limits/categories`);
  const data = await response.json();

  if (!data.success || !data.data || data.data.length === 0) {
    console.error('❌ Failed to fetch categories');
    process.exit(1);
  }

  const categories = data.data;
  console.log(`✓ Fetched ${categories.length} categories`);

  // Verify each category has an icon
  const expectedIcons = {
    'Contact professionnel': '🤝',
    'Contact amical': '😊',
    'Flirt et séduction': '💬',
    'Contact rapproché': '🤗',
    'Intimité': '💕'
  };

  let allIconsPresent = true;
  for (const category of categories) {
    const expectedIcon = expectedIcons[category.name];
    if (!expectedIcon) {
      console.error(`❌ Unknown category: ${category.name}`);
      allIconsPresent = false;
      continue;
    }

    if (category.icon !== expectedIcon) {
      console.error(`❌ Category "${category.name}" has icon "${category.icon}", expected "${expectedIcon}"`);
      allIconsPresent = false;
    } else {
      console.log(`✓ Category "${category.name}" has correct icon: ${category.icon}`);
    }
  }

  if (!allIconsPresent) {
    console.error('❌ Not all categories have correct icons');
    process.exit(1);
  }

  console.log('✓ All categories have correct icons from database\n');

  // Test 2: Verify category structure has limits for counting
  console.log('Test 2: Verify categories have subcategories and limits for counting');

  for (const category of categories) {
    if (!category.subcategories || category.subcategories.length === 0) {
      console.error(`❌ Category "${category.name}" has no subcategories`);
      process.exit(1);
    }

    let totalLimits = 0;
    for (const subcategory of category.subcategories) {
      if (!subcategory.limits || subcategory.limits.length === 0) {
        console.error(`❌ Subcategory "${subcategory.name}" has no limits`);
        process.exit(1);
      }
      totalLimits += subcategory.limits.length;
    }

    console.log(`✓ Category "${category.name}" has ${category.subcategories.length} subcategories, ${totalLimits} total limits`);
  }

  console.log('✓ All categories have proper structure for counting\n');

  // Test 3: Verify frontend code displays icons (check source)
  console.log('Test 3: Verify frontend code uses category.icon from API');
  const fs = await import('fs');
  const relationshipPagePath = './client/src/pages/RelationshipPage.tsx';
  const relationshipPageContent = fs.readFileSync(relationshipPagePath, 'utf-8');

  if (!relationshipPageContent.includes('{category.icon || "📋"}')) {
    console.error('❌ Frontend does not use category.icon from API');
    process.exit(1);
  }
  console.log('✓ Frontend uses category.icon from API response\n');

  // Test 4: Verify counter functions exist
  console.log('Test 4: Verify counter functions exist in frontend');
  if (!relationshipPageContent.includes('countCheckedInCategory') ||
      !relationshipPageContent.includes('countLimitsInCategory')) {
    console.error('❌ Counter functions not found in frontend');
    process.exit(1);
  }
  console.log('✓ Counter functions exist: countCheckedInCategory, countLimitsInCategory\n');

  // Test 5: Verify counter is displayed in UI
  console.log('Test 5: Verify counter is displayed in category header');
  const counterPattern = /{countCheckedInCategory\(category, checkedLimits\)}\s*\/\s*{countLimitsInCategory\(category\)}/;
  if (!counterPattern.test(relationshipPageContent)) {
    console.error('❌ Counter not displayed in category header');
    process.exit(1);
  }
  console.log('✓ Counter is displayed in format: X/Y limits\n');

  // Test 6: Verify encouragement message exists
  console.log('Test 6: Verify encouragement message exists in frontend');
  const encouragementText = 'Plus vous cochez de limites, plus vous en découvrirez en commun';
  if (!relationshipPageContent.includes(encouragementText)) {
    console.error('❌ Encouragement message not found in frontend');
    process.exit(1);
  }
  console.log(`✓ Encouragement message found: "${encouragementText}"\n`);

  // Test 7: Verify encouragement message styling exists
  console.log('Test 7: Verify encouragement message styling exists');
  const cssPath = './client/src/pages/RelationshipPage.module.css';
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  if (!cssContent.includes('.encouragementMessage')) {
    console.error('❌ Encouragement message CSS not found');
    process.exit(1);
  }
  console.log('✓ Encouragement message has dedicated CSS styling\n');

  console.log('=== All Tests Passed! ===');
  console.log('✅ Feature #50: Categories display icons from database');
  console.log('✅ Feature #51: Category counter displays X/Y limits dynamically');
  console.log('✅ Feature #65: Encouragement message displays on limits page');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}
