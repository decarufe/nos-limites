/**
 * Feature #15: User profile persists after page refresh
 *
 * Test steps:
 * 1. Log in and set display name to 'TEST_PROFILE_PERSIST_789'
 * 2. Verify display name shows in profile page
 * 3. Hard refresh the browser (simulate page refresh)
 * 4. Verify display name 'TEST_PROFILE_PERSIST_789' still appears
 * 5. Verify avatar and other profile data persist
 */

const BASE_URL = 'http://localhost:3001/api';

async function testProfilePersistence() {
  console.log('\n=== Feature #15: User profile persists after page refresh ===\n');

  // Step 1: Create a test user and log in
  const testEmail = `profile_persist_${Date.now()}@test.com`;
  console.log(`1. Creating test user: ${testEmail}`);

  // Request magic link
  const magicLinkRes = await fetch(`${BASE_URL}/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });
  const magicLinkData = await magicLinkRes.json();
  console.log(`   Magic link created: ${magicLinkData.token}`);

  // Verify magic link
  const verifyRes = await fetch(`${BASE_URL}/auth/verify?token=${magicLinkData.token}`);
  const verifyData = await verifyRes.json();
  const token = verifyData.token;
  console.log(`   ✓ User created and logged in`);
  console.log(`   Initial display name: ${verifyData.user.displayName}`);

  // Step 2: Update display name to test value
  console.log(`\n2. Updating display name to 'TEST_PROFILE_PERSIST_789'`);
  const updateRes = await fetch(`${BASE_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ displayName: 'TEST_PROFILE_PERSIST_789' })
  });
  const updateData = await updateRes.json();
  console.log(`   ✓ Display name updated: ${updateData.user.displayName}`);

  // Step 3: Verify display name shows in profile
  console.log(`\n3. Getting profile data (first time)`);
  const profile1Res = await fetch(`${BASE_URL}/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const profile1Data = await profile1Res.json();
  console.log(`   Display name: ${profile1Data.user.displayName}`);
  console.log(`   Email: ${profile1Data.user.email}`);
  console.log(`   Avatar URL: ${profile1Data.user.avatarUrl || 'null'}`);

  if (profile1Data.user.displayName !== 'TEST_PROFILE_PERSIST_789') {
    console.log(`   ✗ FAIL: Expected 'TEST_PROFILE_PERSIST_789', got '${profile1Data.user.displayName}'`);
    return false;
  }
  console.log(`   ✓ Display name matches expected value`);

  // Step 4: Simulate page refresh by calling /auth/session endpoint
  // This is what happens when the user refreshes the page
  console.log(`\n4. Simulating page refresh (calling /auth/session)`);
  const sessionRes = await fetch(`${BASE_URL}/auth/session`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const sessionData = await sessionRes.json();
  console.log(`   Display name after refresh: ${sessionData.user.displayName}`);
  console.log(`   Email: ${sessionData.user.email}`);
  console.log(`   Avatar URL: ${sessionData.user.avatarUrl || 'null'}`);

  if (sessionData.user.displayName !== 'TEST_PROFILE_PERSIST_789') {
    console.log(`   ✗ FAIL: Expected 'TEST_PROFILE_PERSIST_789', got '${sessionData.user.displayName}'`);
    return false;
  }
  console.log(`   ✓ Display name persisted after page refresh`);

  // Step 5: Verify avatar and other profile data persist
  console.log(`\n5. Verifying all profile data persists`);
  if (sessionData.user.id !== profile1Data.user.id) {
    console.log(`   ✗ FAIL: User ID changed after refresh`);
    return false;
  }
  if (sessionData.user.email !== profile1Data.user.email) {
    console.log(`   ✗ FAIL: Email changed after refresh`);
    return false;
  }
  if (sessionData.user.avatarUrl !== profile1Data.user.avatarUrl) {
    console.log(`   ✗ FAIL: Avatar URL changed after refresh`);
    return false;
  }
  console.log(`   ✓ All profile fields persist correctly`);

  // Cleanup: delete the test user
  console.log(`\n6. Cleaning up test user`);
  await fetch(`${BASE_URL}/profile`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`   ✓ Test user deleted`);

  console.log(`\n✅ Feature #15 PASSING: User profile persists after page refresh\n`);
  return true;
}

testProfilePersistence().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
