#!/usr/bin/env node

/**
 * Comprehensive Test for Feature #59: RGPD Data Export
 * This test creates real data and verifies the export contains everything.
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = 'http://localhost:3001/api';
const DB_PATH = join(__dirname, 'server', 'database.db');

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

async function testDataExport() {
  console.log('🧪 Testing Feature #59: RGPD Data Export (Comprehensive)\n');

  const db = new Database(DB_PATH);

  try {
    // Create two test users directly in DB
    const userAId = `test_user_a_${Date.now()}`;
    const userBId = `test_user_b_${Date.now()}`;
    const userAEmail = `export_test_a_${Date.now()}@example.com`;
    const userBEmail = `export_test_b_${Date.now()}@example.com`;

    console.log('Step 1: Creating test users in database...');
    db.prepare(`
      INSERT INTO users (id, email, display_name, auth_provider, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userAId, userAEmail, 'User A Export Test', 'magic_link', new Date().toISOString(), new Date().toISOString());

    db.prepare(`
      INSERT INTO users (id, email, display_name, auth_provider, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userBId, userBEmail, 'User B Export Test', 'magic_link', new Date().toISOString(), new Date().toISOString());

    console.log('✓ Created test users');

    // Create a session for User A
    const sessionTokenA = `test_session_${Date.now()}_${Math.random()}`;
    const sessionId = `session_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, userAId, sessionTokenA, expiresAt, new Date().toISOString());

    console.log('✓ Created session for User A');

    // Create a relationship between users
    const relationshipId = `rel_${Date.now()}`;
    db.prepare(`
      INSERT INTO relationships (id, inviter_id, invitee_id, invitation_token, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      relationshipId,
      userAId,
      userBId,
      `token_${Date.now()}`,
      'accepted',
      new Date().toISOString(),
      new Date().toISOString()
    );

    console.log('✓ Created relationship');

    // Get a limit ID from the database
    const limit = db.prepare('SELECT id FROM limits LIMIT 1').get();
    if (!limit) {
      console.error('❌ No limits found in database. Run seed first.');
      process.exit(1);
    }

    // Create user limits with notes
    const userLimitId = `ul_${Date.now()}`;
    db.prepare(`
      INSERT INTO user_limits (id, user_id, relationship_id, limit_id, is_accepted, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userLimitId,
      userAId,
      relationshipId,
      limit.id,
      1,
      'This is my personal note',
      new Date().toISOString(),
      new Date().toISOString()
    );

    console.log('✓ Created user limit with note');

    // Create a notification
    const notificationId = `notif_${Date.now()}`;
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, related_user_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      notificationId,
      userAId,
      'relation_accepted',
      'Invitation acceptée',
      'User B a accepté votre invitation.',
      userBId,
      0,
      new Date().toISOString()
    );

    console.log('✓ Created notification');

    // Block a user
    const blockedId = `blocked_${Date.now()}`;
    const blockedUserId = `blocked_user_${Date.now()}`;

    // Create the blocked user first
    db.prepare(`
      INSERT INTO users (id, email, display_name, auth_provider, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(blockedUserId, `blocked_${Date.now()}@example.com`, 'Blocked User', 'magic_link', new Date().toISOString(), new Date().toISOString());

    db.prepare(`
      INSERT INTO blocked_users (id, blocker_id, blocked_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(blockedId, userAId, blockedUserId, new Date().toISOString());

    console.log('✓ Created blocked user entry');

    // Step 2: Call the export endpoint
    console.log('\nStep 2: Calling GET /api/profile/export...');
    const { response, data } = await apiRequest('/profile/export', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionTokenA}`,
      },
    });

    if (response.status !== 200) {
      console.error(`❌ Export failed with status ${response.status}`);
      console.error('Response:', data);
      process.exit(1);
    }

    console.log('✓ Export endpoint returned 200 OK');

    // Step 3: Verify response structure
    console.log('\nStep 3: Verifying export data structure...');

    // Check export date
    if (!data.exportDate) {
      console.error('❌ Missing exportDate field');
      process.exit(1);
    }
    console.log('✓ Export date present:', data.exportDate);

    // Check profile
    if (!data.profile) {
      console.error('❌ Missing profile field');
      process.exit(1);
    }
    if (data.profile.id !== userAId) {
      console.error('❌ Profile ID mismatch');
      process.exit(1);
    }
    if (data.profile.email !== userAEmail) {
      console.error('❌ Profile email mismatch');
      process.exit(1);
    }
    console.log('✓ Profile data correct:', data.profile.displayName);

    // Check relationships
    if (!Array.isArray(data.relationships)) {
      console.error('❌ Relationships not an array');
      process.exit(1);
    }
    if (data.relationships.length === 0) {
      console.error('❌ No relationships in export');
      process.exit(1);
    }
    const rel = data.relationships[0];
    if (rel.otherUser.id !== userBId) {
      console.error('❌ Relationship partner ID mismatch');
      process.exit(1);
    }
    console.log('✓ Relationships data correct:', data.relationships.length, 'relationships');

    // Check limits
    if (!Array.isArray(data.limits)) {
      console.error('❌ Limits not an array');
      process.exit(1);
    }
    if (data.limits.length === 0) {
      console.error('❌ No limits in export');
      process.exit(1);
    }
    const userLimit = data.limits[0];
    if (!userLimit.limitName) {
      console.error('❌ Limit name missing');
      process.exit(1);
    }
    if (userLimit.note !== 'This is my personal note') {
      console.error('❌ Note not preserved in export');
      process.exit(1);
    }
    console.log('✓ Limits data correct:', data.limits.length, 'limits with notes');

    // Check notifications
    if (!Array.isArray(data.notifications)) {
      console.error('❌ Notifications not an array');
      process.exit(1);
    }
    if (data.notifications.length === 0) {
      console.error('❌ No notifications in export');
      process.exit(1);
    }
    const notif = data.notifications[0];
    if (notif.type !== 'relation_accepted') {
      console.error('❌ Notification type mismatch');
      process.exit(1);
    }
    console.log('✓ Notifications data correct:', data.notifications.length, 'notifications');

    // Check blocked users
    if (!Array.isArray(data.blockedUsers)) {
      console.error('❌ Blocked users not an array');
      process.exit(1);
    }
    if (data.blockedUsers.length === 0) {
      console.error('❌ No blocked users in export');
      process.exit(1);
    }
    console.log('✓ Blocked users data correct:', data.blockedUsers.length, 'blocked users');

    // Step 4: Verify privacy (no other user's private data)
    console.log('\nStep 4: Verifying privacy constraints...');

    // Check that we only have User A's data
    if (data.profile.id !== userAId) {
      console.error('❌ Export contains wrong user data');
      process.exit(1);
    }

    // Check that we don't have User B's private notes
    const hasUserBPrivateData = data.limits.some(l =>
      l.note && l.relationshipId === relationshipId && l.userId !== userAId
    );
    if (hasUserBPrivateData) {
      console.error('❌ Export contains other user\'s private data');
      process.exit(1);
    }

    console.log('✓ No cross-user data leaks detected');
    console.log('✓ Only User A\'s own data included');

    // Cleanup
    console.log('\nCleaning up test data...');
    db.prepare('DELETE FROM blocked_users WHERE blocker_id = ?').run(userAId);
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userAId);
    db.prepare('DELETE FROM user_limits WHERE user_id = ?').run(userAId);
    db.prepare('DELETE FROM relationships WHERE id = ?').run(relationshipId);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userAId);
    db.prepare('DELETE FROM users WHERE id IN (?, ?, ?)').run(userAId, userBId, blockedUserId);
    console.log('✓ Test data cleaned up');

    console.log('\n✅ Feature #59 PASSED - All tests successful!');
    console.log('\n📊 Export Summary:');
    console.log(`  - Profile: ${data.profile.displayName} (${data.profile.email})`);
    console.log(`  - Relationships: ${data.relationships.length}`);
    console.log(`  - Limits: ${data.limits.length} (with notes)`);
    console.log(`  - Notifications: ${data.notifications.length}`);
    console.log(`  - Blocked users: ${data.blockedUsers.length}`);
    console.log(`  - Export date: ${data.exportDate}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

testDataExport();
