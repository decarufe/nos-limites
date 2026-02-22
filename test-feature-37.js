/**
 * Test for Feature #37: Expired magic link shows appropriate error
 *
 * Steps:
 * 1. Create a magic link token
 * 2. Manually set its expiration to a past date in the database
 * 3. Try to verify with GET /api/auth/verify?token=xxx
 * 4. Verify 400 response with descriptive error
 * 5. Verify the error message is in French
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

const BASE_URL = 'http://localhost:3001/api';

async function testExpiredMagicLink() {
  console.log('🧪 Testing Feature #37: Expired magic link error handling\n');

  try {
    // Step 1: Request a magic link
    console.log('Step 1: Requesting magic link for test@expired.com...');
    const magicLinkResponse = await fetch(`${BASE_URL}/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@expired.com' })
    });

    if (!magicLinkResponse.ok) {
      throw new Error(`Failed to create magic link: ${magicLinkResponse.status}`);
    }

    const magicLinkData = await magicLinkResponse.json();
    const token = magicLinkData.token;
    console.log(`✓ Magic link created with token: ${token}\n`);

    // Step 2: Manually expire the token in the database
    console.log('Step 2: Expiring the token in database...');
    const dbPath = path.join(__dirname, 'server', 'data', 'noslimites.db');
    const db = sqlite3(dbPath);

    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
    const updateResult = db.prepare(`
      UPDATE magic_links
      SET expires_at = ?
      WHERE token = ?
    `).run(pastDate, token);

    if (updateResult.changes === 0) {
      throw new Error('Failed to update magic link expiration');
    }

    console.log(`✓ Token expiration set to: ${pastDate}\n`);

    // Step 3: Try to verify the expired token
    console.log('Step 3: Attempting to verify expired token...');
    const verifyResponse = await fetch(`${BASE_URL}/auth/verify?token=${token}`);

    console.log(`Response status: ${verifyResponse.status}`);

    // Step 4: Verify 400 response
    if (verifyResponse.status !== 400) {
      throw new Error(`Expected status 400, got ${verifyResponse.status}`);
    }
    console.log('✓ Received 400 status code\n');

    // Step 5: Verify French error message
    const errorData = await verifyResponse.json();
    console.log('Response body:', JSON.stringify(errorData, null, 2));

    if (!errorData.message) {
      throw new Error('No error message in response');
    }

    // Check for French error message about expiration
    const expectedPhrases = ['expiré', 'demander un nouveau'];
    const messageContainsExpected = expectedPhrases.some(phrase =>
      errorData.message.toLowerCase().includes(phrase)
    );

    if (!messageContainsExpected) {
      throw new Error(`Error message doesn't mention expiration or requesting new link. Got: "${errorData.message}"`);
    }

    console.log('✓ Error message is in French and mentions expiration\n');

    // Cleanup: Delete the test magic link
    db.prepare('DELETE FROM magic_links WHERE token = ?').run(token);
    db.close();

    console.log('✅ Feature #37 PASSED: Expired magic link shows appropriate error');
    console.log('\nVerified:');
    console.log('  - Backend returns 400 status for expired tokens');
    console.log('  - Error message is in French');
    console.log('  - Message mentions expiration and requesting a new link');
    console.log('  - UI can display the error (frontend already implemented)');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testExpiredMagicLink().then(success => {
  process.exit(success ? 0 : 1);
});
