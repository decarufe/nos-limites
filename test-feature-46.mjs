#!/usr/bin/env node

/**
 * Test Feature #46: Deleting account removes all user's limits, relationships, and notifications
 *
 * This test verifies that DELETE /api/profile properly cascades deletion to all related data.
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
  console.log('\n🧪 Testing Feature #46: Account deletion cascades to all related data\n');

  try {
    // Create 3 users: A (will be deleted), B (A's partner), C (unrelated)
    const emailA = `test-${randomBytes(8).toString('hex')}@example.com`;
    const emailB = `test-${randomBytes(8).toString('hex')}@example.com`;
    const emailC = `test-${randomBytes(8).toString('hex')}@example.com`;

    console.log('1️⃣  Creating 3 users...');
    const userA = await createUser(emailA);
    const userB = await createUser(emailB);
    const userC = await createUser(emailC);
    console.log(`   ✅ User A: ${userA.userId} (${userA.email})`);
    console.log(`   ✅ User B: ${userB.userId} (${userB.email})`);
    console.log(`   ✅ User C: ${userC.userId} (${userC.email})`);

    // Create relationships: A-B and B-C
    console.log('\n2️⃣  Creating relationships...');
    const relationshipAB = await createRelationship(userA.token, userB.token);
    const relationshipBC = await createRelationship(userB.token, userC.token);
    console.log(`   ✅ Relationship A-B: ${relationshipAB}`);
    console.log(`   ✅ Relationship B-C: ${relationshipBC}`);

    // Get some limit IDs from database
    const db = new Database(DB_PATH);
    const limitIds = db.prepare('SELECT id FROM limits LIMIT 5').all().map(r => r.id);
    db.close();

    // Both users check limits in A-B relationship
    console.log('\n3️⃣  Checking limits for A-B relationship...');
    await checkLimits(userA.token, relationshipAB, limitIds.slice(0, 3));
    await checkLimits(userB.token, relationshipAB, limitIds.slice(0, 3));
    console.log(`   ✅ User A checked ${limitIds.slice(0, 3).length} limits`);
    console.log(`   ✅ User B checked ${limitIds.slice(0, 3).length} limits`);

    // Check limits in B-C relationship (to ensure they're not affected)
    console.log('\n4️⃣  Checking limits for B-C relationship...');
    await checkLimits(userB.token, relationshipBC, limitIds.slice(0, 2));
    await checkLimits(userC.token, relationshipBC, limitIds.slice(0, 2));
    console.log(`   ✅ User B checked ${limitIds.slice(0, 2).length} limits`);
    console.log(`   ✅ User C checked ${limitIds.slice(0, 2).length} limits`);

    // Record counts BEFORE deletion
    console.log('\n5️⃣  Recording data counts BEFORE deletion...');
    const dbBefore = new Database(DB_PATH);
    const beforeCounts = {
      userLimitsA: dbBefore.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ?').get(userA.userId).count,
      userLimitsB: dbBefore.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ?').get(userB.userId).count,
      userLimitsC: dbBefore.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ?').get(userC.userId).count,
      relationshipsA: dbBefore.prepare('SELECT COUNT(*) as count FROM relationships WHERE inviter_id = ? OR invitee_id = ?').get(userA.userId, userA.userId).count,
      relationshipsB: dbBefore.prepare('SELECT COUNT(*) as count FROM relationships WHERE inviter_id = ? OR invitee_id = ?').get(userB.userId, userB.userId).count,
      relationshipsC: dbBefore.prepare('SELECT COUNT(*) as count FROM relationships WHERE inviter_id = ? OR invitee_id = ?').get(userC.userId, userC.userId).count,
      notificationsA: dbBefore.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?').get(userA.userId).count,
      notificationsB: dbBefore.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?').get(userB.userId).count,
      sessionsA: dbBefore.prepare('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(userA.userId).count,
      usersTotal: dbBefore.prepare('SELECT COUNT(*) as count FROM users').get().count,
    };
    dbBefore.close();

    console.log(`   📊 User A: ${beforeCounts.userLimitsA} limits, ${beforeCounts.relationshipsA} relationships, ${beforeCounts.notificationsA} notifications, ${beforeCounts.sessionsA} sessions`);
    console.log(`   📊 User B: ${beforeCounts.userLimitsB} limits, ${beforeCounts.relationshipsB} relationships, ${beforeCounts.notificationsB} notifications`);
    console.log(`   📊 User C: ${beforeCounts.userLimitsC} limits, ${beforeCounts.relationshipsC} relationships`);
    console.log(`   📊 Total users: ${beforeCounts.usersTotal}`);

    // Delete User A's account
    console.log('\n6️⃣  Deleting User A\'s account...');
    const deleteRes = await fetch(`${API_BASE}/profile`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userA.token}`,
      },
    });

    if (!deleteRes.ok) {
      throw new Error(`Failed to delete account: ${await deleteRes.text()}`);
    }

    console.log('   ✅ Account deletion API call succeeded');

    // Verify cascading deletions
    console.log('\n7️⃣  Verifying cascading deletions...\n');
    const dbAfter = new Database(DB_PATH);

    // Check: no user_limits for User A
    const userLimitsA = dbAfter.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ?').get(userA.userId).count;
    console.log(`   ${userLimitsA === 0 ? '✅' : '❌'} user_limits for User A: ${userLimitsA} (expected 0)`);

    // Check: no relationships for User A (as inviter or invitee)
    const relationshipsA = dbAfter.prepare('SELECT COUNT(*) as count FROM relationships WHERE inviter_id = ? OR invitee_id = ?').get(userA.userId, userA.userId).count;
    console.log(`   ${relationshipsA === 0 ? '✅' : '❌'} relationships for User A: ${relationshipsA} (expected 0)`);

    // Check: no notifications for User A
    const notificationsA = dbAfter.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?').get(userA.userId).count;
    console.log(`   ${notificationsA === 0 ? '✅' : '❌'} notifications for User A: ${notificationsA} (expected 0)`);

    // Check: no sessions for User A
    const sessionsA = dbAfter.prepare('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(userA.userId).count;
    console.log(`   ${sessionsA === 0 ? '✅' : '❌'} sessions for User A: ${sessionsA} (expected 0)`);

    // Check: no magic_links for User A's email
    const magicLinksA = dbAfter.prepare('SELECT COUNT(*) as count FROM magic_links WHERE email = ?').get(userA.email).count;
    console.log(`   ${magicLinksA === 0 ? '✅' : '❌'} magic_links for User A: ${magicLinksA} (expected 0)`);

    // Check: User A no longer exists
    const userA_exists = dbAfter.prepare('SELECT COUNT(*) as count FROM users WHERE id = ?').get(userA.userId).count;
    console.log(`   ${userA_exists === 0 ? '✅' : '❌'} User A in users table: ${userA_exists} (expected 0)`);

    // Check: User B's limits in B-C relationship are NOT affected
    const userLimitsB = dbAfter.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ? AND relationship_id = ?').get(userB.userId, relationshipBC).count;
    console.log(`   ${userLimitsB === beforeCounts.userLimitsB / 2 ? '✅' : '❌'} User B limits in B-C relationship: ${userLimitsB} (expected ${beforeCounts.userLimitsB / 2})`);

    // Check: User C's limits in B-C relationship are NOT affected
    const userLimitsC = dbAfter.prepare('SELECT COUNT(*) as count FROM user_limits WHERE user_id = ? AND relationship_id = ?').get(userC.userId, relationshipBC).count;
    console.log(`   ${userLimitsC === beforeCounts.userLimitsC ? '✅' : '❌'} User C limits in B-C relationship: ${userLimitsC} (expected ${beforeCounts.userLimitsC})`);

    // Check: B-C relationship still exists
    const relationshipBC_exists = dbAfter.prepare('SELECT COUNT(*) as count FROM relationships WHERE id = ?').get(relationshipBC).count;
    console.log(`   ${relationshipBC_exists === 1 ? '✅' : '❌'} B-C relationship still exists: ${relationshipBC_exists} (expected 1)`);

    // Check: Total users decreased by 1
    const usersTotal = dbAfter.prepare('SELECT COUNT(*) as count FROM users').get().count;
    console.log(`   ${usersTotal === beforeCounts.usersTotal - 1 ? '✅' : '❌'} Total users: ${usersTotal} (expected ${beforeCounts.usersTotal - 1})`);

    dbAfter.close();

    // Verify User A can no longer authenticate
    console.log('\n8️⃣  Verifying User A cannot authenticate...');
    const sessionRes = await fetch(`${API_BASE}/auth/session`, {
      headers: {
        'Authorization': `Bearer ${userA.token}`,
      },
    });

    console.log(`   ${sessionRes.status === 401 ? '✅' : '❌'} Session endpoint returns 401: ${sessionRes.status} (expected 401)`);

    // Summary
    console.log('\n✨ Feature #46 Test Complete!\n');

    const allPassed = (
      userLimitsA === 0 &&
      relationshipsA === 0 &&
      notificationsA === 0 &&
      sessionsA === 0 &&
      magicLinksA === 0 &&
      userA_exists === 0 &&
      userLimitsB === beforeCounts.userLimitsB / 2 &&
      userLimitsC === beforeCounts.userLimitsC &&
      relationshipBC_exists === 1 &&
      usersTotal === beforeCounts.usersTotal - 1 &&
      sessionRes.status === 401
    );

    if (allPassed) {
      console.log('🎉 All assertions passed! Account deletion cascades correctly.\n');
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
