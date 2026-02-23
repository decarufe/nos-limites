/**
 * Simple test for Feature #31: Tests the backend logic for removing common limits
 * Creates users/relationship via DB, then calls the API to update limits
 */

const Database = require("./server/node_modules/better-sqlite3");
const path = require("path");
const { v4: uuidv4 } = require("./server/node_modules/uuid");
const jwt = require("./server/node_modules/jsonwebtoken");
// Node.js 18+ has built-in fetch

const dbPath = path.join(__dirname, "server", "data", "noslimites.db");
const db = new Database(dbPath);
const API_URL = "http://localhost:3001/api";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

console.log("🧪 Testing Feature #31 API logic: Notification when common limit is removed\n");

// Cleanup function
function cleanup() {
	console.log("\n🧹 Cleaning up test data...");
	db.exec("DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_f31_simple_%')");
	db.exec("DELETE FROM user_limits WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_f31_simple_%')");
	db.exec("DELETE FROM relationships WHERE id LIKE 'test_f31_simple_%'");
	db.exec("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_f31_simple_%')");
	db.exec("DELETE FROM users WHERE email LIKE 'test_f31_simple_%'");
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

	const response = await fetch(`${API_URL}${endpoint}`, options);
	const data = await response.json();

	if (!response.ok) {
		throw new Error(`API Error (${response.status}): ${data.message || JSON.stringify(data)}`);
	}

	return data;
}

cleanup();

(async () => {
	try {
		// Step 1: Create test users with sessions
		console.log("📝 Step 1: Creating test users with sessions...");
		const userA = {
			id: uuidv4(),
			email: "test_f31_simple_a@example.com",
			displayName: "User A Simple",
		};
		const userB = {
			id: uuidv4(),
			email: "test_f31_simple_b@example.com",
			displayName: "User B Simple",
		};

		// Create JWTs
		const jwtA = jwt.sign({ userId: userA.id }, JWT_SECRET, { expiresIn: '24h' });
		const jwtB = jwt.sign({ userId: userB.id }, JWT_SECRET, { expiresIn: '24h' });

		userA.token = jwtA;
		userB.token = jwtB;

		// Create users
		db.prepare(
			`INSERT INTO users (id, email, display_name, auth_provider, created_at, updated_at)
			 VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
		).run(userA.id, userA.email, userA.displayName, 'magic_link');

		db.prepare(
			`INSERT INTO users (id, email, display_name, auth_provider, created_at, updated_at)
			 VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
		).run(userB.id, userB.email, userB.displayName, 'magic_link');

		// Create sessions (store the JWT tokens)
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
		db.prepare(
			`INSERT INTO sessions (id, user_id, token, expires_at, created_at)
			 VALUES (?, ?, ?, ?, datetime('now'))`
		).run(uuidv4(), userA.id, jwtA, expiresAt);

		db.prepare(
			`INSERT INTO sessions (id, user_id, token, expires_at, created_at)
			 VALUES (?, ?, ?, ?, datetime('now'))`
		).run(uuidv4(), userB.id, jwtB, expiresAt);

		console.log(`✅ Created User A: ${userA.displayName}`);
		console.log(`✅ Created User B: ${userB.displayName}`);

		// Step 2: Create relationship
		console.log("\n📝 Step 2: Creating relationship...");
		const relationship = {
			id: "test_f31_simple_" + uuidv4(),
			inviterId: userA.id,
			inviteeId: userB.id,
			invitationToken: uuidv4(),
			status: "accepted",
		};

		db.prepare(
			`INSERT INTO relationships (id, inviter_id, invitee_id, invitation_token, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
		).run(relationship.id, relationship.inviterId, relationship.inviteeId, relationship.invitationToken, relationship.status);

		console.log(`✅ Created relationship: ${relationship.id}`);

		// Step 3: Get a test limit
		console.log("\n📝 Step 3: Getting a test limit...");
		const limit = db.prepare("SELECT id, name FROM limits ORDER BY RANDOM() LIMIT 1").get();

		if (!limit) {
			throw new Error("No limits found in database");
		}

		console.log(`✅ Using limit: "${limit.name}" (${limit.id})`);

		// Step 4: Both users check the limit (via API)
		console.log("\n📝 Step 4: Both users check the limit via API...");

		await authRequest('PUT', `/relationships/${relationship.id}/limits`, userA.token, {
			limits: [{ limitId: limit.id, isAccepted: true }]
		});
		console.log(`✅ User A checked the limit`);

		await authRequest('PUT', `/relationships/${relationship.id}/limits`, userB.token, {
			limits: [{ limitId: limit.id, isAccepted: true }]
		});
		console.log(`✅ User B checked the limit`);

		// Step 5: Verify it's a common limit
		console.log("\n📝 Step 5: Verifying common limit...");
		const commonBefore = await authRequest('GET', `/relationships/${relationship.id}/common-limits`, userA.token);

		if (commonBefore.data.count !== 1) {
			throw new Error(`Expected 1 common limit, found ${commonBefore.data.count}`);
		}
		console.log(`✅ Verified 1 common limit exists`);

		// Step 6: User A unchecks the limit (should create notification for User B)
		console.log("\n📝 Step 6: User A unchecks the limit...");

		const notifsBefore = db.prepare(
			"SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND type = 'limit_removed'"
		).get(userB.id).count;
		console.log(`   Notifications (limit_removed) for User B before: ${notifsBefore}`);

		await authRequest('PUT', `/relationships/${relationship.id}/limits`, userA.token, {
			limits: [{ limitId: limit.id, isAccepted: false }]
		});
		console.log(`✅ User A unchecked the limit`);

		// Step 7: Verify notification was created
		console.log("\n📝 Step 7: Verifying notification for User B...");

		const notifsAfter = db.prepare(
			"SELECT * FROM notifications WHERE user_id = ? AND type = 'limit_removed' ORDER BY created_at DESC LIMIT 1"
		).get(userB.id);

		if (!notifsAfter) {
			throw new Error("❌ FAILED: No 'limit_removed' notification found for User B!");
		}

		console.log(`✅ Notification created!`);
		console.log(`   Type: ${notifsAfter.type}`);
		console.log(`   Title: ${notifsAfter.title}`);
		console.log(`   Message: ${notifsAfter.message}`);

		// Verify notification content
		if (notifsAfter.type !== 'limit_removed') {
			throw new Error(`Expected type 'limit_removed', got '${notifsAfter.type}'`);
		}
		if (notifsAfter.title !== 'Limite commune retirée') {
			throw new Error(`Expected title 'Limite commune retirée', got '${notifsAfter.title}'`);
		}
		if (!notifsAfter.message.includes(limit.name)) {
			throw new Error(`Message should mention limit name '${limit.name}'`);
		}
		if (!notifsAfter.message.includes(userA.displayName)) {
			throw new Error(`Message should mention user name '${userA.displayName}'`);
		}

		// Step 8: Verify limit is no longer common
		console.log("\n📝 Step 8: Verifying limit is no longer common...");
		const commonAfter = await authRequest('GET', `/relationships/${relationship.id}/common-limits`, userA.token);

		if (commonAfter.data.count !== 0) {
			throw new Error(`Expected 0 common limits, found ${commonAfter.data.count}`);
		}
		console.log(`✅ Verified 0 common limits after unchecking`);

		// Step 9: Test via notifications API endpoint
		console.log("\n📝 Step 9: Testing notifications API endpoint...");
		const notifsAPI = await authRequest('GET', '/notifications', userB.token);

		const limitRemovedNotifs = notifsAPI.data.filter(n => n.type === 'limit_removed');
		if (limitRemovedNotifs.length === 0) {
			throw new Error("No 'limit_removed' notifications found via API");
		}

		console.log(`✅ Found ${limitRemovedNotifs.length} limit_removed notification(s) via API`);

		console.log("\n✅ ✅ ✅ ALL TESTS PASSED! Feature #31 works end-to-end! ✅ ✅ ✅");
		console.log("\nSummary:");
		console.log("- User A unchecked a previously common limit via PUT /api/relationships/:id/limits");
		console.log("- Backend created 'limit_removed' notification for User B");
		console.log("- Notification has correct type, title, message with limit name and user name");
		console.log("- Common limits count decreased from 1 to 0");
		console.log("- Notification is retrievable via GET /api/notifications");

	} catch (error) {
		console.error("\n❌ TEST FAILED:", error.message);
		console.error(error.stack);
		process.exit(1);
	} finally {
		cleanup();
		db.close();
	}
})();
