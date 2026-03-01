# API Reference — Nos limites

## Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3001` |
| Production | `https://api.nos-limites.com` |

## Authentication

All endpoints **except** the ones marked 🔓 require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Tokens are obtained via the authentication endpoints below. On token expiry, use `POST /api/auth/refresh` to obtain a new access token without re-authenticating.

## Response Format

All responses return JSON. Errors follow a consistent shape:

```json
{
  "error": "Human-readable error message"
}
```

Success responses vary by endpoint and are documented per route below.

---

## Authentication — `/api/auth`

### `POST /api/auth/magic-link` 🔓

Request a magic link email. The server sends a time-limited sign-in link to the provided address.

**Request body**

```json
{ "email": "user@example.com" }
```

**Responses**

| Status | Meaning |
|--------|---------|
| `200` | Email sent (or queued). Body: `{ "message": "Magic link sent" }` |
| `400` | Missing or invalid email |
| `429` | Rate limited |

> **Development tip**: Set `EMAIL_PROVIDER=console` to print the magic link to the server console instead of sending a real email.

---

### `GET /api/auth/verify?token=xxx` 🔓

Verify a magic link token. On success, creates (or retrieves) the user account and issues session tokens.

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string` | The token embedded in the magic link URL |

**Response `200`**

```json
{
  "accessToken": "eyJ…",
  "refreshToken": "eyJ…",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Alice",
    "avatarUrl": null
  }
}
```

| Status | Meaning |
|--------|---------|
| `200` | Token valid — session created |
| `400` | Token missing |
| `401` | Token expired or already used |

---

### `GET /api/auth/google` 🔓

Initiates the Google OAuth 2.0 flow. The server issues a `302` redirect to Google's consent screen.

> Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to be configured.

---

### `GET /api/auth/google/callback` 🔓

Google OAuth callback. Handled server-side; redirects the browser back to the frontend with tokens embedded as query parameters.

---

### `POST /api/auth/logout`

Invalidates the current session token.

**Response `200`**

```json
{ "message": "Logged out" }
```

---

### `GET /api/auth/session`

Returns the currently authenticated user.

**Response `200`**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Alice",
    "avatarUrl": "https://…"
  }
}
```

| Status | Meaning |
|--------|---------|
| `200` | Session active |
| `401` | No valid session |

---

### `GET /api/auth/providers` 🔓

Lists which authentication providers are enabled on this deployment.

**Response `200`**

```json
{
  "providers": ["magic_link", "google"]
}
```

> Facebook OAuth is present as a stub — it will appear in the list only when `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` are configured.

---

### `POST /api/auth/refresh`

Exchange a valid refresh token for a new access token. Each device holds its own refresh token (see [Devices](#devices--apidevices)).

**Request body**

```json
{ "refreshToken": "eyJ…" }
```

**Response `200`**

```json
{
  "accessToken": "eyJ…",
  "refreshToken": "eyJ…"
}
```

| Status | Meaning |
|--------|---------|
| `200` | New tokens issued |
| `401` | Refresh token invalid, expired, or revoked |

---

## Profile — `/api/profile`

### `GET /api/profile`

Returns the authenticated user's profile.

**Response `200`**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "Alice",
  "avatarUrl": "https://…",
  "authProvider": "magic_link",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### `PUT /api/profile`

Update the user's display name and/or avatar URL.

**Request body** (all fields optional)

```json
{
  "displayName": "Alice B.",
  "avatarUrl": "https://cdn.example.com/avatar.jpg"
}
```

**Response `200`** — Updated profile object (same shape as `GET /api/profile`).

---

### `POST /api/profile/avatar`

Upload a new avatar image. Send as `multipart/form-data` with a `file` field.

**Response `200`**

```json
{ "avatarUrl": "https://…/avatar.jpg" }
```

---

### `DELETE /api/profile`

Permanently delete the account and **all associated data** (cascade). This action is irreversible.

**Response `200`**

```json
{ "message": "Account deleted" }
```

---

### `GET /api/profile/export`

GDPR data export. Returns a JSON document containing all personal data held for the authenticated user.

**Response `200`** — A JSON object with keys: `user`, `relationships`, `limits`, `notifications`.

---

## Relationships — `/api/relationships`

### `POST /api/relationships/invite`

Create a new invitation. Returns a unique token, a shareable URL, and a QR code data URI.

**Response `201`**

```json
{
  "token": "abc123",
  "inviteUrl": "https://noslimites.app/invite/abc123",
  "qrCode": "data:image/png;base64,…"
}
```

---

### `GET /api/relationships/invite/:token` 🔓

Look up a pending invitation by token. Used to display the invitation landing page before the recipient is authenticated.

**Path parameter**: `token` — the invitation token.

**Response `200`**

```json
{
  "inviterName": "Alice",
  "inviterAvatarUrl": null,
  "status": "pending"
}
```

| Status | Meaning |
|--------|---------|
| `200` | Invitation found and still pending |
| `404` | Token not found or already used |

---

### `POST /api/relationships/accept/:token`

Accept a pending invitation. Creates an `accepted` relationship between the inviter and the authenticated user.

**Response `200`**

```json
{
  "relationshipId": "uuid",
  "message": "Relationship accepted"
}
```

| Status | Meaning |
|--------|---------|
| `200` | Accepted |
| `400` | Already accepted / user is the inviter |
| `404` | Token not found |

---

### `POST /api/relationships/decline/:token`

Decline a pending invitation. Sets status to `declined`.

**Response `200`**

```json
{ "message": "Invitation declined" }
```

---

### `GET /api/relationships`

List all active relationships for the authenticated user.

**Response `200`**

```json
[
  {
    "id": "uuid",
    "partner": {
      "id": "uuid",
      "displayName": "Bob",
      "avatarUrl": null
    },
    "status": "accepted",
    "commonLimitsCount": 12,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### `DELETE /api/relationships/:id`

Delete a relationship. Removes all associated `user_limits` records for both users. Both parties receive a notification.

**Response `200`**

```json
{ "message": "Relationship deleted" }
```

---

### `POST /api/relationships/:id/block`

Block the other user in this relationship. Sets the relationship status to `blocked`; the blocked user cannot send new invitations to the blocker.

**Response `200`**

```json
{ "message": "User blocked" }
```

---

## Limits — `/api/limits` and `/api/relationships/:id/limits`

### `GET /api/limits/categories` 🔓

Returns the full category tree: categories → subcategories → individual limits. This is the static content used to render the limits checklist.

**Response `200`**

```json
[
  {
    "id": "cat-1",
    "name": "Contact professionnel",
    "icon": "🤝",
    "imageUrl": "…",
    "sortOrder": 1,
    "subcategories": [
      {
        "id": "sub-1",
        "name": "Communication verbale",
        "sortOrder": 1,
        "limits": [
          {
            "id": "lim-1",
            "name": "Recevoir des compliments sur le travail",
            "description": null,
            "imageUrl": null,
            "sortOrder": 1
          }
        ]
      }
    ]
  }
]
```

---

### `GET /api/relationships/:id/limits`

Get the authenticated user's checked limits for a specific relationship.

**Response `200`**

```json
[
  {
    "limitId": "lim-1",
    "isAccepted": true,
    "note": "Only in professional settings"
  }
]
```

---

### `PUT /api/relationships/:id/limits`

Bulk-update the user's checked limits for a relationship. Sends the full desired state; the server performs an upsert.

**Request body**

```json
[
  { "limitId": "lim-1", "isAccepted": true },
  { "limitId": "lim-2", "isAccepted": false }
]
```

**Response `200`**

```json
{ "message": "Limits updated", "commonLimitsCount": 7 }
```

---

### `PUT /api/relationships/:id/limits/:limitId/note`

Add or update a personal note on a specific limit within a relationship.

**Request body**

```json
{ "note": "Only in professional contexts" }
```

**Response `200`**

```json
{ "message": "Note updated" }
```

---

### `DELETE /api/relationships/:id/limits/:limitId/note`

Delete the note for a specific limit within a relationship.

**Response `200`**

```json
{ "message": "Note deleted" }
```

---

### `GET /api/relationships/:id/common-limits`

Returns only the **matched** (common) limits — those checked `true` by **both** users in the relationship. Notes from both users are included.

**Response `200`**

```json
[
  {
    "limitId": "lim-1",
    "limitName": "Recevoir des compliments sur le travail",
    "categoryName": "Contact professionnel",
    "subcategoryName": "Communication verbale",
    "myNote": "Only professional",
    "partnerNote": null
  }
]
```

> **Privacy guarantee**: This endpoint enforces the core privacy model — it never exposes which limits one user has checked unless the partner has checked the same limit.

---

## Notifications — `/api/notifications`

### `GET /api/notifications`

List all notifications for the authenticated user, newest first.

**Response `200`**

```json
[
  {
    "id": "uuid",
    "type": "new_common_limit",
    "title": "Nouvelle limite en commun !",
    "message": "Vous et Bob avez une nouvelle limite en commun.",
    "isRead": false,
    "relatedRelationshipId": "uuid",
    "createdAt": "2024-06-01T10:00:00.000Z"
  }
]
```

**Notification types**

| Type | Trigger |
|------|---------|
| `relation_request` | Someone accepted your invitation |
| `relation_accepted` | Your invitation was accepted |
| `new_common_limit` | A new mutual limit match was found |
| `limit_removed` | A previously matched limit no longer matches |
| `relation_deleted` | A relationship was deleted by the other party |

---

### `PUT /api/notifications/:id/read`

Mark a single notification as read.

**Response `200`**

```json
{ "message": "Notification marked as read" }
```

---

### `PUT /api/notifications/read-all`

Mark all unread notifications as read.

**Response `200`**

```json
{ "message": "All notifications marked as read" }
```

---

### `GET /api/notifications/stream`

Opens a persistent **Server-Sent Events** (SSE) stream. The connection stays open; the server pushes events as they occur.

**Response headers**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event format**

```
data: {"type":"new_common_limit","title":"…","message":"…","id":"uuid"}\n\n
```

The client should reconnect automatically on disconnect (standard SSE behaviour via `EventSource`).

---

## Devices — `/api/devices`

### `GET /api/devices`

List all registered device sessions for the authenticated user.

**Response `200`**

```json
[
  {
    "id": "uuid",
    "deviceName": "Chrome on macOS",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastSeen": "2024-06-01T10:00:00.000Z",
    "expiresAt": "2024-07-01T10:00:00.000Z",
    "revoked": false
  }
]
```

---

### `DELETE /api/devices/:id`

Revoke (invalidate) a specific device session. The associated refresh token is permanently invalidated.

**Response `200`**

```json
{ "message": "Device session revoked" }
```

---

## System

### `GET /api/health` 🔓

Health check endpoint. Returns server status and database connectivity.

**Response `200`**

```json
{
  "status": "ok",
  "database": "connected",
  "tables": 11,
  "timestamp": "2024-06-01T10:00:00.000Z"
}
```

| Status | Meaning |
|--------|---------|
| `200` | Server and database healthy |
| `503` | Database unreachable |
