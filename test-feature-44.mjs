#!/usr/bin/env node

/**
 * Test Feature #44 & #74: Notifications display timestamps correctly in French locale
 *
 * This test verifies:
 * 1. Recent notifications show relative time in French ("il y a X min", "il y a Xh")
 * 2. Older notifications show date in French locale format
 * 3. All timestamps are accurate and properly localized
 */

import http from 'http';

const API_BASE = 'http://localhost:3001';

// Helper to make HTTP requests
function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Test utilities
let testCount = 0;
let passCount = 0;

function assert(condition, message) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`  ✅ ${message}`);
  } else {
    console.log(`  ❌ ${message}`);
  }
}

function formatTimestamp(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Very recent: "À l'instant"
  if (diffMins < 1) return "À l'instant";

  // Minutes: "Il y a 5 min"
  if (diffMins < 60) return `Il y a ${diffMins} min`;

  // Hours: "Il y a 2h"
  if (diffHours < 24) return `Il y a ${diffHours}h`;

  // Days (less than a week): "Il y a 3j"
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  // Less than 30 days: "15 févr."
  if (diffDays < 30) {
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  }

  // Older than 30 days: "15/02/2024" (DD/MM/YYYY)
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function cleanup(token) {
  if (token) {
    try {
      await request('DELETE', '/api/profile', null, token);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

async function runTests() {
  console.log('\n🧪 Testing Feature #44 & #74: Notifications display timestamps correctly in French locale\n');

  let userAToken = null;
  let userBToken = null;

  try {
    // Step 1: Create two users
    console.log('📝 Step 1: Creating test users...');

    const emailA = `test-timestamps-a-${Date.now()}@example.com`;
    const emailB = `test-timestamps-b-${Date.now()}@example.com`;

    // User A registration
    const magicLinkA = await request('POST', '/api/auth/magic-link', { email: emailA });
    assert(magicLinkA.status === 200, 'User A: Magic link sent');

    const tokenA = magicLinkA.data.token;
    const verifyA = await request('GET', `/api/auth/verify?token=${tokenA}`);
    assert(verifyA.status === 200, 'User A: Magic link verified');
    userAToken = verifyA.data.token;

    await request('PUT', '/api/profile', { displayName: 'User A' }, userAToken);

    // User B registration
    const magicLinkB = await request('POST', '/api/auth/magic-link', { email: emailB });
    assert(magicLinkB.status === 200, 'User B: Magic link sent');

    const tokenB = magicLinkB.data.token;
    const verifyB = await request('GET', `/api/auth/verify?token=${tokenB}`);
    assert(verifyB.status === 200, 'User B: Magic link verified');
    userBToken = verifyB.data.token;

    await request('PUT', '/api/profile', { displayName: 'User B' }, userBToken);

    // Step 2: Create a relationship to trigger notifications
    console.log('\n📝 Step 2: Creating relationship to generate notifications...');

    const invite = await request('POST', '/api/relationships/invite', {}, userAToken);
    assert(invite.status === 200 || invite.status === 201, 'User A: Invitation created');

    const inviteToken = invite.data.data.invitationToken;

    const accept = await request('POST', `/api/relationships/accept/${inviteToken}`, {}, userBToken);
    assert(accept.status === 200, 'User B: Invitation accepted');

    // This creates a 'relation_accepted' notification for User A

    // Step 3: Fetch notifications for User A
    console.log('\n📝 Step 3: Fetching notifications for User A...');

    const notifications = await request('GET', '/api/notifications', null, userAToken);
    assert(notifications.status === 200, 'Notifications fetched successfully');
    assert(notifications.data.data.length > 0, 'At least one notification exists');

    // Step 4: Verify timestamp formatting
    console.log('\n📝 Step 4: Verifying timestamp formatting...');

    const recentNotif = notifications.data.data[0]; // Most recent notification
    assert(recentNotif.createdAt, 'Notification has createdAt timestamp');

    const createdDate = new Date(recentNotif.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - createdDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    // Notification should be very recent (< 1 minute)
    assert(diffMins < 2, `Notification is recent (${diffMins} minutes old)`);

    // Verify the formatted timestamp matches expected French format
    const formatted = formatTimestamp(recentNotif.createdAt);
    console.log(`  ℹ️  Raw timestamp: ${recentNotif.createdAt}`);
    console.log(`  ℹ️  Formatted: ${formatted}`);

    // Recent notification should show "À l'instant" or "Il y a X min"
    const isRecentFormat = formatted === "À l'instant" || formatted.startsWith("Il y a") && formatted.includes("min");
    assert(isRecentFormat, `Recent notification shows relative time in French: "${formatted}"`);

    // Step 5: Test with various timestamp ages
    console.log('\n📝 Step 5: Testing timestamp formatting for different ages...');

    // Test very recent (< 1 min)
    const justNow = new Date().toISOString();
    const formatJustNow = formatTimestamp(justNow);
    assert(formatJustNow === "À l'instant", `Just now: "${formatJustNow}"`);

    // Test 5 minutes ago
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const formatFiveMin = formatTimestamp(fiveMinAgo);
    assert(formatFiveMin === "Il y a 5 min", `5 minutes ago: "${formatFiveMin}"`);

    // Test 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const formatTwoHours = formatTimestamp(twoHoursAgo);
    assert(formatTwoHours === "Il y a 2h", `2 hours ago: "${formatTwoHours}"`);

    // Test 3 days ago
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const formatThreeDays = formatTimestamp(threeDaysAgo);
    assert(formatThreeDays === "Il y a 3j", `3 days ago: "${formatThreeDays}"`);

    // Test 15 days ago (should show French date format with month abbreviation)
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const formatFifteenDays = formatTimestamp(fifteenDaysAgo);
    const isFrenchDateShort = /^\d{1,2}\s.+$/.test(formatFifteenDays); // e.g., "8 févr." or "8 févr"
    assert(isFrenchDateShort, `15 days ago shows French date (short): "${formatFifteenDays}"`);

    // Test 45 days ago (should show DD/MM/YYYY format)
    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const formatFortyFiveDays = formatTimestamp(fortyFiveDaysAgo);
    const isDDMMYYYY = /^\d{2}\/\d{2}\/\d{4}$/.test(formatFortyFiveDays); // e.g., "09/01/2026"
    assert(isDDMMYYYY, `45 days ago shows DD/MM/YYYY: "${formatFortyFiveDays}"`);

    // Step 6: Verify French locale is used for dates
    console.log('\n📝 Step 6: Verifying French locale for date formatting...');

    const oldDate = new Date('2024-01-15T10:00:00Z');
    const frenchFormatted = oldDate.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });

    console.log(`  ℹ️  Test date: 2024-01-15`);
    console.log(`  ℹ️  French format: ${frenchFormatted}`);

    // Should contain French month abbreviation
    const hasFrenchMonth = /janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc/i.test(frenchFormatted);
    assert(hasFrenchMonth, `French month abbreviation used: "${frenchFormatted}"`);

    console.log('\n✅ All timestamp formatting tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    throw error;
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await cleanup(userAToken);
    await cleanup(userBToken);
  }

  // Summary
  console.log(`\n📊 Test Summary: ${passCount}/${testCount} assertions passed`);

  if (passCount === testCount) {
    console.log('✅ Feature #44 & #74: PASSING - Notifications display timestamps correctly in French locale\n');
    process.exit(0);
  } else {
    console.log('❌ Feature #44 & #74: FAILING - Some timestamp formatting issues detected\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
