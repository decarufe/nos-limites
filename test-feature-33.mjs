#!/usr/bin/env node

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API = 'http://localhost:3001/api';

async function testFeature33() {
  console.log('Testing Feature #33: Mark all notifications as read');
  console.log('====================================================');

  try {
    // 1. Create test user
    console.log('1. Creating test user...');
    const email = `notif_test_${Date.now()}@test.com`;
    const magicLinkRes = await fetch(`${API}/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const magicLinkData = await magicLinkRes.json();
    const token = magicLinkData.token;

    if (!token) {
      throw new Error('Failed to get magic link token');
    }

    // 2. Verify magic link
    console.log('2. Verifying magic link...');
    const verifyRes = await fetch(`${API}/auth/verify?token=${token}`);
    const verifyData = await verifyRes.json();
    const jwt = verifyData.token;
    const userId = verifyData.userId;

    if (!jwt) {
      throw new Error('Failed to get JWT token');
    }

    // 3. Set up profile
    console.log('3. Setting up profile...');
    await fetch(`${API}/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ displayName: 'Test Notif User' }),
    });

    // 4. Create test notifications directly in DB
    console.log('4. Creating 5 test notifications...');
    const db = new Database(join(__dirname, 'server/data/noslimites.db'));

    const timestamp = Date.now();
    const notifications = [
      { id: `notif-1-${timestamp}`, type: 'relation_request', title: 'Nouvelle demande', message: 'User 1 vous a envoyé une invitation' },
      { id: `notif-2-${timestamp}`, type: 'relation_accepted', title: 'Invitation acceptée', message: 'User 2 a accepté votre invitation' },
      { id: `notif-3-${timestamp}`, type: 'new_common_limit', title: 'Nouvelle limite commune', message: 'Une nouvelle limite commune a été découverte' },
      { id: `notif-4-${timestamp}`, type: 'limit_removed', title: 'Limite retirée', message: 'Une limite commune a été retirée' },
      { id: `notif-5-${timestamp}`, type: 'relation_deleted', title: 'Relation supprimée', message: 'Une relation a été supprimée' },
    ];

    const insertStmt = db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
    `);

    for (const notif of notifications) {
      insertStmt.run(notif.id, userId, notif.type, notif.title, notif.message);
    }
    db.close();

    // 5. Fetch notifications
    console.log('5. Fetching notifications...');
    const notifsRes = await fetch(`${API}/notifications`, {
      headers: { 'Authorization': `Bearer ${jwt}` },
    });
    const notifsData = await notifsRes.json();

    console.log(`   Found ${notifsData.count} notifications`);

    if (notifsData.count !== 5) {
      throw new Error(`Expected 5 notifications, got ${notifsData.count}`);
    }

    const unreadCount = notifsData.data.filter(n => !n.isRead).length;
    console.log(`   Unread count: ${unreadCount}`);

    if (unreadCount !== 5) {
      throw new Error(`Expected 5 unread notifications, got ${unreadCount}`);
    }

    // 6. Mark all as read
    console.log('6. Marking all notifications as read...');
    const markAllRes = await fetch(`${API}/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${jwt}` },
    });
    const markAllData = await markAllRes.json();

    if (!markAllData.success) {
      throw new Error('Failed to mark all as read');
    }

    // 7. Verify all are read
    console.log('7. Verifying all notifications are now read...');
    const notifsAfterRes = await fetch(`${API}/notifications`, {
      headers: { 'Authorization': `Bearer ${jwt}` },
    });
    const notifsAfterData = await notifsAfterRes.json();

    const unreadAfter = notifsAfterData.data.filter(n => !n.isRead).length;
    console.log(`   Unread count after: ${unreadAfter}`);

    if (unreadAfter !== 0) {
      throw new Error(`Expected 0 unread notifications, got ${unreadAfter}`);
    }

    // 8. Cleanup
    console.log('8. Cleanup: Deleting test user...');
    await fetch(`${API}/profile`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${jwt}` },
    });

    console.log('');
    console.log('✅ Feature #33 test passed!');
    console.log('   - Created 5 unread notifications');
    console.log('   - Marked all as read via PUT /api/notifications/read-all');
    console.log('   - Verified all notifications are now read (isRead: true)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testFeature33();
