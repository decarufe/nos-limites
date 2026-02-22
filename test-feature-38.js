/**
 * Test for Feature #38: Profile display name validation
 *
 * Verifies:
 * 1. Empty name returns 400 error with French message
 * 2. Single character name returns 400 error (min length 2)
 * 3. Very long name (500+ chars) returns 400 error (max length 50)
 * 4. Valid name (2-50 chars) saves successfully
 * 5. All error messages are in French
 */

const BASE_URL = 'http://localhost:3001';

async function testFeature38() {
  console.log('=== Testing Feature #38: Profile display name validation ===\n');

  // Step 1: Create a test user via magic link
  console.log('Step 1: Creating test user...');
  const testEmail = `test_${Date.now()}@example.com`;

  const magicLinkResponse = await fetch(`${BASE_URL}/api/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });

  if (!magicLinkResponse.ok) {
    throw new Error(`Failed to request magic link: ${magicLinkResponse.status}`);
  }

  const magicLinkData = await magicLinkResponse.json();
  const token = magicLinkData.token;
  console.log(`✓ Magic link created for ${testEmail}`);

  // Step 2: Verify magic link to get session token
  console.log('\nStep 2: Verifying magic link...');
  const verifyResponse = await fetch(`${BASE_URL}/api/auth/verify?token=${token}`);

  if (!verifyResponse.ok) {
    throw new Error(`Failed to verify magic link: ${verifyResponse.status}`);
  }

  const verifyData = await verifyResponse.json();
  const sessionToken = verifyData.token;
  console.log(`✓ User verified, got session token`);

  // Step 3: Set up initial profile
  console.log('\nStep 3: Setting up initial profile...');
  const setupResponse = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ displayName: 'TestUser' })
  });

  if (!setupResponse.ok) {
    throw new Error(`Failed to set up profile: ${setupResponse.status}`);
  }
  console.log(`✓ Initial profile set up with displayName: "TestUser"`);

  // Test 1: Empty display name
  console.log('\n--- Test 1: Empty display name ---');
  const emptyResponse = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ displayName: '' })
  });

  if (emptyResponse.status !== 400) {
    throw new Error(`Expected 400 for empty name, got ${emptyResponse.status}`);
  }

  const emptyData = await emptyResponse.json();
  // Check for French keywords (requis, affichage, etc.)
  const isFrench = emptyData.message.includes('requis') || emptyData.message.includes('affichage');
  if (!isFrench) {
    throw new Error(`Expected French error message, got: ${emptyData.message}`);
  }
  console.log(`✓ Empty name rejected with: "${emptyData.message}"`);

  // Test 2: Single character name (minimum length)
  console.log('\n--- Test 2: Single character name ---');
  const singleCharResponse = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ displayName: 'A' })
  });

  if (singleCharResponse.status !== 400) {
    throw new Error(`Expected 400 for single char name, got ${singleCharResponse.status}`);
  }

  const singleCharData = await singleCharResponse.json();
  // Check for French and minimum length reference
  const isFrenchMin = singleCharData.message.includes('2') && (singleCharData.message.includes('caractères') || singleCharData.message.includes('affichage'));
  if (!isFrenchMin) {
    throw new Error(`Expected French min length error, got: ${singleCharData.message}`);
  }
  console.log(`✓ Single char name rejected with: "${singleCharData.message}"`);

  // Test 3: Very long name (500+ characters)
  console.log('\n--- Test 3: Very long name (500+ characters) ---');
  const longName = 'A'.repeat(500);
  const longNameResponse = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ displayName: longName })
  });

  if (longNameResponse.status !== 400) {
    throw new Error(`Expected 400 for long name, got ${longNameResponse.status}`);
  }

  const longNameData = await longNameResponse.json();
  // Check for French and maximum length reference
  const isFrenchMax = longNameData.message.includes('50') && (longNameData.message.includes('caractères') || longNameData.message.includes('affichage'));
  if (!isFrenchMax) {
    throw new Error(`Expected French max length error, got: ${longNameData.message}`);
  }
  console.log(`✓ Long name (500 chars) rejected with: "${longNameData.message}"`);

  // Test 4: Valid name (2-50 characters)
  console.log('\n--- Test 4: Valid name ---');
  const validName = 'Alice Dupont';
  const validResponse = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ displayName: validName })
  });

  if (!validResponse.ok) {
    const errorData = await validResponse.json();
    throw new Error(`Failed to save valid name: ${validResponse.status} - ${errorData.message}`);
  }

  const validData = await validResponse.json();
  if (validData.user.displayName !== validName) {
    throw new Error(`Expected displayName to be "${validName}", got "${validData.user.displayName}"`);
  }
  console.log(`✓ Valid name accepted: "${validData.user.displayName}"`);

  // Test 5: Edge case - exactly 50 characters
  console.log('\n--- Test 5: Edge case - exactly 50 characters ---');
  const maxName = 'A'.repeat(50);
  const maxResponse = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ displayName: maxName })
  });

  if (!maxResponse.ok) {
    const errorData = await maxResponse.json();
    throw new Error(`Failed to save 50-char name: ${maxResponse.status} - ${errorData.message}`);
  }

  const maxData = await maxResponse.json();
  if (maxData.user.displayName !== maxName) {
    throw new Error(`Expected displayName to be 50 chars, got ${maxData.user.displayName.length}`);
  }
  console.log(`✓ 50-character name accepted`);

  // Test 6: Edge case - exactly 2 characters
  console.log('\n--- Test 6: Edge case - exactly 2 characters ---');
  const minName = 'AB';
  const minResponse = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ displayName: minName })
  });

  if (!minResponse.ok) {
    const errorData = await minResponse.json();
    throw new Error(`Failed to save 2-char name: ${minResponse.status} - ${errorData.message}`);
  }

  const minData = await minResponse.json();
  if (minData.user.displayName !== minName) {
    throw new Error(`Expected displayName to be "${minName}", got "${minData.user.displayName}"`);
  }
  console.log(`✓ 2-character name accepted`);

  // Test 7: Whitespace handling
  console.log('\n--- Test 7: Whitespace handling ---');
  const nameWithSpaces = '  ValidName  ';
  const trimResponse = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ displayName: nameWithSpaces })
  });

  if (!trimResponse.ok) {
    const errorData = await trimResponse.json();
    throw new Error(`Failed to save name with spaces: ${trimResponse.status} - ${errorData.message}`);
  }

  const trimData = await trimResponse.json();
  if (trimData.user.displayName !== 'ValidName') {
    throw new Error(`Expected trimmed name "ValidName", got "${trimData.user.displayName}"`);
  }
  console.log(`✓ Whitespace correctly trimmed: "${nameWithSpaces}" → "${trimData.user.displayName}"`);

  console.log('\n=== ✅ All Feature #38 tests passed! ===');
  console.log('\nSummary:');
  console.log('✓ Empty name rejected with French error');
  console.log('✓ Single character rejected with French min length error');
  console.log('✓ 500+ characters rejected with French max length error');
  console.log('✓ Valid names (2-50 chars) accepted');
  console.log('✓ Edge cases (2 chars, 50 chars) work correctly');
  console.log('✓ Whitespace is trimmed properly');
}

// Run the test
testFeature38().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
