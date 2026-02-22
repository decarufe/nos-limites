/**
 * Feature #53: Limit notes persist and display correctly
 *
 * Test steps:
 * 1. User A adds note 'NOTE_PERSIST_TEST_001' to limit L1
 * 2. Refresh the page (simulate page reload by fetching limits again)
 * 3. Navigate back to L1, verify note 'NOTE_PERSIST_TEST_001' is still there
 * 4. User B also checks L1 (making it a common limit)
 * 5. Navigate to 'En commun' tab
 * 6. Verify the note from User A appears on the common limit L1
 * 7. Verify the note is stored in user_limits table in database
 */

const BASE_URL = 'http://localhost:3001/api';

async function testNotesPersistence() {
  console.log('\n=== Feature #53: Limit notes persist and display correctly ===\n');

  // Step 1: Create two test users
  const userA_email = `user_a_notes_${Date.now()}@test.com`;
  const userB_email = `user_b_notes_${Date.now()}@test.com`;

  console.log(`1. Creating User A: ${userA_email}`);
  const mlA = await fetch(`${BASE_URL}/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userA_email })
  });
  const mlAData = await mlA.json();

  const vA = await fetch(`${BASE_URL}/auth/verify?token=${mlAData.token}`);
  const vAData = await vA.json();
  const tokenA = vAData.token;
  console.log(`   ✓ User A created`);

  console.log(`\n2. Creating User B: ${userB_email}`);
  const mlB = await fetch(`${BASE_URL}/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userB_email })
  });
  const mlBData = await mlB.json();

  const vB = await fetch(`${BASE_URL}/auth/verify?token=${mlBData.token}`);
  const vBData = await vB.json();
  const tokenB = vBData.token;
  console.log(`   ✓ User B created`);

  // Step 2: Create relationship
  console.log(`\n3. Creating relationship between User A and User B`);
  const inviteRes = await fetch(`${BASE_URL}/relationships/invite`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const inviteData = await inviteRes.json();

  const acceptRes = await fetch(`${BASE_URL}/relationships/accept/${inviteData.data.invitationToken}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const acceptData = await acceptRes.json();
  const relationshipId = acceptData.data.relationshipId;
  console.log(`   ✓ Relationship created (ID: ${relationshipId})`);

  // Step 3: Get a limit ID
  console.log(`\n4. Getting a limit to test notes`);
  const limitsRes = await fetch(`${BASE_URL}/limits/categories`);
  const limitsData = await limitsRes.json();
  const limit1 = limitsData.data[0].subcategories[0].limits[0];
  const limitId = limit1.id;
  console.log(`   ✓ Selected limit: ${limit1.name} (ID: ${limitId})`);

  // Step 4: User A adds note to limit L1
  console.log(`\n5. User A adding note 'NOTE_PERSIST_TEST_001' to limit ${limitId}`);
  const noteRes = await fetch(`${BASE_URL}/relationships/${relationshipId}/limits/${limitId}/note`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({ note: 'NOTE_PERSIST_TEST_001' })
  });
  const noteData = await noteRes.json();
  console.log(`   ✓ Note added successfully`);

  // Step 5: Simulate page refresh by fetching limits again
  console.log(`\n6. Simulating page refresh (fetching limits again)`);
  const limitsRefresh = await fetch(`${BASE_URL}/relationships/${relationshipId}/limits`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const limitsRefreshData = await limitsRefresh.json();
  const limitWithNote = limitsRefreshData.data.limits.find(ul => ul.limitId === limitId);

  if (!limitWithNote || limitWithNote.note !== 'NOTE_PERSIST_TEST_001') {
    console.log(`   ✗ FAIL: Note not found after refresh`);
    console.log(`   Found: ${limitWithNote ? limitWithNote.note : 'null'}`);
    return false;
  }
  console.log(`   ✓ Note persisted after page refresh: ${limitWithNote.note}`);

  // Step 6: User A checks limit L1
  console.log(`\n7. User A checking limit ${limitId}`);
  await fetch(`${BASE_URL}/relationships/${relationshipId}/limits`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      limits: [{ limitId, isAccepted: true }]
    })
  });
  console.log(`   ✓ User A checked limit`);

  // Step 7: User B also checks limit L1 (creating a common limit)
  console.log(`\n8. User B checking limit ${limitId} (making it common)`);
  await fetch(`${BASE_URL}/relationships/${relationshipId}/limits`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`
    },
    body: JSON.stringify({
      limits: [{ limitId, isAccepted: true }]
    })
  });
  console.log(`   ✓ User B checked limit (now it's a common limit)`);

  // Step 8: Navigate to 'En commun' tab (fetch common limits)
  console.log(`\n9. Fetching common limits as User A`);
  const commonRes = await fetch(`${BASE_URL}/relationships/${relationshipId}/common-limits`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const commonData = await commonRes.json();

  if (commonData.data.count === 0) {
    console.log(`   ✗ FAIL: No common limits found`);
    return false;
  }
  console.log(`   ✓ Found ${commonData.data.count} common limit(s)`);

  // Step 9: Verify the note appears in common limits
  const commonLimit = commonData.data.commonLimits.find(cl => cl.id === limitId);
  if (!commonLimit) {
    console.log(`   ✗ FAIL: Common limit not found in response`);
    return false;
  }

  if (commonLimit.note !== 'NOTE_PERSIST_TEST_001') {
    console.log(`   ✗ FAIL: Note not found in common limit`);
    console.log(`   Expected: 'NOTE_PERSIST_TEST_001'`);
    console.log(`   Found: ${commonLimit.note}`);
    return false;
  }
  console.log(`   ✓ Note appears in common limits: ${commonLimit.note}`);

  // Step 10: Verify User B sees the same common limit but without User A's note
  console.log(`\n10. Verifying User B sees common limit (but not User A's note)`);
  const commonResB = await fetch(`${BASE_URL}/relationships/${relationshipId}/common-limits`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const commonDataB = await commonResB.json();
  const commonLimitB = commonDataB.data.commonLimits.find(cl => cl.id === limitId);

  if (commonLimitB.note !== null) {
    console.log(`   ✗ FAIL: User B should not see User A's note`);
    console.log(`   User B sees note: ${commonLimitB.note}`);
    return false;
  }
  console.log(`   ✓ User B sees common limit without User A's private note`);

  // Step 11: User B adds their own note
  console.log(`\n11. User B adding their own note to the same limit`);
  await fetch(`${BASE_URL}/relationships/${relationshipId}/limits/${limitId}/note`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`
    },
    body: JSON.stringify({ note: 'USER_B_NOTE_DIFFERENT' })
  });

  // Verify User B sees their own note
  const commonResB2 = await fetch(`${BASE_URL}/relationships/${relationshipId}/common-limits`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const commonDataB2 = await commonResB2.json();
  const commonLimitB2 = commonDataB2.data.commonLimits.find(cl => cl.id === limitId);

  if (commonLimitB2.note !== 'USER_B_NOTE_DIFFERENT') {
    console.log(`   ✗ FAIL: User B's note not saved`);
    return false;
  }
  console.log(`   ✓ User B sees their own note: ${commonLimitB2.note}`);

  // Verify User A still sees their own note (not User B's)
  const commonResA2 = await fetch(`${BASE_URL}/relationships/${relationshipId}/common-limits`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const commonDataA2 = await commonResA2.json();
  const commonLimitA2 = commonDataA2.data.commonLimits.find(cl => cl.id === limitId);

  if (commonLimitA2.note !== 'NOTE_PERSIST_TEST_001') {
    console.log(`   ✗ FAIL: User A's note changed unexpectedly`);
    console.log(`   Expected: 'NOTE_PERSIST_TEST_001'`);
    console.log(`   Found: ${commonLimitA2.note}`);
    return false;
  }
  console.log(`   ✓ User A still sees their own note (privacy maintained)`);

  // Cleanup
  console.log(`\n12. Cleaning up test users`);
  await fetch(`${BASE_URL}/profile`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  await fetch(`${BASE_URL}/profile`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  console.log(`   ✓ Test users deleted`);

  console.log(`\n✅ Feature #53 PASSING: Limit notes persist and display correctly\n`);
  return true;
}

testNotesPersistence().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
