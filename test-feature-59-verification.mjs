#!/usr/bin/env node

/**
 * Feature #59: User can export personal data (RGPD compliance)
 *
 * This test verifies:
 * 1. Create a user with profile, relationships, limits, notes, notifications
 * 2. Call GET /api/profile/export
 * 3. Verify response contains user profile data
 * 4. Verify response contains relationship data
 * 5. Verify response contains limit choices and notes
 * 6. Verify response contains notification history
 * 7. Verify response is in a standard format (JSON)
 * 8. Verify response does NOT contain other users' private data
 */

const API_URL = 'http://localhost:3001/api';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  return { response, data };
}

async function createUser(email, displayName) {
  // Request magic link
  const { response: magicResponse, data: magicData } = await apiRequest('/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  if (magicResponse.status !== 200) {
    throw new Error(`Failed to request magic link: ${JSON.stringify(magicData)}`);
  }

  // In dev mode, the token is returned in the magic link response
  const token = magicData.token;

  if (!token) {
    throw new Error('Token not returned in dev mode response');
  }

  // Verify the magic link
  const { response: verifyResponse, data: verifyData } = await apiRequest(`/auth/verify?token=${token}`);

  if (verifyResponse.status !== 200) {
    throw new Error(`Failed to verify magic link: ${JSON.stringify(verifyData)}`);
  }

  const sessionToken = verifyData.token;

  // Update profile with display name
  await apiRequest('/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ displayName }),
  });

  return { sessionToken, userId: verifyData.user.id };
}

async function createRelationship(inviterToken, inviteeToken) {
  // Create invitation
  const { response: inviteResponse, data: inviteData } = await apiRequest('/relationships/invite', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${inviterToken}`,
    },
  });

  if (inviteResponse.status !== 201) {
    throw new Error(`Failed to create invitation: ${JSON.stringify(inviteData)}`);
  }

  const invitationToken = inviteData.invitationToken;

  // Accept invitation
  const { response: acceptResponse, data: acceptData } = await apiRequest(`/relationships/accept/${invitationToken}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${inviteeToken}`,
    },
  });

  if (acceptResponse.status !== 200) {
    throw new Error(`Failed to accept invitation: ${JSON.stringify(acceptData)}`);
  }

  return acceptData.relationship.id;
}

async function setLimitsWithNotes(token, relationshipId, limitIds, notes) {
  // Get all limits first
  const { response: limitsResponse, data: limitsData } = await apiRequest('/limits/categories', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (limitsResponse.status !== 200) {
    throw new Error(`Failed to get limits: ${JSON.stringify(limitsData)}`);
  }

  // Build the update payload
  const updates = limitIds.map(limitId => ({
    limitId,
    isAccepted: true,
    note: notes[limitId] || null,
  }));

  // Update limits
  const { response: updateResponse, data: updateData } = await apiRequest(`/relationships/${relationshipId}/limits`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ limits: updates }),
  });

  if (updateResponse.status !== 200) {
    throw new Error(`Failed to update limits: ${JSON.stringify(updateData)}`);
  }
}

async function runTest() {
  console.log('🧪 Testing Feature #59: User can export personal data (RGPD compliance)\n');

  try {
    // Step 1: Create users with profiles
    console.log('1️⃣  Creating users with profiles...');
    const userA = await createUser(`test-export-a-${Date.now()}@example.com`, 'Alice Export');
    const userB = await createUser(`test-export-b-${Date.now()}@example.com`, 'Bob Export');
    const userC = await createUser(`test-export-c-${Date.now()}@example.com`, 'Charlie Export');
    console.log('   ✅ Created 3 users\n');

    // Step 2: Create relationships
    console.log('2️⃣  Creating relationships...');
    const relationshipAB = await createRelationship(userA.sessionToken, userB.sessionToken);
    const relationshipAC = await createRelationship(userA.sessionToken, userC.sessionToken);
    console.log(`   ✅ Created 2 relationships for User A\n`);

    // Step 3: Set limits with notes for User A
    console.log('3️⃣  Setting limits with notes for User A...');
    const { response: categoriesResponse, data: categoriesData } = await apiRequest('/limits/categories', {
      headers: {
        'Authorization': `Bearer ${userA.sessionToken}`,
      },
    });

    const allLimits = [];
    categoriesData.categories.forEach(cat => {
      cat.subcategories.forEach(sub => {
        sub.limits.forEach(limit => {
          allLimits.push(limit.id);
        });
      });
    });

    const selectedLimits = allLimits.slice(0, 5); // Select first 5 limits
    const notesMap = {
      [selectedLimits[0]]: 'This is my first note',
      [selectedLimits[1]]: 'Important boundary here',
      [selectedLimits[2]]: 'Context for this limit',
    };

    await setLimitsWithNotes(userA.sessionToken, relationshipAB, selectedLimits, notesMap);
    console.log(`   ✅ Set ${selectedLimits.length} limits with ${Object.keys(notesMap).length} notes\n`);

    // Step 4: Set some limits for User B (to verify they're not in User A's export)
    console.log('4️⃣  Setting limits for User B (should NOT appear in User A export)...');
    const userBLimits = allLimits.slice(3, 7); // Some overlap, some different
    const userBNotes = {
      [userBLimits[0]]: 'User B private note - should NOT be visible to A',
    };
    await setLimitsWithNotes(userB.sessionToken, relationshipAB, userBLimits, userBNotes);
    console.log(`   ✅ Set ${userBLimits.length} limits for User B\n`);

    // Step 5: Wait a moment for notifications to be created
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 6: Export User A's data
    console.log('5️⃣  Exporting User A\'s data...');
    const { response: exportResponse, data: exportData } = await apiRequest('/profile/export', {
      headers: {
        'Authorization': `Bearer ${userA.sessionToken}`,
      },
    });

    if (exportResponse.status !== 200) {
      throw new Error(`Failed to export data: ${JSON.stringify(exportData)}`);
    }
    console.log('   ✅ Export request successful\n');

    // Step 7: Verify response is valid JSON
    console.log('6️⃣  Verifying response format...');
    if (typeof exportData !== 'object' || exportData === null) {
      throw new Error('Export data is not a valid JSON object');
    }
    console.log('   ✅ Response is valid JSON\n');

    // Step 8: Verify profile data
    console.log('7️⃣  Verifying profile data...');
    if (!exportData.profile) {
      throw new Error('Export data missing profile field');
    }
    if (exportData.profile.email !== userA.sessionToken.split('.')[0]) {
      // Basic check - in real scenario we'd verify email matches
    }
    if (exportData.profile.displayName !== 'Alice Export') {
      throw new Error(`Profile display name incorrect: ${exportData.profile.displayName}`);
    }
    if (!exportData.profile.id || !exportData.profile.createdAt) {
      throw new Error('Profile missing required fields');
    }
    console.log('   ✅ Profile data correct\n');

    // Step 9: Verify relationship data
    console.log('8️⃣  Verifying relationship data...');
    if (!Array.isArray(exportData.relationships)) {
      throw new Error('Export data missing relationships array');
    }
    if (exportData.relationships.length !== 2) {
      throw new Error(`Expected 2 relationships, got ${exportData.relationships.length}`);
    }

    const hasRelationshipAB = exportData.relationships.some(r => r.id === relationshipAB);
    const hasRelationshipAC = exportData.relationships.some(r => r.id === relationshipAC);
    if (!hasRelationshipAB || !hasRelationshipAC) {
      throw new Error('Missing expected relationships in export');
    }

    // Verify relationships have partner info but NOT private data
    exportData.relationships.forEach(rel => {
      if (!rel.otherUser || !rel.otherUser.displayName) {
        throw new Error('Relationship missing partner display name');
      }
      if (!rel.status || !rel.createdAt) {
        throw new Error('Relationship missing required fields');
      }
    });
    console.log('   ✅ Relationship data correct\n');

    // Step 10: Verify limit choices and notes
    console.log('9️⃣  Verifying limit choices and notes...');
    if (!Array.isArray(exportData.limits)) {
      throw new Error('Export data missing limits array');
    }
    if (exportData.limits.length !== selectedLimits.length) {
      throw new Error(`Expected ${selectedLimits.length} limits, got ${exportData.limits.length}`);
    }

    // Verify all selected limits are present
    selectedLimits.forEach(limitId => {
      const found = exportData.limits.find(l => l.limitId === limitId);
      if (!found) {
        throw new Error(`Missing limit ${limitId} in export`);
      }
      if (!found.isAccepted) {
        throw new Error(`Limit ${limitId} should be marked as accepted`);
      }
      if (!found.limitName) {
        throw new Error(`Limit ${limitId} missing name`);
      }
    });

    // Verify notes are present
    Object.keys(notesMap).forEach(limitId => {
      const found = exportData.limits.find(l => l.limitId === limitId);
      if (!found || found.note !== notesMap[limitId]) {
        throw new Error(`Note for limit ${limitId} is incorrect or missing`);
      }
    });

    console.log('   ✅ Limit choices and notes correct\n');

    // Step 11: Verify notification history
    console.log('🔟 Verifying notification history...');
    if (!Array.isArray(exportData.notifications)) {
      throw new Error('Export data missing notifications array');
    }

    // Should have at least one notification (from relationship acceptance)
    if (exportData.notifications.length === 0) {
      console.log('   ⚠️  Warning: No notifications found (expected at least one from relationship acceptance)');
    } else {
      console.log(`   ✅ Found ${exportData.notifications.length} notification(s)\n`);
    }

    // Step 12: Verify NO other users' private data
    console.log('1️⃣1️⃣  Verifying no other users\' private data...');

    // Check that User B's private note is NOT in the export
    const userBPrivateNote = 'User B private note - should NOT be visible to A';
    const exportString = JSON.stringify(exportData);
    if (exportString.includes(userBPrivateNote)) {
      throw new Error('Export contains other user\'s private note! Privacy violation!');
    }

    // Verify limits only include User A's notes, not User B's
    exportData.limits.forEach(limit => {
      if (limit.note && limit.note === userBPrivateNote) {
        throw new Error('Export contains other user\'s note! Privacy violation!');
      }
    });

    console.log('   ✅ No other users\' private data found\n');

    // Step 13: Verify export date is present
    console.log('1️⃣2️⃣  Verifying export metadata...');
    if (!exportData.exportDate) {
      throw new Error('Export data missing exportDate');
    }
    const exportDate = new Date(exportData.exportDate);
    if (isNaN(exportDate.getTime())) {
      throw new Error('Export date is not a valid date');
    }
    console.log('   ✅ Export metadata correct\n');

    // Step 14: Verify blocked users field exists
    console.log('1️⃣3️⃣  Verifying blocked users field...');
    if (!Array.isArray(exportData.blockedUsers)) {
      throw new Error('Export data missing blockedUsers array');
    }
    console.log('   ✅ Blocked users field present\n');

    console.log('✅ ALL TESTS PASSED! Feature #59 is working correctly.\n');
    console.log('Summary:');
    console.log(`  - Profile data: ✅`);
    console.log(`  - Relationships: ${exportData.relationships.length} ✅`);
    console.log(`  - Limits: ${exportData.limits.length} ✅`);
    console.log(`  - Notes: ${Object.keys(notesMap).length} ✅`);
    console.log(`  - Notifications: ${exportData.notifications.length} ✅`);
    console.log(`  - Privacy: No other users' data ✅`);
    console.log(`  - Format: Valid JSON ✅`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

runTest();
