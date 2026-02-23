#!/usr/bin/env node

/**
 * Feature #66: Limit selections persist across sessions
 *
 * This test verifies that:
 * 1. User A logs in and checks several limits in a relationship
 * 2. User A logs out
 * 3. User A logs back in
 * 4. All previously checked limits are still checked
 * 5. Notes attached to limits are preserved
 */

const API_BASE = "http://localhost:3001/api";
const TEST_EMAIL_A = `userA_feature66_${Date.now()}@example.com`;
const TEST_EMAIL_B = `userB_feature66_${Date.now()}@example.com`;

let tokenA = null;
let tokenB = null;
let userIdA = null;
let userIdB = null;
let relationshipId = null;
let inviteToken = null;

// Array to track selected limit IDs
const selectedLimits = [];
const limitNotes = new Map(); // limitId -> note text

async function apiRequest(endpoint, options = {}, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
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

async function createUserAndLogin(email) {
  // Request magic link
  const magicLinkResponse = await apiRequest("/auth/magic-link", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  if (magicLinkResponse.status !== 200) {
    throw new Error(
      `Failed to request magic link: ${JSON.stringify(magicLinkResponse.data)}`
    );
  }

  const magicToken = magicLinkResponse.data.token;

  // Verify magic link
  const verifyResponse = await apiRequest(
    `/auth/verify?token=${magicToken}`,
    { method: "GET" }
  );

  if (verifyResponse.status !== 200) {
    throw new Error(
      `Failed to verify magic link: ${JSON.stringify(verifyResponse.data)}`
    );
  }

  return {
    token: verifyResponse.data.token,
    userId: verifyResponse.data.user.id,
    email: verifyResponse.data.user.email,
    displayName: verifyResponse.data.user.displayName,
  };
}

async function logout(token) {
  const response = await apiRequest("/auth/logout", {
    method: "POST",
  }, token);

  if (response.status !== 200) {
    throw new Error(`Failed to logout: ${JSON.stringify(response.data)}`);
  }

  return response;
}

async function test() {
  console.log("\n=== Feature #66: Limit selections persist across sessions ===\n");

  // Step 1: Create User A and User B
  console.log("Step 1: Creating User A and User B...");
  const userA = await createUserAndLogin(TEST_EMAIL_A);
  tokenA = userA.token;
  userIdA = userA.userId;

  const userB = await createUserAndLogin(TEST_EMAIL_B);
  tokenB = userB.token;
  userIdB = userB.userId;

  console.log(`✅ User A: ${userA.email} (ID: ${userIdA})`);
  console.log(`✅ User B: ${userB.email} (ID: ${userIdB})`);

  // Step 2: Create a relationship between A and B
  console.log("\nStep 2: Creating relationship between A and B...");

  // User A generates invite
  const inviteResponse = await apiRequest("/relationships/invite", {
    method: "POST",
  }, tokenA);

  if (inviteResponse.status !== 200 && inviteResponse.status !== 201) {
    throw new Error(`Failed to create invite: ${JSON.stringify(inviteResponse.data)}`);
  }

  // Response structure: { success, data: { invitationToken, ... }, message }
  inviteToken = inviteResponse.data.data?.invitationToken || inviteResponse.data.invitationToken || inviteResponse.data.token;
  console.log(`✅ Invitation created with token: ${inviteToken}`);

  // User B accepts invite
  const acceptResponse = await apiRequest(`/relationships/accept/${inviteToken}`, {
    method: "POST",
  }, tokenB);

  if (acceptResponse.status !== 200) {
    throw new Error(`Failed to accept invite: ${JSON.stringify(acceptResponse.data)}`);
  }

  // Response structure: { success, data: { relationshipId, status }, message }
  relationshipId = acceptResponse.data.data?.relationshipId || acceptResponse.data.relationship?.id;
  console.log(`✅ Relationship accepted (ID: ${relationshipId})`);

  // Step 3: Get limit categories and select several limits
  console.log("\nStep 3: Fetching limit categories...");
  const categoriesResponse = await apiRequest("/limits/categories", {}, tokenA);

  if (categoriesResponse.status !== 200) {
    throw new Error(`Failed to get categories: ${JSON.stringify(categoriesResponse.data)}`);
  }

  // Response structure: { success, data: [...], count }
  const categories = categoriesResponse.data.data || categoriesResponse.data;
  console.log(`✅ Fetched ${categories.length} categories`);

  // Collect some limit IDs to check (first 5 limits across categories)
  let limitsToCheck = [];
  for (const category of categories) {
    for (const subcategory of category.subcategories || []) {
      for (const limit of subcategory.limits || []) {
        if (limitsToCheck.length < 5) {
          limitsToCheck.push({
            id: limit.id,
            name: limit.name,
            note: `Test note for ${limit.name} - ${Date.now()}`,
          });
        }
      }
    }
  }

  if (limitsToCheck.length === 0) {
    throw new Error("No limits found in categories");
  }

  console.log(`\nStep 4: User A checking ${limitsToCheck.length} limits with notes...`);

  // Prepare limit updates
  const limitUpdates = limitsToCheck.map(limit => ({
    limitId: limit.id,
    isAccepted: true,
    note: limit.note,
  }));

  // Save these for later verification
  limitsToCheck.forEach(limit => {
    selectedLimits.push(limit.id);
    limitNotes.set(limit.id, limit.note);
  });

  // Update limits for User A
  const updateResponse = await apiRequest(`/relationships/${relationshipId}/limits`, {
    method: "PUT",
    body: JSON.stringify({ limits: limitUpdates }),
  }, tokenA);

  if (updateResponse.status !== 200) {
    throw new Error(`Failed to update limits: ${JSON.stringify(updateResponse.data)}`);
  }

  console.log(`✅ User A checked ${limitsToCheck.length} limits:`);
  limitsToCheck.forEach(limit => {
    console.log(`   - ${limit.name} (with note)`);
  });

  // Step 5: Verify limits are stored
  console.log("\nStep 5: Verifying limits are stored in database...");
  const limitsResponse1 = await apiRequest(`/relationships/${relationshipId}/limits`, {}, tokenA);

  if (limitsResponse1.status !== 200) {
    throw new Error(`Failed to get limits: ${JSON.stringify(limitsResponse1.data)}`);
  }

  // Response structure: { success, data: { relationshipId, limits: [...] } }
  const allLimits1 = limitsResponse1.data.data?.limits || limitsResponse1.data.limits || limitsResponse1.data;
  const storedLimits1 = Array.isArray(allLimits1) ? allLimits1.filter(l => l.isAccepted) : [];
  console.log(`✅ Found ${storedLimits1.length} accepted limits in database`);

  // Verify all our limits are there with notes
  for (const expectedLimit of limitsToCheck) {
    const foundLimit = storedLimits1.find(l => l.limitId === expectedLimit.id);
    if (!foundLimit) {
      throw new Error(`Limit ${expectedLimit.id} not found in stored limits`);
    }
    if (foundLimit.note !== expectedLimit.note) {
      throw new Error(`Note mismatch for limit ${expectedLimit.id}: expected "${expectedLimit.note}", got "${foundLimit.note}"`);
    }
    console.log(`   ✓ ${expectedLimit.name} - note preserved`);
  }

  // Step 6: User A logs out
  console.log("\nStep 6: User A logging out...");
  await logout(tokenA);
  console.log("✅ User A logged out");

  // Step 7: User A logs back in
  console.log("\nStep 7: User A logging back in...");
  const userARelogin = await createUserAndLogin(TEST_EMAIL_A);
  tokenA = userARelogin.token;

  if (userARelogin.userId !== userIdA) {
    throw new Error("User ID changed after re-login! Expected persistence.");
  }

  console.log(`✅ User A logged back in (same user ID: ${userIdA})`);

  // Step 8: Navigate to the same relationship and verify limits
  console.log("\nStep 8: Verifying all previously checked limits are still checked...");
  const limitsResponse2 = await apiRequest(`/relationships/${relationshipId}/limits`, {}, tokenA);

  if (limitsResponse2.status !== 200) {
    throw new Error(`Failed to get limits after re-login: ${JSON.stringify(limitsResponse2.data)}`);
  }

  // Response structure: { success, data: { relationshipId, limits: [...] } }
  const allLimits2 = limitsResponse2.data.data?.limits || limitsResponse2.data.limits || limitsResponse2.data;
  const storedLimits2 = Array.isArray(allLimits2) ? allLimits2.filter(l => l.isAccepted) : [];
  console.log(`✅ Found ${storedLimits2.length} accepted limits after re-login`);

  // Verify all our limits are still there
  for (const expectedLimit of limitsToCheck) {
    const foundLimit = storedLimits2.find(l => l.limitId === expectedLimit.id);
    if (!foundLimit) {
      throw new Error(`Limit ${expectedLimit.id} NOT FOUND after re-login! Persistence failed.`);
    }
    if (!foundLimit.isAccepted) {
      throw new Error(`Limit ${expectedLimit.id} is no longer accepted after re-login!`);
    }
    console.log(`   ✓ ${expectedLimit.name} - still checked`);
  }

  // Step 9: Verify notes are preserved
  console.log("\nStep 9: Verifying notes are still attached to limits...");
  for (const expectedLimit of limitsToCheck) {
    const foundLimit = storedLimits2.find(l => l.limitId === expectedLimit.id);
    if (foundLimit.note !== expectedLimit.note) {
      throw new Error(
        `Note NOT PRESERVED for limit ${expectedLimit.id}!\n` +
        `Expected: "${expectedLimit.note}"\n` +
        `Got: "${foundLimit.note}"`
      );
    }
    console.log(`   ✓ ${expectedLimit.name} - note preserved: "${foundLimit.note}"`);
  }

  // Cleanup: Delete both test users
  console.log("\nCleanup: Deleting test users...");
  await apiRequest("/profile", { method: "DELETE" }, tokenA);
  await apiRequest("/profile", { method: "DELETE" }, tokenB);
  console.log("✅ Test users deleted");

  console.log("\n=== ✅ All tests passed! Feature #66 is working correctly ===");
  console.log("   - Limit selections persist across logout/login");
  console.log("   - Notes are preserved across sessions");
  console.log("   - All data stored in real database (SQLite)\n");
}

test().catch((error) => {
  console.error("\n❌ Test failed:", error.message);
  process.exit(1);
});
