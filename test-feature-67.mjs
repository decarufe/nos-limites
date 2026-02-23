#!/usr/bin/env node
/**
 * Feature #67: Blocked user cannot send invitation to blocker
 *
 * Test Steps:
 * 1. Create User A and User B
 * 2. Create and accept a relationship between them
 * 3. User A blocks User B (using the relationship)
 * 4. User B creates a NEW invitation
 * 5. User A tries to view the invitation - should be blocked
 * 6. User A tries to accept the invitation - should be rejected with 403
 */

const BASE_URL = 'http://localhost:3001/api';

// Helper: Create user via magic link and complete profile setup
async function createUserAndLogin(email, displayName) {
  // Step 1: Request magic link
  const magicResponse = await fetch(`${BASE_URL}/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!magicResponse.ok) {
    throw new Error(`Failed to request magic link: ${magicResponse.status}`);
  }

  const magicData = await magicResponse.json();

  if (!magicData.token) {
    throw new Error('Magic link token not returned (set NODE_ENV=development)');
  }

  // Step 2: Verify magic link
  const verifyResponse = await fetch(`${BASE_URL}/auth/verify?token=${magicData.token}`, {
    method: 'GET',
  });

  if (!verifyResponse.ok) {
    throw new Error(`Failed to verify magic link: ${verifyResponse.status}`);
  }

  const verifyData = await verifyResponse.json();
  const token = verifyData.token;
  const isNewUser = verifyData.isNewUser;

  // Step 3: If new user, complete profile setup
  if (isNewUser) {
    const profileResponse = await fetch(`${BASE_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ displayName }),
    });

    if (!profileResponse.ok) {
      throw new Error(`Failed to setup profile: ${profileResponse.status}`);
    }
  }

  // Get user ID
  const sessionResponse = await fetch(`${BASE_URL}/auth/session`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!sessionResponse.ok) {
    throw new Error(`Failed to get session: ${sessionResponse.status}`);
  }

  const sessionData = await sessionResponse.json();
  const userId = sessionData.user.id;

  return { token, userId, isNewUser };
}

async function testFeature67() {
  console.log('\n=== Testing Feature #67: Blocked user cannot send invitation to blocker ===\n');

  try {
    const timestamp = Date.now();
    const emailA = `test-feature-67-userA-${timestamp}@example.com`;
    const emailB = `test-feature-67-userB-${timestamp}@example.com`;

    // Step 1: Create and login User A
    console.log('Step 1: Creating User A...');
    const userA = await createUserAndLogin(emailA, 'Test User A');
    console.log('✓ User A created:', userA.userId);

    // Step 2: Create and login User B
    console.log('\nStep 2: Creating User B...');
    const userB = await createUserAndLogin(emailB, 'Test User B');
    console.log('✓ User B created:', userB.userId);

    // Step 3: User A creates an invitation
    console.log('\nStep 3: User A creates an invitation...');
    const inviteResponse = await fetch(`${BASE_URL}/relationships/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userA.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!inviteResponse.ok) {
      throw new Error(`Failed to create invitation: ${inviteResponse.status}`);
    }

    const inviteData = await inviteResponse.json();
    const firstInvitationToken = inviteData.data.invitationToken;
    const relationshipId = inviteData.data.id;
    console.log('✓ User A created invitation:', firstInvitationToken);

    // Step 4: User B accepts the invitation
    console.log('\nStep 4: User B accepts the invitation...');
    const acceptResponse = await fetch(`${BASE_URL}/relationships/accept/${firstInvitationToken}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userB.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!acceptResponse.ok) {
      throw new Error(`Failed to accept invitation: ${acceptResponse.status}`);
    }

    console.log('✓ User B accepted the invitation');

    // Step 5: User A blocks User B
    console.log('\nStep 5: User A blocks User B...');
    const blockResponse = await fetch(`${BASE_URL}/relationships/${relationshipId}/block`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userA.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!blockResponse.ok) {
      const errorData = await blockResponse.json();
      throw new Error(`Failed to block user: ${blockResponse.status} - ${errorData.message}`);
    }

    console.log('✓ User A has blocked User B');

    // Step 6: User B creates a NEW invitation (after being blocked)
    console.log('\nStep 6: User B creates a new invitation after being blocked...');
    const newInviteResponse = await fetch(`${BASE_URL}/relationships/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userB.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!newInviteResponse.ok) {
      throw new Error(`Failed to create new invitation: ${newInviteResponse.status}`);
    }

    const newInviteData = await newInviteResponse.json();
    const newInvitationToken = newInviteData.data.invitationToken;
    console.log('✓ User B created new invitation:', newInvitationToken);

    // Step 7: User A tries to GET the new invitation details
    console.log('\nStep 7: User A tries to GET new invitation details...');
    const getInviteResponse = await fetch(`${BASE_URL}/relationships/invite/${newInvitationToken}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userA.token}`,
        'Content-Type': 'application/json',
      },
    });

    const getInviteData = await getInviteResponse.json();
    console.log('GET response status:', getInviteResponse.status);
    console.log('GET response:', JSON.stringify(getInviteData, null, 2));

    let getCheckPassed = false;
    // Check if blocked
    if (getInviteResponse.status === 403) {
      console.log('✓ PASS: GET endpoint correctly blocks blocked users');
      getCheckPassed = true;
    } else if (getInviteResponse.status === 200) {
      console.log('❌ FAIL: GET endpoint does NOT check blocked_users table');
      console.log('   Blocked users can view invitation details');
      console.log('   This is a SECURITY ISSUE that needs to be fixed');
      getCheckPassed = false;
    }

    // Step 8: User A tries to ACCEPT the new invitation
    console.log('\nStep 8: User A tries to ACCEPT User B\'s new invitation...');
    const acceptNewResponse = await fetch(`${BASE_URL}/relationships/accept/${newInvitationToken}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userA.token}`,
        'Content-Type': 'application/json',
      },
    });

    const acceptNewData = await acceptNewResponse.json();
    console.log('Accept response status:', acceptNewResponse.status);
    console.log('Accept response:', JSON.stringify(acceptNewData, null, 2));

    // Verify acceptance was blocked
    if (acceptNewResponse.status === 403) {
      console.log('✓ PASS: POST /accept correctly rejects blocked users (403)');
    } else {
      console.log('❌ FAIL: Expected 403, got', acceptNewResponse.status);
      throw new Error(`Accept should return 403 for blocked users, got ${acceptNewResponse.status}`);
    }

    // Step 9: Verify no new accepted relationship exists
    console.log('\nStep 9: Verifying no new relationship was accepted...');
    const relationshipsResponse = await fetch(`${BASE_URL}/relationships`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userA.token}`,
      },
    });

    const relationshipsData = await relationshipsResponse.json();
    const acceptedRelationships = relationshipsData.data || [];

    console.log('Number of accepted relationships for User A:', acceptedRelationships.length);

    if (acceptedRelationships.length === 0) {
      console.log('✓ PASS: No accepted relationship exists (original was deleted when blocking)');
    } else {
      console.log('❌ FAIL: Found', acceptedRelationships.length, 'accepted relationships');
      console.log('Relationships:', JSON.stringify(acceptedRelationships, null, 2));
      throw new Error('Blocked users should not have accepted relationships');
    }

    // Summary
    console.log('\n=== Test Summary ===');
    console.log('✓ User A successfully blocked User B');
    console.log('✓ User B can create invitations after being blocked (general functionality works)');

    if (!getCheckPassed) {
      console.log('❌ GET /invite/:token does NOT check blocked_users (NEEDS FIX)');
    } else {
      console.log('✓ GET /invite/:token correctly checks blocked_users');
    }

    console.log('✓ POST /accept/:token correctly rejects blocked users (403)');
    console.log('✓ No accepted relationship was created');

    if (!getCheckPassed) {
      console.log('\n⚠️  IMPLEMENTATION NEEDED:');
      console.log('   Add blocked_users check to GET /api/relationships/invite/:token');
      console.log('   to prevent blocked users from viewing invitation details.');
      process.exit(1); // Exit with error to indicate fix is needed
    } else {
      console.log('\n✅ Feature #67 is FULLY IMPLEMENTED!');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFeature67().catch(console.error);
