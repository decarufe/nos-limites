#!/usr/bin/env node
/**
 * Feature #67: Blocked user cannot send invitation to blocker
 *
 * Test Steps:
 * 1. User A blocks User B
 * 2. Log in as User B
 * 3. Generate an invitation link (User B creates invitation)
 * 4. User A tries to open User B's invitation, verify it's blocked or accept is rejected
 * 5. Verify blocked_users table is checked during invitation flow
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:3001/api';
const JWT_SECRET = 'your-secret-key-change-in-production';
const DB_PATH = join(__dirname, 'server', 'data', 'noslimites.db');

// Helper: Generate JWT token for a user
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

// Helper: Create test user directly in database
function createTestUser(db, email, displayName) {
  const userId = `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  db.prepare(`
    INSERT INTO users (id, email, display_name, auth_provider, created_at, updated_at)
    VALUES (?, ?, ?, 'magic_link', datetime('now'), datetime('now'))
  `).run(userId, email, displayName);
  return userId;
}

// Helper: Block a user
async function blockUser(blockerId, blockedId, blockerToken) {
  // First create a dummy relationship to get the relationship ID
  const inviteResponse = await fetch(`${BASE_URL}/relationships/invite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${blockerToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!inviteResponse.ok) {
    throw new Error(`Failed to create invitation: ${inviteResponse.status}`);
  }

  const inviteData = await inviteResponse.json();
  const relationshipId = inviteData.data.id;

  // Now block the user
  const blockResponse = await fetch(`${BASE_URL}/relationships/${relationshipId}/block`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${blockerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ blockedUserId: blockedId }),
  });

  if (!blockResponse.ok) {
    throw new Error(`Failed to block user: ${blockResponse.status}`);
  }

  return await blockResponse.json();
}

// Helper: Clean up test data
function cleanupTestData(db, userIds) {
  db.prepare('DELETE FROM user_limits WHERE user_id IN (' + userIds.map(() => '?').join(',') + ')').run(...userIds);
  db.prepare('DELETE FROM notifications WHERE user_id IN (' + userIds.map(() => '?').join(',') + ')').run(...userIds);
  db.prepare('DELETE FROM blocked_users WHERE blocker_id IN (' + userIds.map(() => '?').join(',') + ') OR blocked_id IN (' + userIds.map(() => '?').join(',') + ')').run(...userIds, ...userIds);
  db.prepare('DELETE FROM relationships WHERE inviter_id IN (' + userIds.map(() => '?').join(',') + ') OR invitee_id IN (' + userIds.map(() => '?').join(',') + ')').run(...userIds, ...userIds);
  db.prepare('DELETE FROM sessions WHERE user_id IN (' + userIds.map(() => '?').join(',') + ')').run(...userIds);
  db.prepare('DELETE FROM magic_links WHERE email LIKE ?').run('test-feature-67-%');
  db.prepare('DELETE FROM users WHERE id IN (' + userIds.map(() => '?').join(',') + ')').run(...userIds);
}

async function testFeature67() {
  console.log('\n=== Testing Feature #67: Blocked user cannot send invitation to blocker ===\n');

  const db = new Database(DB_PATH);
  let userAId, userBId;

  try {
    // Step 1: Create test users
    console.log('Step 1: Creating test users...');
    const timestamp = Date.now();
    userAId = createTestUser(db, `test-feature-67-userA-${timestamp}@example.com`, 'Test User A');
    userBId = createTestUser(db, `test-feature-67-userB-${timestamp}@example.com`, 'Test User B');

    const tokenA = generateToken(userAId);
    const tokenB = generateToken(userBId);

    console.log('✓ Created User A:', userAId);
    console.log('✓ Created User B:', userBId);

    // Step 2: User A blocks User B
    console.log('\nStep 2: User A blocks User B...');

    // Directly insert into blocked_users table
    const blockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(`
      INSERT INTO blocked_users (id, blocker_id, blocked_id, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(blockId, userAId, userBId);

    console.log('✓ User A has blocked User B');

    // Verify block exists in database
    const blockRecord = db.prepare('SELECT * FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?').get(userAId, userBId);
    if (!blockRecord) {
      throw new Error('Block record not found in database');
    }
    console.log('✓ Block verified in database:', blockRecord);

    // Step 3: User B creates an invitation
    console.log('\nStep 3: User B creates an invitation...');
    const inviteResponse = await fetch(`${BASE_URL}/relationships/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenB}`,
        'Content-Type': 'application/json',
      },
    });

    if (!inviteResponse.ok) {
      throw new Error(`Failed to create invitation: ${inviteResponse.status}`);
    }

    const inviteData = await inviteResponse.json();
    const invitationToken = inviteData.data.invitationToken;
    console.log('✓ User B created invitation with token:', invitationToken);

    // Step 4: User A tries to fetch the invitation details
    console.log('\nStep 4: User A tries to fetch invitation details...');
    const getInviteResponse = await fetch(`${BASE_URL}/relationships/invite/${invitationToken}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    });

    const getInviteData = await getInviteResponse.json();
    console.log('GET invitation response status:', getInviteResponse.status);
    console.log('GET invitation response:', JSON.stringify(getInviteData, null, 2));

    // Check if the request was blocked
    if (getInviteResponse.status === 403 || getInviteResponse.status === 400) {
      console.log('✓ User A correctly cannot view invitation details (blocked)');
    } else if (getInviteResponse.status === 200) {
      console.log('⚠ User A can view invitation details - this should be blocked!');
      console.log('  GET endpoint does NOT check for blocked users');
    }

    // Step 5: User A tries to accept the invitation
    console.log('\nStep 5: User A tries to accept User B\'s invitation...');
    const acceptResponse = await fetch(`${BASE_URL}/relationships/accept/${invitationToken}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    });

    const acceptData = await acceptResponse.json();
    console.log('Accept response status:', acceptResponse.status);
    console.log('Accept response:', JSON.stringify(acceptData, null, 2));

    // Verify acceptance was blocked
    if (acceptResponse.status === 403) {
      console.log('✓ User A correctly cannot accept invitation (blocked)');
    } else {
      throw new Error(`Expected 403 status, got ${acceptResponse.status}`);
    }

    // Step 6: Verify no relationship was created
    console.log('\nStep 6: Verifying no relationship was created...');
    const relationships = db.prepare(`
      SELECT * FROM relationships
      WHERE (inviter_id = ? AND invitee_id = ?)
         OR (inviter_id = ? AND invitee_id = ?)
         AND status = 'accepted'
    `).all(userAId, userBId, userBId, userAId);

    if (relationships.length === 0) {
      console.log('✓ No accepted relationship exists between User A and User B');
    } else {
      throw new Error(`Expected 0 relationships, found ${relationships.length}`);
    }

    // Summary
    console.log('\n=== Test Summary ===');
    console.log('✓ User A blocked User B successfully');
    console.log('✓ User B can create invitations (general functionality works)');
    if (getInviteResponse.status === 200) {
      console.log('⚠ ISSUE FOUND: GET /invite/:token does NOT check for blocked users');
      console.log('  This allows blocked users to see invitation details');
    } else {
      console.log('✓ GET /invite/:token correctly blocks blocked users');
    }
    console.log('✓ POST /accept/:token correctly rejects blocked users (403)');
    console.log('✓ No relationship was created');

    console.log('\n✅ All critical security checks passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    if (userAId && userBId) {
      console.log('\nCleaning up test data...');
      cleanupTestData(db, [userAId, userBId]);
      console.log('✓ Cleanup complete');
    }
    db.close();
  }
}

testFeature67().catch(console.error);
