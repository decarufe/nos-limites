/**
 * Test for Feature #54: Notification for new relationship request acceptance
 * When User B accepts an invitation from User A, User A receives a notification
 */

const Database = require("./server/node_modules/better-sqlite3");
const path = require("path");
const { v4: uuidv4 } = require("./server/node_modules/uuid");
const jwt = require("./server/node_modules/jsonwebtoken");

const dbPath = path.join(__dirname, "server", "data", "noslimites.db");
const db = new Database(dbPath);
const API_URL = "http://localhost:3001/api";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

console.log("🧪 Testing Feature #54: Notification when invitation is accepted\n");

// Cleanup function
function cleanup() {
  console.log("\n🧹 Cleaning up test data...");
  try {
    db.exec("DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_f54_%')");
    db.exec("DELETE FROM user_limits WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_f54_%')");
    db.exec("DELETE FROM relationships WHERE id LIKE 'test_f54_%' OR invitation_token IN (SELECT invitation_token FROM relationships WHERE inviter_id IN (SELECT id FROM users WHERE email LIKE 'test_f54_%'))");
    db.exec("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_f54_%')");
    db.exec("DELETE FROM users WHERE email LIKE 'test_f54_%'");
  } catch (e) {
    // Ignore errors if tables are empty
  }
  console.log("✅ Cleanup complete\n");
}

async function authRequest(method, endpoint, token, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`API Error (${response.status}): ${data.message || JSON.stringify(data)}`);
    }

    return data;
  } catch (error) {
    console.error(`Fetch error for ${method} ${endpoint}:`, error.message);
    throw error;
  }
}

cleanup();

(async () => {
  try {
    // Step 1: Create User A (the inviter)
    console.log("📝 Step 1: Creating User A (inviter)...");
    const userA = {
      id: uuidv4(),
      email: "test_f54_user_a@example.com",
      displayName: "User A F54",
    };

    const jwtA = jwt.sign({ userId: userA.id }, JWT_SECRET, { expiresIn: '24h' });
    userA.token = jwtA;

    db.prepare(
      `INSERT INTO users (id, email, display_name, auth_provider, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(userA.id, userA.email, userA.displayName, 'magic_link');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(uuidv4(), userA.id, jwtA, expiresAt);

    console.log(`✅ Created User A: ${userA.displayName}`);

    // Step 2: Create User B (the invitee)
    console.log("\n📝 Step 2: Creating User B (invitee)...");
    const userB = {
      id: uuidv4(),
      email: "test_f54_user_b@example.com",
      displayName: "User B F54",
    };

    const jwtB = jwt.sign({ userId: userB.id }, JWT_SECRET, { expiresIn: '24h' });
    userB.token = jwtB;

    db.prepare(
      `INSERT INTO users (id, email, display_name, auth_provider, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(userB.id, userB.email, userB.displayName, 'magic_link');

    db.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(uuidv4(), userB.id, jwtB, expiresAt);

    console.log(`✅ Created User B: ${userB.displayName}`);

    // Step 3: User A creates an invitation
    console.log("\n📝 Step 3: User A creates an invitation...");
    const inviteResponse = await authRequest('POST', '/relationships/invite', userA.token);

    if (!inviteResponse.data || !inviteResponse.data.invitationToken) {
      throw new Error("Failed to create invitation");
    }

    const invitationToken = inviteResponse.data.invitationToken;
    console.log(`✅ Invitation created with token: ${invitationToken}`);

    // Step 4: Check User A has no notifications before acceptance
    console.log("\n📝 Step 4: Checking User A's notifications before acceptance...");
    const notifsBefore = await authRequest('GET', '/notifications', userA.token);

    const acceptanceNotifsBefore = notifsBefore.data.filter(n => n.type === 'relation_accepted');
    console.log(`   User A has ${acceptanceNotifsBefore.length} 'relation_accepted' notifications before`);

    // Step 5: User B accepts the invitation
    console.log("\n📝 Step 5: User B accepts the invitation...");
    const acceptResponse = await authRequest('POST', `/relationships/accept/${invitationToken}`, userB.token);

    if (!acceptResponse.success) {
      throw new Error("Failed to accept invitation");
    }

    const relationshipId = acceptResponse.data.relationshipId;
    console.log(`✅ Invitation accepted! Relationship ID: ${relationshipId}`);

    // Step 6: Verify notification was created for User A
    console.log("\n📝 Step 6: Verifying notification for User A (inviter)...");
    const notifsAfter = await authRequest('GET', '/notifications', userA.token);

    const acceptanceNotifsAfter = notifsAfter.data.filter(n => n.type === 'relation_accepted');

    if (acceptanceNotifsAfter.length === 0) {
      throw new Error("❌ FAILED: No 'relation_accepted' notification found for User A!");
    }

    console.log(`✅ Found ${acceptanceNotifsAfter.length} 'relation_accepted' notification(s)`);

    // Step 7: Verify notification details
    console.log("\n📝 Step 7: Verifying notification details...");
    const notification = acceptanceNotifsAfter[0];

    console.log(`   Type: ${notification.type}`);
    console.log(`   Title: ${notification.title}`);
    console.log(`   Message: ${notification.message}`);

    if (notification.type !== 'relation_accepted') {
      throw new Error(`Expected type 'relation_accepted', got '${notification.type}'`);
    }

    if (notification.title !== 'Invitation acceptée') {
      throw new Error(`Expected title 'Invitation acceptée', got '${notification.title}'`);
    }

    if (!notification.message.includes(userB.displayName)) {
      throw new Error(`Message should mention accepting user's name '${userB.displayName}'`);
    }

    if (notification.relatedUserId !== userB.id) {
      throw new Error(`relatedUserId should be User B's ID`);
    }

    if (notification.relatedRelationshipId !== relationshipId) {
      throw new Error(`relatedRelationshipId should match relationship ID`);
    }

    console.log(`✅ All notification details are correct!`);

    // Step 8: Verify notification appears in User A's notification list
    console.log("\n📝 Step 8: Verifying notification appears in notification list...");

    if (notifsAfter.data.length === 0) {
      throw new Error("Notifications list is empty");
    }

    console.log(`✅ User A has ${notifsAfter.data.length} notification(s) total`);

    console.log("\n✅ ✅ ✅ ALL TESTS PASSED! Feature #54 works correctly! ✅ ✅ ✅");
    console.log("\nSummary:");
    console.log("- User A created an invitation");
    console.log("- User B accepted the invitation via POST /api/relationships/accept/:token");
    console.log("- User A received a 'relation_accepted' notification");
    console.log("- Notification has correct type, title, and message with User B's name");
    console.log("- Notification includes relatedUserId (User B) and relatedRelationshipId");
    console.log("- Notification appears in GET /api/notifications response");

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    cleanup();
    db.close();
  }
})();
