#!/bin/bash
set -e

echo "Testing Feature #33: Mark all notifications as read"
echo "===================================================="

API="http://localhost:3001/api"

# Create test user
echo "1. Creating test user..."
EMAIL="notif_test_$(date +%s)@test.com"
MAGIC_LINK_RESPONSE=$(curl -s -X POST "$API/auth/magic-link" \
	-H "Content-Type: application/json" \
	-d "{\"email\":\"$EMAIL\"}")

TOKEN=$(echo "$MAGIC_LINK_RESPONSE" | grep -oP '(?<=token=)[^\"]+' | head -1)
if [ -z "$TOKEN" ]; then
	echo "ERROR: Failed to extract magic link token"
	exit 1
fi

echo "2. Verifying magic link..."
VERIFY_RESPONSE=$(curl -s -X GET "$API/auth/verify?token=$TOKEN")
JWT=$(echo "$VERIFY_RESPONSE" | grep -oP '(?<="token":")[^"]+')

if [ -z "$JWT" ]; then
	echo "ERROR: Failed to get JWT token"
	exit 1
fi

echo "3. Setting up profile..."
curl -s -X PUT "$API/profile" \
	-H "Authorization: Bearer $JWT" \
	-H "Content-Type: application/json" \
	-d "{\"displayName\":\"Test Notif User\"}" > /dev/null

# Get user ID
USER_ID=$(echo "$VERIFY_RESPONSE" | grep -oP '(?<="userId":")[^"]+')

# Insert test notifications using individual INSERT statements
echo "4. Creating 5 test notifications..."
sqlite3 server/data/noslimites.db "INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at) VALUES ('notif-1-$(date +%s)', '$USER_ID', 'relation_request', 'Nouvelle demande', 'User 1 vous a envoyé une invitation', 0, datetime('now', '-5 minutes'));"
sqlite3 server/data/noslimites.db "INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at) VALUES ('notif-2-$(date +%s)', '$USER_ID', 'relation_accepted', 'Invitation acceptée', 'User 2 a accepté votre invitation', 0, datetime('now', '-4 minutes'));"
sqlite3 server/data/noslimites.db "INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at) VALUES ('notif-3-$(date +%s)', '$USER_ID', 'new_common_limit', 'Nouvelle limite commune', 'Une nouvelle limite commune a été découverte', 0, datetime('now', '-3 minutes'));"
sqlite3 server/data/noslimites.db "INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at) VALUES ('notif-4-$(date +%s)', '$USER_ID', 'limit_removed', 'Limite retirée', 'Une limite commune a été retirée', 0, datetime('now', '-2 minutes'));"
sqlite3 server/data/noslimites.db "INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at) VALUES ('notif-5-$(date +%s)', '$USER_ID', 'relation_deleted', 'Relation supprimée', 'Une relation a été supprimée', 0, datetime('now', '-1 minutes'));"

echo "5. Fetching notifications..."
NOTIFS=$(curl -s -X GET "$API/notifications" \
	-H "Authorization: Bearer $JWT")

NOTIF_COUNT=$(echo "$NOTIFS" | grep -oP '(?<="count":)\d+')
echo "   Found $NOTIF_COUNT notifications"

if [ "$NOTIF_COUNT" != "5" ]; then
	echo "ERROR: Expected 5 notifications, got $NOTIF_COUNT"
	exit 1
fi

# Check unread count
UNREAD_COUNT=$(echo "$NOTIFS" | grep -o '"isRead":false' | wc -l)
echo "   Unread count: $UNREAD_COUNT"

if [ "$UNREAD_COUNT" != "5" ]; then
	echo "ERROR: Expected 5 unread notifications, got $UNREAD_COUNT"
	exit 1
fi

echo "6. Marking all notifications as read..."
MARK_ALL_RESPONSE=$(curl -s -X PUT "$API/notifications/read-all" \
	-H "Authorization: Bearer $JWT")

if ! echo "$MARK_ALL_RESPONSE" | grep -q '"success":true'; then
	echo "ERROR: Failed to mark all as read"
	echo "$MARK_ALL_RESPONSE"
	exit 1
fi

echo "7. Verifying all notifications are now read..."
NOTIFS_AFTER=$(curl -s -X GET "$API/notifications" \
	-H "Authorization: Bearer $JWT")

UNREAD_AFTER=$(echo "$NOTIFS_AFTER" | grep -o '"isRead":false' | wc -l)
echo "   Unread count after: $UNREAD_AFTER"

if [ "$UNREAD_AFTER" != "0" ]; then
	echo "ERROR: Expected 0 unread notifications, got $UNREAD_AFTER"
	exit 1
fi

echo "8. Cleanup: Deleting test user..."
curl -s -X DELETE "$API/profile" \
	-H "Authorization: Bearer $JWT" > /dev/null

echo ""
echo "✅ Feature #33 test passed!"
echo "   - Created 5 unread notifications"
echo "   - Marked all as read via PUT /api/notifications/read-all"
echo "   - Verified all notifications are now read (isRead: true)"
