#!/bin/bash
# API Test for Feature #31: Notification when common limit is removed
# This tests the actual PUT /api/relationships/:id/limits endpoint

set -e

API_URL="http://localhost:3001/api"
echo "🧪 Testing Feature #31 via API: Notification when common limit is removed"
echo ""

# Helper function to make authenticated requests
auth_request() {
  local method=$1
  local endpoint=$2
  local token=$3
  local data=$4

  if [ -n "$data" ]; then
    curl -s -X "$method" "$API_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -d "$data"
  else
    curl -s -X "$method" "$API_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token"
  fi
}

# Step 1: Create User A
echo "📝 Step 1: Creating User A..."
USER_A_EMAIL="test_f31_api_a_$(date +%s)@example.com"
RESPONSE=$(curl -s -X POST "$API_URL/auth/magic-link" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER_A_EMAIL\"}")
echo "$RESPONSE" | grep -q "success" || (echo "❌ Failed to request magic link for User A" && exit 1)

# Extract token from backend logs (in dev mode, tokens are logged)
sleep 1
TOKEN_A=$(grep -a "Magic link token:" server/logs/* 2>/dev/null | tail -1 | awk '{print $NF}' || echo "")
if [ -z "$TOKEN_A" ]; then
  echo "⚠️  Could not extract token from logs, using mock token for testing"
  TOKEN_A="mock_token_a"
fi

# Verify magic link and get JWT
VERIFY_A=$(curl -s -X GET "$API_URL/auth/verify?token=$TOKEN_A")
JWT_A=$(echo "$VERIFY_A" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JWT_A" ]; then
  echo "❌ Failed to get JWT for User A"
  exit 1
fi

# Set display name
auth_request PUT "/profile" "$JWT_A" '{"displayName": "User A F31 API"}'
echo "✅ Created User A: $USER_A_EMAIL"

# Step 2: Create User B
echo ""
echo "📝 Step 2: Creating User B..."
USER_B_EMAIL="test_f31_api_b_$(date +%s)@example.com"
RESPONSE=$(curl -s -X POST "$API_URL/auth/magic-link" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER_B_EMAIL\"}")

sleep 1
TOKEN_B=$(grep -a "Magic link token:" server/logs/* 2>/dev/null | tail -1 | awk '{print $NF}' || echo "")
if [ -z "$TOKEN_B" ]; then
  TOKEN_B="mock_token_b"
fi

VERIFY_B=$(curl -s -X GET "$API_URL/auth/verify?token=$TOKEN_B")
JWT_B=$(echo "$VERIFY_B" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JWT_B" ]; then
  echo "❌ Failed to get JWT for User B"
  exit 1
fi

auth_request PUT "/profile" "$JWT_B" '{"displayName": "User B F31 API"}'
echo "✅ Created User B: $USER_B_EMAIL"

# Step 3: User A creates invitation
echo ""
echo "📝 Step 3: User A creates invitation..."
INVITE_RESPONSE=$(auth_request POST "/relationships/invite" "$JWT_A")
INVITE_TOKEN=$(echo "$INVITE_RESPONSE" | grep -o '"invitationToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$INVITE_TOKEN" ]; then
  echo "❌ Failed to create invitation"
  echo "$INVITE_RESPONSE"
  exit 1
fi

echo "✅ Invitation created: $INVITE_TOKEN"

# Step 4: User B accepts invitation
echo ""
echo "📝 Step 4: User B accepts invitation..."
ACCEPT_RESPONSE=$(auth_request POST "/relationships/accept/$INVITE_TOKEN" "$JWT_B")
REL_ID=$(echo "$ACCEPT_RESPONSE" | grep -o '"relationshipId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$REL_ID" ]; then
  echo "❌ Failed to accept invitation"
  echo "$ACCEPT_RESPONSE"
  exit 1
fi

echo "✅ Relationship accepted: $REL_ID"

# Step 5: Get a limit to test with
echo ""
echo "📝 Step 5: Getting test limits..."
LIMITS_RESPONSE=$(curl -s "$API_URL/limits/categories")
LIMIT_ID=$(echo "$LIMITS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$LIMIT_ID" ]; then
  echo "❌ Failed to get test limit"
  exit 1
fi

echo "✅ Using limit ID: $LIMIT_ID"

# Step 6: Both users check the limit (creating a common limit)
echo ""
echo "📝 Step 6: Both users check the limit..."
USER_A_UPDATE=$(auth_request PUT "/relationships/$REL_ID/limits" "$JWT_A" \
  "{\"limits\": [{\"limitId\": \"$LIMIT_ID\", \"isAccepted\": true}]}")

echo "$USER_A_UPDATE" | grep -q "success" || (echo "❌ User A failed to update limits" && exit 1)
echo "✅ User A checked the limit"

sleep 1

USER_B_UPDATE=$(auth_request PUT "/relationships/$REL_ID/limits" "$JWT_B" \
  "{\"limits\": [{\"limitId\": \"$LIMIT_ID\", \"isAccepted\": true}]}")

echo "$USER_B_UPDATE" | grep -q "success" || (echo "❌ User B failed to update limits" && exit 1)
echo "✅ User B checked the limit (now it's common)"

# Step 7: Verify it's a common limit
echo ""
echo "📝 Step 7: Verifying common limit exists..."
COMMON_BEFORE=$(auth_request GET "/relationships/$REL_ID/common-limits" "$JWT_A")
COMMON_COUNT_BEFORE=$(echo "$COMMON_BEFORE" | grep -o '"count":[0-9]*' | cut -d':' -f2)

if [ "$COMMON_COUNT_BEFORE" != "1" ]; then
  echo "❌ Expected 1 common limit, found: $COMMON_COUNT_BEFORE"
  exit 1
fi

echo "✅ Verified 1 common limit exists"

# Step 8: User A unchecks the limit
echo ""
echo "📝 Step 8: User A unchecks the limit..."
USER_A_UNCHECK=$(auth_request PUT "/relationships/$REL_ID/limits" "$JWT_A" \
  "{\"limits\": [{\"limitId\": \"$LIMIT_ID\", \"isAccepted\": false}]}")

echo "$USER_A_UNCHECK" | grep -q "success" || (echo "❌ User A failed to uncheck limit" && exit 1)
echo "✅ User A unchecked the limit"

# Step 9: Verify notification was created for User B
echo ""
echo "📝 Step 9: Checking for notification for User B..."
sleep 1

NOTIFS_B=$(auth_request GET "/notifications" "$JWT_B")
echo "$NOTIFS_B" | grep -q "limit_removed" || (echo "❌ No 'limit_removed' notification found for User B" && echo "$NOTIFS_B" && exit 1)

echo "✅ Notification 'limit_removed' created for User B!"

# Step 10: Verify the limit is no longer common
echo ""
echo "📝 Step 10: Verifying limit is no longer common..."
COMMON_AFTER=$(auth_request GET "/relationships/$REL_ID/common-limits" "$JWT_A")
COMMON_COUNT_AFTER=$(echo "$COMMON_AFTER" | grep -o '"count":[0-9]*' | cut -d':' -f2)

if [ "$COMMON_COUNT_AFTER" != "0" ]; then
  echo "❌ Expected 0 common limits after unchecking, found: $COMMON_COUNT_AFTER"
  exit 1
fi

echo "✅ Verified 0 common limits after unchecking"

echo ""
echo "✅ ✅ ✅ ALL API TESTS PASSED! Feature #31 works end-to-end! ✅ ✅ ✅"
echo ""
echo "Summary:"
echo "- User A unchecked a previously common limit via PUT /api/relationships/:id/limits"
echo "- User B received a notification via GET /api/notifications"
echo "- Notification type is 'limit_removed'"
echo "- Common limits count decreased from 1 to 0"
