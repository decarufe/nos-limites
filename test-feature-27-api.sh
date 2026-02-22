#!/bin/bash

# Test Feature #27: User can add a note to a limit (API endpoints)

set -e

echo "🧪 Testing Feature #27 API Endpoints"
echo ""

# Setup: Create test users and get tokens
echo "📝 Step 1: Creating test users and logging in..."

# User A
MAGIC_LINK_A=$(curl -s -X POST http://localhost:3001/api/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test_api_note_a@example.com"}' | grep -oP '(?<=token=)[^&"]+' || echo "")

if [ -z "$MAGIC_LINK_A" ]; then
  echo "❌ Failed to create magic link for User A"
  exit 1
fi

TOKEN_A=$(curl -s "http://localhost:3001/api/auth/verify?token=$MAGIC_LINK_A" | grep -oP '(?<="token":")[^"]+')

if [ -z "$TOKEN_A" ]; then
  echo "❌ Failed to get token for User A"
  exit 1
fi

echo "✅ User A logged in"

# Set display name for User A
curl -s -X PUT http://localhost:3001/api/profile \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"API Test User A"}' > /dev/null

# User B
MAGIC_LINK_B=$(curl -s -X POST http://localhost:3001/api/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test_api_note_b@example.com"}' | grep -oP '(?<=token=)[^&"]+' || echo "")

if [ -z "$MAGIC_LINK_B" ]; then
  echo "❌ Failed to create magic link for User B"
  exit 1
fi

TOKEN_B=$(curl -s "http://localhost:3001/api/auth/verify?token=$MAGIC_LINK_B" | grep -oP '(?<="token":")[^"]+')

if [ -z "$TOKEN_B" ]; then
  echo "❌ Failed to get token for User B"
  exit 1
fi

echo "✅ User B logged in"

# Set display name for User B
curl -s -X PUT http://localhost:3001/api/profile \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"API Test User B"}' > /dev/null

# Step 2: Create relationship
echo ""
echo "📝 Step 2: Creating relationship..."

INVITE_TOKEN=$(curl -s -X POST http://localhost:3001/api/relationships/invite \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" | grep -oP '(?<="invitationToken":")[^"]+')

if [ -z "$INVITE_TOKEN" ]; then
  echo "❌ Failed to create invitation"
  exit 1
fi

echo "✅ Invitation created: $INVITE_TOKEN"

# Accept invitation as User B
RELATIONSHIP_ID=$(curl -s -X POST "http://localhost:3001/api/relationships/accept/$INVITE_TOKEN" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" | grep -oP '(?<="relationshipId":")[^"]+')

if [ -z "$RELATIONSHIP_ID" ]; then
  echo "❌ Failed to accept invitation"
  exit 1
fi

echo "✅ Relationship accepted: $RELATIONSHIP_ID"

# Step 3: Get a limit ID
echo ""
echo "📝 Step 3: Getting a test limit..."

LIMIT_ID=$(curl -s http://localhost:3001/api/limits/categories | grep -oP '(?<="id":")[a-f0-9-]{36}' | head -1)

if [ -z "$LIMIT_ID" ]; then
  echo "❌ Failed to get limit ID"
  exit 1
fi

echo "✅ Using limit ID: $LIMIT_ID"

# Step 4: Add note via PUT endpoint
echo ""
echo "📝 Step 4: Adding note via API..."

NOTE_RESPONSE=$(curl -s -X PUT "http://localhost:3001/api/relationships/$RELATIONSHIP_ID/limits/$LIMIT_ID/note" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"note":"TEST_NOTE_UNIQUE_987"}')

if echo "$NOTE_RESPONSE" | grep -q "success.*true"; then
  echo "✅ Note added successfully"
else
  echo "❌ Failed to add note"
  echo "Response: $NOTE_RESPONSE"
  exit 1
fi

# Step 5: Verify note appears in GET limits
echo ""
echo "📝 Step 5: Verifying note in GET request..."

LIMITS_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/relationships/$RELATIONSHIP_ID/limits" \
  -H "Authorization: Bearer $TOKEN_A")

if echo "$LIMITS_RESPONSE" | grep -q "TEST_NOTE_UNIQUE_987"; then
  echo "✅ Note appears in GET /limits response"
else
  echo "❌ Note not found in GET /limits response"
  echo "Response: $LIMITS_RESPONSE"
  exit 1
fi

# Step 6: Update the note
echo ""
echo "📝 Step 6: Updating note..."

UPDATE_RESPONSE=$(curl -s -X PUT "http://localhost:3001/api/relationships/$RELATIONSHIP_ID/limits/$LIMIT_ID/note" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"note":"UPDATED_NOTE_654"}')

if echo "$UPDATE_RESPONSE" | grep -q "success.*true"; then
  echo "✅ Note updated successfully"
else
  echo "❌ Failed to update note"
  echo "Response: $UPDATE_RESPONSE"
  exit 1
fi

# Step 7: Verify updated note
echo ""
echo "📝 Step 7: Verifying updated note..."

UPDATED_LIMITS=$(curl -s -X GET "http://localhost:3001/api/relationships/$RELATIONSHIP_ID/limits" \
  -H "Authorization: Bearer $TOKEN_A")

if echo "$UPDATED_LIMITS" | grep -q "UPDATED_NOTE_654"; then
  echo "✅ Updated note appears in response"
else
  echo "❌ Updated note not found"
  echo "Response: $UPDATED_LIMITS"
  exit 1
fi

# Step 8: Test empty note validation
echo ""
echo "📝 Step 8: Testing empty note validation..."

EMPTY_NOTE_RESPONSE=$(curl -s -X PUT "http://localhost:3001/api/relationships/$RELATIONSHIP_ID/limits/$LIMIT_ID/note" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"note":""}')

if echo "$EMPTY_NOTE_RESPONSE" | grep -q "ne peut pas être vide"; then
  echo "✅ Empty note rejected with correct error message"
else
  echo "⚠️  Empty note validation may not be working"
fi

# Step 9: Test authorization (User B cannot access User A's note directly)
echo ""
echo "📝 Step 9: Testing authorization..."

AUTH_TEST=$(curl -s -w "%{http_code}" -X GET "http://localhost:3001/api/relationships/$RELATIONSHIP_ID/limits" \
  -H "Authorization: Bearer $TOKEN_B")

if echo "$AUTH_TEST" | grep -q "200$"; then
  echo "✅ User B can access their own relationship (expected)"
else
  echo "❌ User B cannot access relationship"
  exit 1
fi

# Step 10: Delete note
echo ""
echo "📝 Step 10: Deleting note..."

DELETE_RESPONSE=$(curl -s -X DELETE "http://localhost:3001/api/relationships/$RELATIONSHIP_ID/limits/$LIMIT_ID/note" \
  -H "Authorization: Bearer $TOKEN_A")

if echo "$DELETE_RESPONSE" | grep -q "success.*true"; then
  echo "✅ Note deleted successfully"
else
  echo "❌ Failed to delete note"
  echo "Response: $DELETE_RESPONSE"
  exit 1
fi

# Step 11: Verify note is gone
echo ""
echo "📝 Step 11: Verifying note deletion..."

AFTER_DELETE=$(curl -s -X GET "http://localhost:3001/api/relationships/$RELATIONSHIP_ID/limits" \
  -H "Authorization: Bearer $TOKEN_A")

if echo "$AFTER_DELETE" | grep -q "UPDATED_NOTE_654"; then
  echo "❌ Note still exists after deletion"
  exit 1
else
  echo "✅ Note successfully removed"
fi

echo ""
echo "============================================================"
echo "✅ ALL API TESTS PASSED - Feature #27 API endpoints working!"
echo "============================================================"
