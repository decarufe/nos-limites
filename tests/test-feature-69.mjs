#!/usr/bin/env node

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE = "http://localhost:3001/api";

async function makeRequest(method, path, body = null, token = null) {
	const url = `${API_BASE}${path}`;
	const options = {
		method,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
	};

	if (body) {
		options.body = JSON.stringify(body);
	}

	const response = await fetch(url, options);
	const data = await response.json();

	if (!response.ok && response.status !== 404 && response.status !== 400) {
		throw new Error(`HTTP ${response.status}: ${data.message || "Request failed"}`);
	}

	return { status: response.status, data };
}

function generateId() {
	return Math.random().toString(36).substring(2, 15) +
				 Math.random().toString(36).substring(2, 15);
}

async function testNewRelationshipLimits() {
	console.log("\n=== Feature #69: New relationship starts with zero limits ===\n");

	const db = new Database(join(__dirname, 'server', 'data', 'noslimites.db'));
	const testEmailA = `test-a-${Date.now()}@example.com`;
	const testEmailB = `test-b-${Date.now()}@example.com`;

	let tokenA, tokenB, userIdA, userIdB, relationshipId;

	try {
		// Step 1: Create User A
		console.log("1. Creating User A...");
		const magicTokenA = generateId();
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

		db.prepare(`
			INSERT INTO magic_links (id, email, token, expires_at, used)
			VALUES (?, ?, ?, ?, 0)
		`).run(generateId(), testEmailA, magicTokenA, expiresAt);

		const verifyA = await makeRequest("GET", `/auth/verify?token=${magicTokenA}`);
		tokenA = verifyA.data.token;
		userIdA = verifyA.data.userId;

		await makeRequest("PUT", "/profile", { displayName: "User A" }, tokenA);
		console.log(`   ✓ User A created: ${testEmailA}`);

		// Step 2: Create User B
		console.log("\n2. Creating User B...");
		const magicTokenB = generateId();

		db.prepare(`
			INSERT INTO magic_links (id, email, token, expires_at, used)
			VALUES (?, ?, ?, ?, 0)
		`).run(generateId(), testEmailB, magicTokenB, expiresAt);

		const verifyB = await makeRequest("GET", `/auth/verify?token=${magicTokenB}`);
		tokenB = verifyB.data.token;
		userIdB = verifyB.data.userId;

		await makeRequest("PUT", "/profile", { displayName: "User B" }, tokenB);
		console.log(`   ✓ User B created: ${testEmailB}`);

		// Step 3: Create invitation from A to B
		console.log("\n3. Creating relationship between A and B...");
		const inviteResp = await makeRequest("POST", "/relationships/invite", {}, tokenA);
		const invitationToken = inviteResp.data.data.invitationToken;
		console.log(`   ✓ Invitation created: ${invitationToken}`);

		// Step 4: B accepts invitation
		const acceptResp = await makeRequest("POST", `/relationships/accept/${invitationToken}`, {}, tokenB);
		relationshipId = acceptResp.data.data.relationshipId;
		console.log(`   ✓ Invitation accepted, relationship ID: ${relationshipId}`);

		// Step 5: Check user_limits table - should be EMPTY for new relationship
		console.log("\n4. Verifying user_limits table...");
		const limitsInDb = db.prepare(`
			SELECT * FROM user_limits
			WHERE relationship_id = ?
		`).all(relationshipId);

		console.log(`   ✓ user_limits records for relationship: ${limitsInDb.length}`);

		if (limitsInDb.length !== 0) {
			throw new Error(`Expected 0 user_limits records, found ${limitsInDb.length}`);
		}
		console.log("   ✓ PASS: No limits pre-selected in database");

		// Step 6: User A fetches their limits - should return empty array
		console.log("\n5. Fetching User A's limits via API...");
		const limitsA = await makeRequest("GET", `/relationships/${relationshipId}/limits`, null, tokenA);

		console.log(`   ✓ API returned ${limitsA.data.data.limits.length} limits`);

		if (limitsA.data.data.limits.length !== 0) {
			throw new Error(`Expected 0 limits for User A, got ${limitsA.data.data.limits.length}`);
		}
		console.log("   ✓ PASS: User A has no limits checked");

		// Step 7: User B fetches their limits - should also return empty array
		console.log("\n6. Fetching User B's limits via API...");
		const limitsB = await makeRequest("GET", `/relationships/${relationshipId}/limits`, null, tokenB);

		console.log(`   ✓ API returned ${limitsB.data.data.limits.length} limits`);

		if (limitsB.data.data.limits.length !== 0) {
			throw new Error(`Expected 0 limits for User B, got ${limitsB.data.data.limits.length}`);
		}
		console.log("   ✓ PASS: User B has no limits checked");

		// Step 8: Verify common limits are also empty
		console.log("\n7. Fetching common limits...");
		const commonA = await makeRequest("GET", `/relationships/${relationshipId}/common-limits`, null, tokenA);
		const commonB = await makeRequest("GET", `/relationships/${relationshipId}/common-limits`, null, tokenB);

		console.log(`   ✓ User A sees ${commonA.data.data.count} common limits`);
		console.log(`   ✓ User B sees ${commonB.data.data.count} common limits`);

		if (commonA.data.data.count !== 0 || commonB.data.data.count !== 0) {
			throw new Error("Expected 0 common limits for new relationship");
		}
		console.log("   ✓ PASS: No common limits exist");

		// Clean up
		console.log("\n8. Cleaning up test data...");
		await makeRequest("DELETE", "/profile", null, tokenA);
		await makeRequest("DELETE", "/profile", null, tokenB);
		console.log("   ✓ Test users deleted");

		db.close();

		console.log("\n=== All checks passed! ===");
		console.log("\nNew relationship verified:");
		console.log("  - user_limits table has 0 records");
		console.log("  - User A API returns 0 limits");
		console.log("  - User B API returns 0 limits");
		console.log("  - Common limits count is 0");
		console.log("  - No limits pre-selected for either user\n");

		return true;

	} catch (error) {
		console.error("\n❌ Test failed:", error.message);
		console.error(error.stack);

		// Cleanup on failure
		try {
			if (tokenA) await makeRequest("DELETE", "/profile", null, tokenA);
			if (tokenB) await makeRequest("DELETE", "/profile", null, tokenB);
		} catch (e) {
			// Ignore cleanup errors
		}

		db.close();
		return false;
	}
}

// Run the test
testNewRelationshipLimits()
	.then((success) => {
		process.exit(success ? 0 : 1);
	})
	.catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
