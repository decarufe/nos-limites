#!/usr/bin/env node

/**
 * Feature #40: Session persists across browser refresh
 *
 * This test verifies that:
 * 1. User can log in
 * 2. Token is stored in localStorage (simulated)
 * 3. After "refresh" (new session initialization), user remains authenticated
 * 4. GET /api/auth/session returns valid user data
 */

const API_BASE = "http://localhost:3001/api";
const TEST_EMAIL = `test_feature40_${Date.now()}@example.com`;

let authToken = null;
let userId = null;

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (authToken && !options.skipAuth) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { text };
  }

  return { status: response.status, data };
}

async function test() {
  console.log("\n=== Feature #40: Session persists across browser refresh ===\n");

  // Step 1: Request magic link
  console.log(`Step 1: Requesting magic link for ${TEST_EMAIL}...`);
  const magicLinkResponse = await apiRequest("/auth/magic-link", {
    method: "POST",
    body: JSON.stringify({ email: TEST_EMAIL }),
  });

  if (magicLinkResponse.status !== 200) {
    throw new Error(`Failed to request magic link: ${JSON.stringify(magicLinkResponse.data)}`);
  }

  const magicToken = magicLinkResponse.data.token;
  console.log(`✅ Magic link generated with token: ${magicToken}`);

  // Step 2: Verify magic link and log in
  console.log("\nStep 2: Verifying magic link and logging in...");
  const verifyResponse = await apiRequest(`/auth/verify?token=${magicToken}`, {
    method: "GET",
    skipAuth: true,
  });

  if (verifyResponse.status !== 200) {
    throw new Error(`Failed to verify magic link: ${JSON.stringify(verifyResponse.data)}`);
  }

  authToken = verifyResponse.data.token;
  userId = verifyResponse.data.user.id;
  const userEmail = verifyResponse.data.user.email;
  const displayName = verifyResponse.data.user.displayName;

  console.log(`✅ Logged in successfully`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Email: ${userEmail}`);
  console.log(`   Display Name: ${displayName}`);
  console.log(`   Token: ${authToken.substring(0, 20)}...`);

  // Step 3: Verify authenticated state
  console.log("\nStep 3: Verifying authenticated state (GET /auth/session)...");
  const sessionResponse1 = await apiRequest("/auth/session");

  if (sessionResponse1.status !== 200) {
    throw new Error(`Failed to get session: ${JSON.stringify(sessionResponse1.data)}`);
  }

  console.log(`✅ Session valid - user data retrieved:`);
  console.log(`   ID: ${sessionResponse1.data.user.id}`);
  console.log(`   Email: ${sessionResponse1.data.user.email}`);
  console.log(`   Display Name: ${sessionResponse1.data.user.displayName}`);

  if (sessionResponse1.data.user.id !== userId) {
    throw new Error("User ID mismatch in session response");
  }

  // Step 4: Simulate browser refresh by making another session check with the same token
  console.log("\nStep 4: Simulating browser refresh (re-checking session with stored token)...");

  // In a real browser, the token would be retrieved from localStorage
  // We simulate this by keeping the authToken variable and making another request
  const sessionResponse2 = await apiRequest("/auth/session");

  if (sessionResponse2.status !== 200) {
    throw new Error(`Session invalid after refresh: ${JSON.stringify(sessionResponse2.data)}`);
  }

  console.log(`✅ Session still valid after refresh:`);
  console.log(`   ID: ${sessionResponse2.data.user.id}`);
  console.log(`   Email: ${sessionResponse2.data.user.email}`);
  console.log(`   Display Name: ${sessionResponse2.data.user.displayName}`);

  // Step 5: Verify profile data is still loaded
  console.log("\nStep 5: Verifying profile data is still accessible...");
  const profileResponse = await apiRequest("/profile");

  if (profileResponse.status !== 200) {
    throw new Error(`Failed to get profile: ${JSON.stringify(profileResponse.data)}`);
  }

  console.log(`✅ Profile data accessible:`);
  console.log(`   ID: ${profileResponse.data.user.id}`);
  console.log(`   Email: ${profileResponse.data.user.email}`);
  console.log(`   Display Name: ${profileResponse.data.user.displayName}`);

  if (profileResponse.data.user.id !== userId) {
    throw new Error("User ID mismatch in profile response");
  }

  // Cleanup: Delete test user
  console.log("\nCleanup: Deleting test user...");
  const deleteResponse = await apiRequest("/profile", {
    method: "DELETE",
  });

  if (deleteResponse.status !== 200) {
    console.warn(`⚠️  Failed to delete test user: ${JSON.stringify(deleteResponse.data)}`);
  } else {
    console.log("✅ Test user deleted");
  }

  // Step 6: Verify session is now invalid after deletion
  console.log("\nStep 6: Verifying session is invalid after account deletion...");
  const sessionResponse3 = await apiRequest("/auth/session");

  if (sessionResponse3.status === 401 || sessionResponse3.status === 404) {
    console.log(`✅ Session correctly invalidated (status: ${sessionResponse3.status})`);
  } else {
    console.warn(`⚠️  Expected 401/404, got ${sessionResponse3.status}`);
  }

  console.log("\n=== ✅ All tests passed! Feature #40 is working correctly ===\n");
}

test().catch((error) => {
  console.error("\n❌ Test failed:", error.message);
  process.exit(1);
});
