/**
 * Feature #29: Common limits counter updates correctly per relationship
 *
 * Test steps:
 * 1. Set up User A and User B with 3 common limits
 * 2. Navigate to home screen as User A
 * 3. Verify counter shows '3' common limits for User B's relationship
 * 4. User B unchecks one common limit
 * 5. Refresh home screen
 * 6. Verify counter now shows '2'
 * 7. Verify the counter matches GET /api/relationships/:id/common-limits count
 */

const BASE_URL = 'http://localhost:3001/api';

async function testCommonLimitsCounter() {
    console.log('\n=== Feature #29: Common limits counter updates correctly per relationship ===\n');

    // Step 1: Create two test users
    const userA_email = `user_a_${Date.now()}@test.com`;
    const userB_email = `user_b_${Date.now()}@test.com`;

    console.log(`1. Creating User A: ${userA_email}`);
    const mlA = await fetch(`${BASE_URL}/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userA_email })
    });
    const mlAData = await mlA.json();

    const vA = await fetch(`${BASE_URL}/auth/verify?token=${mlAData.token}`);
    const vAData = await vA.json();
    const tokenA = vAData.token;
    const userAId = vAData.user.id;
    console.log(`   ✓ User A created (ID: ${userAId})`);

    console.log(`\n2. Creating User B: ${userB_email}`);
    const mlB = await fetch(`${BASE_URL}/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userB_email })
    });
    const mlBData = await mlB.json();

    const vB = await fetch(`${BASE_URL}/auth/verify?token=${mlBData.token}`);
    const vBData = await vB.json();
    const tokenB = vBData.token;
    const userBId = vBData.user.id;
    console.log(`   ✓ User B created (ID: ${userBId})`);

    // Step 2: Create relationship between User A and User B
    console.log(`\n3. Creating relationship between User A and User B`);
    const inviteRes = await fetch(`${BASE_URL}/relationships/invite`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const inviteData = await inviteRes.json();
    const inviteToken = inviteData.data.invitationToken;
    console.log(`   ✓ Invitation created by User A`);

    const acceptRes = await fetch(`${BASE_URL}/relationships/accept/${inviteToken}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const acceptData = await acceptRes.json();
    const relationshipId = acceptData.data.relationshipId;
    console.log(`   ✓ Invitation accepted by User B (relationship ID: ${relationshipId})`);

    // Step 3: Get available limits
    console.log(`\n4. Getting available limits`);
    const limitsRes = await fetch(`${BASE_URL}/limits/categories`);
    const limitsData = await limitsRes.json();

    // Extract first 3 limit IDs
    const limitIds = [];
    for (const category of limitsData.data) {
        for (const subcategory of category.subcategories || []) {
            for (const limit of subcategory.limits || []) {
                limitIds.push(limit.id);
                if (limitIds.length >= 3) break;
            }
            if (limitIds.length >= 3) break;
        }
        if (limitIds.length >= 3) break;
    }
    console.log(`   ✓ Selected 3 limits: ${limitIds.join(', ')}`);

    // Step 4: User A checks 3 limits
    console.log(`\n5. User A checking 3 limits`);
    for (const limitId of limitIds) {
        await fetch(`${BASE_URL}/relationships/${relationshipId}/limits`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenA}`
            },
            body: JSON.stringify({
                limits: [{ limitId, isAccepted: true }]
            })
        });
    }
    console.log(`   ✓ User A checked 3 limits`);

    // Step 5: User B checks the same 3 limits (creating 3 common limits)
    console.log(`\n6. User B checking the same 3 limits`);
    for (const limitId of limitIds) {
        await fetch(`${BASE_URL}/relationships/${relationshipId}/limits`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenB}`
            },
            body: JSON.stringify({
                limits: [{ limitId, isAccepted: true }]
            })
        });
    }
    console.log(`   ✓ User B checked 3 limits (should create 3 common limits)`);

    // Step 6: Verify counter shows 3 on User A's home screen
    console.log(`\n7. Checking User A's home screen for common limits count`);
    const homeA1 = await fetch(`${BASE_URL}/relationships`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const homeA1Data = await homeA1.json();
    const relA1 = homeA1Data.data.find(r => r.id === relationshipId);

    console.log(`   User A sees: ${relA1.commonLimitsCount} common limits`);
    if (relA1.commonLimitsCount !== 3) {
        console.log(`   ✗ FAIL: Expected 3 common limits, got ${relA1.commonLimitsCount}`);
        return false;
    }
    console.log(`   ✓ Counter correctly shows 3 common limits`);

    // Step 7: Verify against common-limits endpoint
    console.log(`\n8. Verifying against /common-limits endpoint`);
    const commonRes = await fetch(`${BASE_URL}/relationships/${relationshipId}/common-limits`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const commonData = await commonRes.json();
    console.log(`   /common-limits endpoint returns: ${commonData.data.count} common limits`);

    if (commonData.data.count !== 3) {
        console.log(`   ✗ FAIL: common-limits endpoint shows ${commonData.data.count}, expected 3`);
        return false;
    }
    console.log(`   ✓ Counter matches common-limits endpoint`);

    // Step 8: User B unchecks one limit
    console.log(`\n9. User B unchecking one limit`);
    await fetch(`${BASE_URL}/relationships/${relationshipId}/limits`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({
            limits: [{ limitId: limitIds[0], isAccepted: false }]
        })
    });
    console.log(`   ✓ User B unchecked limit ${limitIds[0]}`);

    // Step 9: Verify counter now shows 2
    console.log(`\n10. Checking User A's home screen again`);
    const homeA2 = await fetch(`${BASE_URL}/relationships`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const homeA2Data = await homeA2.json();
    const relA2 = homeA2Data.data.find(r => r.id === relationshipId);

    console.log(`   User A now sees: ${relA2.commonLimitsCount} common limits`);
    if (relA2.commonLimitsCount !== 2) {
        console.log(`   ✗ FAIL: Expected 2 common limits, got ${relA2.commonLimitsCount}`);
        return false;
    }
    console.log(`   ✓ Counter correctly updated to 2 common limits`);

    // Step 10: Verify against common-limits endpoint again
    console.log(`\n11. Verifying updated count against /common-limits endpoint`);
    const common2Res = await fetch(`${BASE_URL}/relationships/${relationshipId}/common-limits`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const common2Data = await common2Res.json();
    console.log(`   /common-limits endpoint now returns: ${common2Data.data.count} common limits`);

    if (common2Data.data.count !== 2) {
        console.log(`   ✗ FAIL: common-limits endpoint shows ${common2Data.data.count}, expected 2`);
        return false;
    }
    console.log(`   ✓ Counter matches updated common-limits endpoint`);

    // Cleanup
    console.log(`\n12. Cleaning up test users`);
    await fetch(`${BASE_URL}/profile`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    await fetch(`${BASE_URL}/profile`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    console.log(`   ✓ Test users deleted`);

    console.log(`\n✅ Feature #29 PASSING: Common limits counter updates correctly per relationship\n`);
    return true;
}

testCommonLimitsCounter().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
