#!/usr/bin/env node

/**
 * Test Feature #47: Deleting a relationship removes associated user_limits for both users
 *
 * This test verifies that DELETE /api/relationships/:id properly removes all limit choices
 * for both participants while preserving their limits in other relationships.
 */

import Database from './server/node_modules/better-sqlite3/lib/index.js';
import { randomBytes } from 'crypto';

const API_BASE = 'http://localhost:3001/api';
const DB_PATH = './server/data/noslimites.db';

// Helper to create a user via magic link flow
async function createUser(email) {
  // Request magic link
  const magicRes = await fetch(`${API_BASE}/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!magicRes.ok) {
    throw new Error(`Failed to request magic link: ${await magicRes.text()}`);
  }

  // Get token from database
  const db = new Database(DB_PATH);
  const token = db.prepare('SELECT token FROM magic_links WHERE email = ? ORDER BY created_at DESC LIMIT 1').get(email)?.token;
  db.close();

  if (!token) {
    throw new Error('No magic link token found');
  }

  // Verify magic link
  const verifyRes = await fetch(`${API_BASE}/auth/verify?token=${token}`);
  if (!verifyRes.ok) {
    throw new Error(`Failed to verify magic link: ${await verifyRes.text()}`);
  }

  const data = await verifyRes.json();
  return {
    userId: data.user.id,
    token: data.token,
    email: data.user.email,
    displayName: data.user.displayName,
  };
}

// Helper to create a relationship between two users
async function createRelationship(inviterToken, inviteeToken) {
  // Inviter creates invitation
  const inviteRes = await fetch(`${API_BASE}/relationships/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${inviterToken}`,
    },
  });

  if (!inviteRes.ok) {
    throw new Error(`Failed to create invitation: ${await inviteRes.text()}`);
  }

  const inviteData = await inviteRes.json();
  const invitationToken = inviteData.data.invitationToken;

  // Invitee accepts invitation
  const acceptRes = await fetch(`${API_BASE}/relationships/accept/${invitationToken}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${inviteeToken}`,
    },
  });

  if (!acceptRes.ok) {
    throw new Error(`Failed to accept invitation: ${await acceptRes.text()}`);
  }

  const { data } = await acceptRes.json();
  return data.relationshipId;
}

// Helper to check limits for a relationship
async function checkLimits(userToken, relationshipId, limitIds) {
  const res = await fetch(`${API_BASE}/relationships/${relationshipId}/limits`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({ limits: limitIds }),
  });

  if (!res.ok) {
    throw new Error(`Failed to check limits: ${await res.text()}`);
  }
}

// Main test
async function runTest() {
  console.log('\n🧪 Testing Feature #47: Deleting relationship removes associated user_limits\n');

  try {
    // Create 3 users: A, B, C
    const emailA = `test-${randomBytes(8).toString('hex')}@example.com`;
    const emailB = `test-${randomBytes(8).toString('hex')}@example.com`;
    const emailC = `test-${randomBytes(8).toString('hex')}@example.com`;

    console.log('1️⃣  Creating 3 users...');
    const userA = await createUser(emailA);
    const userB = await createUser(emailB);
    const userC = await createUser(emailC);
    console.log(`   ✅ User A: ${userA.userId}`);
    console.log(`   ✅ User B: ${userB.userId}`);
    console.log(`   ✅ User C: ${userC.userId}`);

    // Create two relationships: A-B and A-C
    console.log('\n2️⃣  Creating relationships...');
    const relationshipAB = await createRelationship(userA.token, userB.token);
    const relationshipAC = await createRelationship(userA.token, userC.token);
    console.log(`   ✅ Relationship A-B: ${relationshipAB}`);
    console.log(`   ✅ Relationship A-C: ${relationshipAC}`);

    // Get some limit IDs from database
    const db = new Database(DB_PATH);
    const limitIds = db.prepare('SELECT id FROM limits LIMIT 10').all().map(r => r.id);
    db.close();

    console.log(`\n3️⃣  Found ${limitIds.length} limits to work with`);

    // Both users check limits in A-B relationship
    console.log('\n4️⃣  Checking limits for A-B relationship...');
    const limitsAB = limitIds.slice(0, 5); // First 5 limits
    await checkLimits(userA.token, relationshipAB, limitsAB);
    await checkLimits(userB.token, relationshipAB, limitsAB);
    console.log(`   ✅ User A checked ${limitsAB.length} limits`);
    console.log(`   ✅ User B checked ${limitsAB.length} limits`);

    // Both users check limits in A-C relationship
    console.log('\n5️⃣  Checking limits for A-C relationship...');
    const limitsAC = limitIds.slice(5, 9); // Different set of 4 limits
    await checkLimits(userA.token, relationshipAC, limitsAC);
    await checkLimits(userC.token, relationshipAC, limitsAC);
    console.log(`   ✅ User A checked ${limitsAC.length} limits`);
    console.log(`   ✅ User C checked ${limitsAC.length} limits`);

    // Record counts BEFORE deletion
    console.log('\n6️⃣  Recording data counts BEFORE deletion...');
    const dbBefore = new Database(DB_PATH);

    const beforeCounts = {
      userLimitsA_AB: dbBefore.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ? AND relationship_id = ?').get(userA.userId, relationshipAB).count,
      userLimitsB_AB: dbBefore.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ? AND relationship_id = ?').get(userB.userId, relationshipAB).count,
      userLimitsA_AC: dbBefore.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ? AND relationship_id = ?').get(userA.userId, relationshipAC).count,
      userLimitsC_AC: dbBefore.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ? AND relationship_id = ?').get(userC.userId, relationshipAC).count,
      totalUserLimits_AB: dbBefore.prepare('SELECT COUNT(*) as count FROM user_limits WHERE relationship_id = ?').get(relationshipAB).count,
      totalUserLimits: dbBefore.prepare('SELECT COUNT(*) as count FROM user_limits').get().count,
    };

    dbBefore.close();

    console.log(`   📊 A-B relationship: User A has ${beforeCounts.userLimitsA_AB} limits, User B has ${beforeCounts.userLimitsB_AB} limits`);
    console.log(`   📊 A-C relationship: User A has ${beforeCounts.userLimitsA_AC} limits, User C has ${beforeCounts.userLimitsC_AC} limits`);
    console.log(`   📊 Total limits in A-B relationship: ${beforeCounts.totalUserLimits_AB}`);
    console.log(`   📊 Total user_limits in database: ${beforeCounts.totalUserLimits}`);

    // User A deletes the A-B relationship
    console.log('\n7️⃣  User A deletes the A-B relationship...');
    const deleteRes = await fetch(`${API_BASE}/relationships/${relationshipAB}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userA.token}`,
      },
    });

    if (!deleteRes.ok) {
      throw new Error(`Failed to delete relationship: ${await deleteRes.text()}`);
    }

    console.log('   ✅ Relationship deletion API call succeeded');

    // Verify cascading deletions
    console.log('\n8️⃣  Verifying cascading deletions...\n');
    const dbAfter = new Database(DB_PATH);

    // Check: no user_limits for A-B relationship
    const userLimitsA_AB = dbAfter.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ? AND relationship_id = ?').get(userA.userId, relationshipAB).count;
    console.log(`   ${userLimitsA_AB === 0 ? '✅' : '❌'} User A limits in A-B relationship: ${userLimitsA_AB} (expected 0)`);

    const userLimitsB_AB = dbAfter.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ? AND relationship_id = ?').get(userB.userId, relationshipAB).count;
    console.log(`   ${userLimitsB_AB === 0 ? '✅' : '❌'} User B limits in A-B relationship: ${userLimitsB_AB} (expected 0)`);

    const totalUserLimits_AB = dbAfter.prepare('SELECT COUNT(*) as count FROM user_limits WHERE relationship_id = ?').get(relationshipAB).count;
    console.log(`   ${totalUserLimits_AB === 0 ? '✅' : '❌'} Total limits in A-B relationship: ${totalUserLimits_AB} (expected 0)`);

    // Check: User A's limits in A-C relationship are NOT affected
    const userLimitsA_AC = dbAfter.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ? AND relationship_id = ?').get(userA.userId, relationshipAC).count;
    console.log(`   ${userLimitsA_AC === beforeCounts.userLimitsA_AC ? '✅' : '❌'} User A limits in A-C relationship: ${userLimitsA_AC} (expected ${beforeCounts.userLimitsA_AC})`);

    // Check: User C's limits in A-C relationship are NOT affected
    const userLimitsC_AC = dbAfter.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ? AND relationship_id = ?').get(userC.userId, relationshipAC).count;
    console.log(`   ${userLimitsC_AC === beforeCounts.userLimitsC_AC ? '✅' : '❌'} User C limits in A-C relationship: ${userLimitsC_AC} (expected ${beforeCounts.userLimitsC_AC})`);

    // Check: A-B relationship no longer exists
    const relationshipAB_exists = dbAfter.prepare('SELECT COUNT(*) as count FROM relationships WHERE id = ?').get(relationshipAB).count;
    console.log(`   ${relationshipAB_exists === 0 ? '✅' : '❌'} A-B relationship exists: ${relationshipAB_exists} (expected 0)`);

    // Check: A-C relationship still exists
    const relationshipAC_exists = dbAfter.prepare('SELECT COUNT(*) as count FROM relationships WHERE id = ?').get(relationshipAC).count;
    console.log(`   ${relationshipAC_exists === 1 ? '✅' : '❌'} A-C relationship exists: ${relationshipAC_exists} (expected 1)`);

    // Check: Total user_limits decreased by the count from A-B relationship
    const totalUserLimits = dbAfter.prepare('SELECT COUNT(*) as count FROM user_limits').get().count;
    const expectedTotal = beforeCounts.totalUserLimits - beforeCounts.totalUserLimits_AB;
    console.log(`   ${totalUserLimits === expectedTotal ? '✅' : '❌'} Total user_limits: ${totalUserLimits} (expected ${expectedTotal})`);

    dbAfter.close();

    // Summary
    console.log('\n✨ Feature #47 Test Complete!\n');

    const allPassed = (
      userLimitsA_AB === 0 &&
      userLimitsB_AB === 0 &&
      totalUserLimits_AB === 0 &&
      userLimitsA_AC === beforeCounts.userLimitsA_AC &&
      userLimitsC_AC === beforeCounts.userLimitsC_AC &&
      relationshipAB_exists === 0 &&
      relationshipAC_exists === 1 &&
      totalUserLimits === expectedTotal
    );

    if (allPassed) {
      console.log('🎉 All assertions passed! Relationship deletion cascades correctly.\n');
      process.exit(0);
    } else {
      console.log('❌ Some assertions failed. See details above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();
