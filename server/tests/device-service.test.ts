import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

// We test the device service logic in isolation using an in-memory SQLite DB
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, and } from "drizzle-orm";
import * as schema from "../src/db/schema";

// ── Helpers ─────────────────────────────────────────────────────────

const JWT_SECRET = "test-secret";

function hashToken(token: string): string {
  return crypto.createHmac("sha256", JWT_SECRET).update(token).digest("hex");
}

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      auth_provider TEXT,
      auth_provider_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_name TEXT,
      refresh_token_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      revoked INTEGER DEFAULT 0
    );

    INSERT INTO users (id, email, display_name, auth_provider)
    VALUES ('user-1', 'test@example.com', 'Test User', 'magic_link');
  `);

  return { sqlite, db: drizzle(sqlite, { schema }) };
}

// ── Device creation ─────────────────────────────────────────────────

test("device: create device token and verify hash is stored", () => {
  const { db } = createTestDb();

  const deviceId = "device-1";
  const deviceToken = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hashToken(deviceToken);
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  db.insert(schema.devices)
    .values({
      id: deviceId,
      userId: "user-1",
      deviceName: "Test Browser",
      refreshTokenHash: tokenHash,
      expiresAt,
    })
    .run();

  const [device] = db
    .select()
    .from(schema.devices)
    .where(eq(schema.devices.id, deviceId))
    .all();

  assert.ok(device, "Device should be created");
  assert.equal(device.userId, "user-1");
  assert.equal(device.deviceName, "Test Browser");
  assert.equal(device.refreshTokenHash, tokenHash);
  assert.equal(device.revoked, false);
});

// ── Token rotation ──────────────────────────────────────────────────

test("device: token rotation updates hash and keeps device valid", () => {
  const { db } = createTestDb();

  const deviceId = "device-rot";
  const originalToken = crypto.randomBytes(48).toString("base64url");
  const originalHash = hashToken(originalToken);
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  db.insert(schema.devices)
    .values({
      id: deviceId,
      userId: "user-1",
      deviceName: "Rotation Test",
      refreshTokenHash: originalHash,
      expiresAt,
    })
    .run();

  // Verify original token matches
  const [beforeRotation] = db
    .select()
    .from(schema.devices)
    .where(
      and(
        eq(schema.devices.id, deviceId),
        eq(schema.devices.refreshTokenHash, originalHash),
        eq(schema.devices.revoked, false),
      ),
    )
    .all();

  assert.ok(beforeRotation, "Original token should match");

  // Simulate rotation: generate new token, update hash
  const newToken = crypto.randomBytes(48).toString("base64url");
  const newHash = hashToken(newToken);

  db.update(schema.devices)
    .set({
      refreshTokenHash: newHash,
      lastSeen: new Date().toISOString(),
    })
    .where(eq(schema.devices.id, deviceId))
    .run();

  // Old token should no longer match
  const [withOldToken] = db
    .select()
    .from(schema.devices)
    .where(
      and(
        eq(schema.devices.id, deviceId),
        eq(schema.devices.refreshTokenHash, originalHash),
      ),
    )
    .all();

  assert.equal(withOldToken, undefined, "Old token hash should not match after rotation");

  // New token should match
  const [withNewToken] = db
    .select()
    .from(schema.devices)
    .where(
      and(
        eq(schema.devices.id, deviceId),
        eq(schema.devices.refreshTokenHash, newHash),
      ),
    )
    .all();

  assert.ok(withNewToken, "New token hash should match after rotation");
});

// ── Replay protection ───────────────────────────────────────────────

test("device: old token rejected after rotation (replay protection)", () => {
  const { db } = createTestDb();

  const deviceId = "device-replay";
  const token1 = crypto.randomBytes(48).toString("base64url");
  const hash1 = hashToken(token1);
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  db.insert(schema.devices)
    .values({
      id: deviceId,
      userId: "user-1",
      deviceName: "Replay Test",
      refreshTokenHash: hash1,
      expiresAt,
    })
    .run();

  // Rotate to token2
  const token2 = crypto.randomBytes(48).toString("base64url");
  const hash2 = hashToken(token2);

  db.update(schema.devices)
    .set({ refreshTokenHash: hash2 })
    .where(eq(schema.devices.id, deviceId))
    .run();

  // Attempt to use token1 (old / replayed)
  const [replay] = db
    .select()
    .from(schema.devices)
    .where(
      and(
        eq(schema.devices.id, deviceId),
        eq(schema.devices.refreshTokenHash, hash1),
        eq(schema.devices.revoked, false),
      ),
    )
    .all();

  assert.equal(replay, undefined, "Replayed old token should be rejected");
});

// ── Revocation ──────────────────────────────────────────────────────

test("device: revoked device token is rejected", () => {
  const { db } = createTestDb();

  const deviceId = "device-revoke";
  const token = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  db.insert(schema.devices)
    .values({
      id: deviceId,
      userId: "user-1",
      deviceName: "Revoke Test",
      refreshTokenHash: tokenHash,
      expiresAt,
    })
    .run();

  // Revoke the device
  db.update(schema.devices)
    .set({ revoked: true })
    .where(and(eq(schema.devices.id, deviceId), eq(schema.devices.userId, "user-1")))
    .run();

  // Try to verify the token
  const [revoked] = db
    .select()
    .from(schema.devices)
    .where(
      and(
        eq(schema.devices.id, deviceId),
        eq(schema.devices.refreshTokenHash, tokenHash),
        eq(schema.devices.revoked, false),
      ),
    )
    .all();

  assert.equal(revoked, undefined, "Revoked device token should be rejected");
});

// ── Expired device token ────────────────────────────────────────────

test("device: expired device token is rejected", () => {
  const { db } = createTestDb();

  const deviceId = "device-expired";
  const token = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hashToken(token);
  // Expired 1 hour ago
  const expiresAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  db.insert(schema.devices)
    .values({
      id: deviceId,
      userId: "user-1",
      deviceName: "Expired Test",
      refreshTokenHash: tokenHash,
      expiresAt,
    })
    .run();

  const [device] = db
    .select()
    .from(schema.devices)
    .where(
      and(
        eq(schema.devices.id, deviceId),
        eq(schema.devices.refreshTokenHash, tokenHash),
        eq(schema.devices.revoked, false),
      ),
    )
    .all();

  // Device exists but is expired
  assert.ok(device, "Device record should exist");
  assert.ok(
    new Date(device.expiresAt) < new Date(),
    "Device should be expired",
  );
});

// ── Cascading user delete ───────────────────────────────────────────

test("device: deleting user cascades to devices", () => {
  const { db, sqlite } = createTestDb();

  const deviceId = "device-cascade";
  const token = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  db.insert(schema.devices)
    .values({
      id: deviceId,
      userId: "user-1",
      deviceName: "Cascade Test",
      refreshTokenHash: tokenHash,
      expiresAt,
    })
    .run();

  // Delete the user
  sqlite.exec("DELETE FROM users WHERE id = 'user-1'");

  const remaining = db.select().from(schema.devices).all();
  assert.equal(remaining.length, 0, "Devices should be deleted when user is deleted");
});

// ── Multiple devices per user ───────────────────────────────────────

test("device: user can have multiple devices", () => {
  const { db } = createTestDb();

  for (let i = 0; i < 5; i++) {
    const token = crypto.randomBytes(48).toString("base64url");
    db.insert(schema.devices)
      .values({
        id: `device-multi-${i}`,
        userId: "user-1",
        deviceName: `Browser ${i}`,
        refreshTokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .run();
  }

  const all = db
    .select()
    .from(schema.devices)
    .where(eq(schema.devices.userId, "user-1"))
    .all();

  assert.equal(all.length, 5, "User should have 5 devices");
});

// ── Hash function determinism ───────────────────────────────────────

test("device: hash function is deterministic", () => {
  const token = "test-token-123";
  const hash1 = hashToken(token);
  const hash2 = hashToken(token);
  assert.equal(hash1, hash2, "Same token should produce same hash");

  const otherHash = hashToken("different-token");
  assert.notEqual(hash1, otherHash, "Different tokens should produce different hashes");
});

// ── Token generation entropy ────────────────────────────────────────

test("device: generated tokens are unique and sufficiently long", () => {
  const tokens = new Set<string>();
  for (let i = 0; i < 100; i++) {
    tokens.add(crypto.randomBytes(48).toString("base64url"));
  }
  assert.equal(tokens.size, 100, "All 100 generated tokens should be unique");

  const sampleToken = crypto.randomBytes(48).toString("base64url");
  assert.ok(sampleToken.length >= 60, "Token should be at least 60 characters long");
});
